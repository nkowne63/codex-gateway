import { afterEach, describe, expect, it, vi } from "vitest";
import { getRefreshedAuth, refreshAccessToken } from "../src/auth_kv";
import type { Env } from "../src/types";

const AUTH_URL = "https://auth.openai.com/oauth/token";
const fallbackTokens = {
	id_token: "fallback-id-token",
	access_token: "fallback-access-token",
	refresh_token: "fallback-refresh-token",
	account_id: "fallback-account"
};

function createKv(initial: Record<string, unknown> = {}) {
	const values = new Map(Object.entries(initial));
	return {
		get: vi.fn(async (key: string, type?: "json") => {
			const value = values.get(key);
			if (value === undefined) return null;
			return type === "json" ? JSON.parse(value as string) : value;
		}),
		put: vi.fn(async (key: string, value: string) => {
			values.set(key, value);
		}),
		values
	};
}

function createEnv(kv: ReturnType<typeof createKv>, auth = { tokens: fallbackTokens, last_refresh: new Date().toISOString() }) {
	return {
		KV: kv,
		OPENAI_API_KEY: "client-key",
		CHATGPT_LOCAL_CLIENT_ID: "client-id",
		CHATGPT_RESPONSES_URL: "https://chatgpt.com/backend-api/codex/responses",
		OPENAI_CODEX_AUTH: JSON.stringify(auth)
	} as Env;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("Codex auth store", () => {
	it("prefers persisted KV credentials over the deployment fallback", async () => {
		const kv = createKv({
			auth_tokens: JSON.stringify({ ...fallbackTokens, access_token: "persisted-access-token", account_id: "persisted-account" }),
			auth_last_refresh: new Date().toISOString()
		});

		await expect(getRefreshedAuth(createEnv(kv))).resolves.toEqual({
			accessToken: "persisted-access-token",
			accountId: "persisted-account"
		});
	});

	it("persists the deployment fallback to KV on first boot", async () => {
		const kv = createKv();

		await getRefreshedAuth(createEnv(kv));

		expect(kv.put).toHaveBeenCalledWith("auth_tokens", JSON.stringify(fallbackTokens));
		expect(kv.put).toHaveBeenCalledWith("auth_last_refresh", expect.any(String));
	});

	it("returns an access-token-only fallback when refresh is unavailable", async () => {
		const kv = createKv();
		const env = createEnv(kv, { tokens: { access_token: "access-only-token", account_id: "access-only-account" } } as never);

		await expect(getRefreshedAuth(env)).resolves.toEqual({
			accessToken: "access-only-token",
			accountId: "access-only-account"
		});
	});

	it("does not refresh a token with a future expiry", async () => {
		const kv = createKv({
			auth_tokens: JSON.stringify(fallbackTokens),
			auth_last_refresh: new Date(0).toISOString(),
			auth_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
		});
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await getRefreshedAuth(createEnv(kv));

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("coalesces concurrent expired-token refreshes within an isolate", async () => {
		const kv = createKv({
			auth_tokens: JSON.stringify(fallbackTokens),
			auth_last_refresh: new Date(0).toISOString(),
			auth_expires_at: new Date(0).toISOString()
		});
		const fetchMock = vi.fn(async (url: string) => {
			expect(url).toBe(AUTH_URL);
			return new Response(JSON.stringify({ access_token: "refreshed-access-token", id_token: "refreshed-id-token" }), {
				status: 200
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		const env = createEnv(kv);
		const [first, second] = await Promise.all([getRefreshedAuth(env), getRefreshedAuth(env)]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(first.accessToken).toBe("refreshed-access-token");
		expect(second.accessToken).toBe("refreshed-access-token");
	});

	it("does not overwrite newer KV credentials after a refresh races", async () => {
		const kv = createKv({
			auth_tokens: JSON.stringify(fallbackTokens),
			auth_last_refresh: new Date(0).toISOString(),
			auth_expires_at: new Date(0).toISOString()
		});
		let releaseRefresh: () => void;
		const refreshGate = new Promise<void>((resolve) => {
			releaseRefresh = resolve;
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				await refreshGate;
				return new Response(JSON.stringify({ access_token: "stale-refresh-result", id_token: "stale-id-token" }));
			})
		);

		const refresh = refreshAccessToken(createEnv(kv));
		await Promise.resolve();
		const newerTokens = { ...fallbackTokens, access_token: "newer-kv-access-token" };
		kv.values.set("auth_tokens", JSON.stringify(newerTokens));
		kv.values.set("auth_last_refresh", new Date().toISOString());
		releaseRefresh!();

		await refresh;
		expect(kv.values.get("auth_tokens")).toBe(JSON.stringify(newerTokens));
	});

	it("rejects malformed refresh responses without logging token values", async () => {
		const kv = createKv();
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id_token: "returned-id-token" }))));

		await expect(refreshAccessToken(createEnv(kv))).resolves.toBeNull();
		expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("fallback-refresh-token");
		expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("returned-id-token");
	});
});
