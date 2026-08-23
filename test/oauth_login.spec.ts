import { afterEach, describe, expect, it, vi } from "vitest";
import { createOAuthLoginApp, OAUTH_CALLBACK_URI } from "../src/oauth_login";
import type { Env } from "../src/types";

function createKv(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial));
	return {
		values,
		get: vi.fn(async (key: string, type?: "json") => {
			const value = values.get(key);
			if (value === undefined) return null;
			return type === "json" ? JSON.parse(value) : value;
		}),
		put: vi.fn(async (key: string, value: string) => void values.set(key, value)),
		delete: vi.fn(async (key: string) => void values.delete(key))
	};
}

function env(kv: ReturnType<typeof createKv>) {
	return {
		KV: kv,
		GATEWAY_BEARER_TOKEN: "gateway-secret",
		CHATGPT_LOCAL_CLIENT_ID: "client-id",
		OPENAI_API_KEY: "unused",
		CHATGPT_RESPONSES_URL: "unused"
	} as unknown as Env;
}

function coordinator() {
		const records = new Map<string, { verifier: string; createdAt: number; expiresAt: number }>();
	return {
		idFromName: vi.fn((name: string) => name),
		get: vi.fn((id: string) => ({
			fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				const body = (await new Request(input, init).json()) as { operation: "create" | "claim"; verifier?: string; createdAt?: number };
				if (body.operation === "create") {
					records.set(id, { verifier: body.verifier!, createdAt: body.createdAt!, expiresAt: body.createdAt! + 600_000 });
					return new Response(null, { status: 204 });
				}
				const record = records.get(id);
				records.delete(id);
				return record ? Response.json(record) : new Response(null, { status: 404 });
			})
		})),
		records
	};
}

const auth = "Bearer gateway-secret";

afterEach(() => vi.restoreAllMocks());

describe("OAuth login routes", () => {
	it("rejects login start without the gateway bearer token", async () => {
		const app = createOAuthLoginApp({ now: () => 1_000 });
		const response = await app.request("/oauth/login/url", {}, env(createKv()));
		expect(response.status).toBe(401);
	});

	it("rejects callback paste without the gateway bearer token", async () => {
		const app = createOAuthLoginApp();
		const response = await app.request("/oauth/callback", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ callback_url: OAUTH_CALLBACK_URI })
		}, env(createKv()));
		expect(response.status).toBe(401);
	});

	it("rejects malformed callback URLs without making an exchange", async () => {
		const fetchMock = vi.fn();
		const app = createOAuthLoginApp({ fetch: fetchMock });
		const response = await app.request("/oauth/callback", {
			method: "POST",
			headers: { Authorization: auth, "Content-Type": "application/json" },
			body: JSON.stringify({ callback_url: "not a url" })
		}, env(createKv()));
		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("creates a PKCE authorization URL and stores expiring state", async () => {
		const kv = createKv();
		const oauth = coordinator();
		const app = createOAuthLoginApp({ now: () => 10_000, random: () => new Uint8Array(32).fill(7) });
		const response = await app.request("/oauth/login/url", { headers: { Authorization: auth } }, { ...env(kv), OAUTH_LOGIN_COORDINATOR: oauth } as never);
		const body = await response.json<{ authorization_url: string }>();
		const url = new URL(body.authorization_url);
		expect(response.status).toBe(200);
		expect(url.searchParams.get("redirect_uri")).toBe(OAUTH_CALLBACK_URI);
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(oauth.records.size).toBe(1);
		expect(kv.put).not.toHaveBeenCalled();
	});

	it("rejects state mismatch and replay, and persists a successful exchange", async () => {
		const kv = createKv();
		const oauth = coordinator();
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "access", refresh_token: "refresh", id_token: "id", expires_in: 3600 })));
		const app = createOAuthLoginApp({ fetch: fetchMock, now: () => 20_000, random: () => new Uint8Array(32).fill(8) });
		const runtimeEnv = { ...env(kv), OAUTH_LOGIN_COORDINATOR: oauth } as never;
		const login = await app.request("/oauth/login/url", { headers: { Authorization: auth } }, runtimeEnv);
		const loginBody = await login.json<{ authorization_url: string }>();
		const state = new URL(loginBody.authorization_url).searchParams.get("state")!;
		const bad = await app.request("/oauth/callback", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ callback_url: `${OAUTH_CALLBACK_URI}?code=c&state=wrong` }) }, runtimeEnv);
		expect(bad.status).toBe(400);
		const goodUrl = `${OAUTH_CALLBACK_URI}?code=c&state=${state}`;
		const good = await app.request("/oauth/callback", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ callback_url: goodUrl }) }, runtimeEnv);
		expect(good.status).toBe(200);
		expect(await good.json()).toEqual({ status: "ok" });
		expect(kv.values.get("auth_tokens")).toContain("access");
		const replay = await app.request("/oauth/callback", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ callback_url: goodUrl }) }, runtimeEnv);
		expect(replay.status).toBe(400);
	});

	it.each([
		`${OAUTH_CALLBACK_URI}:80?code=c&state=s`,
		`http://user:pass@localhost:1455/auth/callback?code=c&state=s`,
		`${OAUTH_CALLBACK_URI}?code=c&state=s#fragment`,
		`${OAUTH_CALLBACK_URI}?code=c&state=s&unexpected=x`
	])("rejects callback URL variant %s", async (callbackUrl) => {
		const fetchMock = vi.fn();
		const app = createOAuthLoginApp({ fetch: fetchMock });
		const response = await app.request("/oauth/callback", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ callback_url: callbackUrl }) }, { ...env(createKv()), OAUTH_LOGIN_COORDINATOR: coordinator() } as never);
		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("redeems state only once under concurrent callbacks", async () => {
		const oauth = coordinator();
		const app = createOAuthLoginApp({ fetch: vi.fn(async () => new Response(JSON.stringify({ access_token: "access" }))), random: () => new Uint8Array(32).fill(9) });
		const runtimeEnv = { ...env(createKv()), OAUTH_LOGIN_COORDINATOR: oauth } as never;
		const login = await app.request("/oauth/login/url", { headers: { Authorization: auth } }, runtimeEnv);
		const state = new URL((await login.json<{ authorization_url: string }>()).authorization_url).searchParams.get("state");
		const request = { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ callback_url: `${OAUTH_CALLBACK_URI}?code=c&state=${state}` }) };
		const responses = await Promise.all([app.request("/oauth/callback", request, runtimeEnv), app.request("/oauth/callback", request, runtimeEnv)]);
		expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
	});
});
