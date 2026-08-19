import { afterEach, describe, expect, it, vi } from "vitest";
import { getRefreshedAuth, refreshAccessToken } from "../src/auth_kv";
import { AuthStore } from "../src/auth_store";
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
		delete: vi.fn(async (key: string) => {
			values.delete(key);
		}),
		values
	};
}

function createEnv(
	kv: ReturnType<typeof createKv>,
	auth = { tokens: fallbackTokens, last_refresh: new Date().toISOString() }
) {
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
	it("exports a deterministic AuthStore.getFresh boundary", async () => {
		const now = new Date("2026-08-19T00:00:00.000Z").getTime();
		const kv = createKv({
			auth_tokens: JSON.stringify(fallbackTokens),
			auth_last_refresh: new Date(0).toISOString(),
			auth_expires_at: new Date(now + 60 * 60 * 1000).toISOString()
		});
		vi.stubGlobal("fetch", vi.fn());

		await expect(AuthStore.getFresh(createEnv(kv), now)).resolves.toMatchObject({
			accessToken: "fallback-access-token",
			accountId: "fallback-account",
			tokens: fallbackTokens,
			lastRefresh: new Date(0).toISOString(),
			expiresAt: new Date(now + 60 * 60 * 1000).toISOString()
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("uses the supplied time when seeding first-boot credentials", async () => {
		const kv = createKv();
		const now = Date.parse("2026-08-19T03:04:05.000Z");
		const env = createEnv(kv, { tokens: fallbackTokens } as never);

		await AuthStore.getFresh(env, now);

		expect(kv.values.get("auth_last_refresh")).toBe("2026-08-19T03:04:05.000Z");
	});

	it("prefers persisted KV credentials over the deployment fallback", async () => {
		const kv = createKv({
			auth_tokens: JSON.stringify({
				...fallbackTokens,
				access_token: "persisted-access-token",
				account_id: "persisted-account"
			}),
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
		const env = createEnv(kv, {
			tokens: { access_token: "access-only-token", account_id: "access-only-account" }
		} as never);

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

	it("preserves fresh semantics when queued behind a blocked get within an isolate", async () => {
		const now = Date.parse("2026-08-19T03:04:05.000Z");
		const kv = createKv({
			auth_tokens: JSON.stringify(fallbackTokens),
			auth_last_refresh: new Date(0).toISOString(),
			auth_expires_at: new Date(0).toISOString()
		});
		let releaseGet!: () => void;
		const getGate = new Promise<void>((resolve) => (releaseGet = resolve));
		const baseGet = kv.get.getMockImplementation()!;
		let tokenReads = 0;
		kv.get.mockImplementation(async (key: string, type?: "json") => {
			if (key === "auth_tokens" && ++tokenReads === 2) await getGate;
			return baseGet(key, type);
		});
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "fresh-access-token" })));
		vi.stubGlobal("fetch", fetchMock);
		const env = createEnv(kv);

		const weakGet = AuthStore.get(env);
		while (tokenReads < 2) await Promise.resolve();
		const fresh = AuthStore.getFresh(env, now);
		releaseGet();

		await expect(weakGet).resolves.toMatchObject({ accessToken: "fallback-access-token" });
		await expect(fresh).resolves.toMatchObject({ accessToken: "fresh-access-token" });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("reloads rotated credentials before a forced refresh queued behind a weak fresh operation", async () => {
		const now = Date.parse("2026-08-19T03:04:05.000Z");
		const kv = createKv({
			auth_tokens: JSON.stringify(fallbackTokens),
			auth_last_refresh: new Date(0).toISOString(),
			auth_expires_at: new Date(0).toISOString()
		});
		let releaseWeakRefresh!: () => void;
		const weakRefreshGate = new Promise<void>((resolve) => (releaseWeakRefresh = resolve));
		let weakRefreshStarted!: () => void;
		const weakRefreshStart = new Promise<void>((resolve) => (weakRefreshStarted = resolve));
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body)) as { refresh_token: string };
			if (body.refresh_token === "fallback-refresh-token") {
				weakRefreshStarted();
				await weakRefreshGate;
				return new Response(
					JSON.stringify({ access_token: "weak-access-token", refresh_token: "rotated-refresh-token" })
				);
			}
			expect(body.refresh_token).toBe("rotated-refresh-token");
			return new Response(JSON.stringify({ access_token: "forced-access-token", refresh_token: "forced-refresh-token" }));
		});
		vi.stubGlobal("fetch", fetchMock);
		const env = createEnv(kv);

		const weakFresh = AuthStore.getFresh(env, now);
		await weakRefreshStart;
		const forcedRefresh = AuthStore.refresh(env, now + 1);
		releaseWeakRefresh();

		await expect(weakFresh).resolves.toMatchObject({ accessToken: "weak-access-token" });
		await expect(forcedRefresh).resolves.toMatchObject({
			accessToken: "forced-access-token",
			tokens: { refresh_token: "forced-refresh-token" }
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("isolates same-isolate refresh coalescing by account", async () => {
		const firstKv = createKv({
			auth_tokens: JSON.stringify({ ...fallbackTokens, account_id: "account-a", refresh_token: "refresh-a" }),
			auth_last_refresh: new Date(0).toISOString()
		});
		const secondKv = createKv({
			auth_tokens: JSON.stringify({ ...fallbackTokens, account_id: "account-b", refresh_token: "refresh-b" }),
			auth_last_refresh: new Date(0).toISOString()
		});
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body));
			return new Response(JSON.stringify({ access_token: `access-${body.refresh_token}` }));
		});
		vi.stubGlobal("fetch", fetchMock);

		const [first, second] = await Promise.all([
			AuthStore.getFresh(createEnv(firstKv), Date.now()),
			AuthStore.getFresh(createEnv(secondKv), Date.now())
		]);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(first).toMatchObject({ accessToken: "access-refresh-a", accountId: "account-a" });
		expect(second).toMatchObject({ accessToken: "access-refresh-b", accountId: "account-b" });
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
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ id_token: "returned-id-token" })))
		);

		await expect(refreshAccessToken(createEnv(kv))).resolves.toBeNull();
		const logged = errorSpy.mock.calls.flat().join(" ");
		expect(logged).toContain("auth_refresh account=fallback-acc error_class=invalid_response");
		expect(logged).not.toContain("fallback-refresh-token");
		expect(logged).not.toContain("returned-id-token");
	});

	it("removes stale expiry metadata when refresh omits expires_in", async () => {
		const kv = createKv({
			auth_tokens: JSON.stringify(fallbackTokens),
			auth_last_refresh: new Date(0).toISOString(),
			auth_expires_at: new Date(0).toISOString()
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ access_token: "new-token" })))
		);

		await refreshAccessToken(createEnv(kv));

		expect(kv.delete).toHaveBeenCalledWith("auth_expires_at");
		expect(kv.values.has("auth_expires_at")).toBe(false);
	});
});
