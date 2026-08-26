import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthRefreshCoordinator } from "../src/auth_refresh_coordinator";
import type { Env } from "../src/types";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("AuthRefreshCoordinator", () => {
	function createStorage() {
		const values = new Map<string, unknown>();
		return {
			get: vi.fn(async (key: string) => values.get(key)),
			put: vi.fn(async (key: string, value: unknown) => values.set(key, value)),
			values
		};
	}

	it("serializes concurrent refreshes and reuses the result", async () => {
		const values = new Map<string, string>([
			["auth_tokens", JSON.stringify({ access_token: "old", refresh_token: "refresh", account_id: "account-a" })],
			["auth_last_refresh", new Date(0).toISOString()]
		]);
		const kv = {
			get: vi.fn(async (key: string, type?: "json") => {
				const value = values.get(key) ?? null;
				return type === "json" && value ? JSON.parse(value) : value;
			}),
			put: vi.fn(async (key: string, value: string) => values.set(key, value)),
			delete: vi.fn(async (key: string) => values.delete(key))
		};
		const storage = createStorage();
		const state = {
			storage,
			blockConcurrencyWhile: vi.fn(async (operation: () => Promise<unknown>) => operation())
		} as unknown as DurableObjectState;
		const env = { KV: kv, CHATGPT_LOCAL_CLIENT_ID: "client-id" } as unknown as Env;
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "new" })));
		vi.stubGlobal("fetch", fetchMock);
		const coordinator = new AuthRefreshCoordinator(state, env);
		const body = JSON.stringify({
			accountKey: "account:account-a",
			now: Date.parse("2026-08-19T00:00:00.000Z"),
			force: false,
			observed: "ignored-for-non-force"
		});

		const [first, second] = await Promise.all([
			coordinator.fetch(new Request("https://internal/refresh", { method: "POST", body })),
			coordinator.fetch(new Request("https://internal/refresh", { method: "POST", body }))
		]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(await first.json()).toMatchObject({ access_token: "new" });
		expect(await second.json()).toMatchObject({ access_token: "new" });
		expect(state.blockConcurrencyWhile).toHaveBeenCalledTimes(1);
		expect(storage.values.get("credential")).toMatchObject({
			generation: 2,
			auth: { tokens: { access_token: "new" } }
		});
	});

	it("does not expose credential fields from its HTTP response", async () => {
		const storage = createStorage();
		const state = { storage, blockConcurrencyWhile: vi.fn(async (operation: () => Promise<unknown>) => operation()) } as unknown as DurableObjectState;
		const env = { CHATGPT_LOCAL_CLIENT_ID: "client-id", GATEWAY_BEARER_TOKEN: "internal" } as unknown as Env;
		const coordinator = new AuthRefreshCoordinator(state, env);
		const response = await coordinator.fetch(new Request("https://internal/refresh", {
			method: "POST",
			body: JSON.stringify({ operation: "get", now: Date.now(), force: false, source: { tokens: { access_token: "secret", refresh_token: "refresh" }, lastRefresh: new Date().toISOString(), expiresAt: null } })
		}));
		expect(response.status).toBe(403);
		expect(await response.text()).not.toContain("secret");
	});

	it("classifies invalid_grant as reauthorization_required", async () => {
		const storage = createStorage();
		storage.values.set("credential", { generation: 1, fingerprint: "old", auth: { tokens: { access_token: "old", refresh_token: "refresh" }, lastRefresh: new Date(0).toISOString(), expiresAt: null } });
		const state = { storage, blockConcurrencyWhile: vi.fn(async (operation: () => Promise<unknown>) => operation()) } as unknown as DurableObjectState;
		vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })));
		const coordinator = new AuthRefreshCoordinator(state, { CHATGPT_LOCAL_CLIENT_ID: "client-id" } as unknown as Env);
		const response = await coordinator.fetch(new Request("https://internal/refresh", { method: "POST", body: JSON.stringify({ operation: "refresh", now: Date.now(), force: true, source: { tokens: { access_token: "old", refresh_token: "refresh" }, lastRefresh: new Date(0).toISOString(), expiresAt: null } }) }));
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ error: "reauthorization_required" });
	});

	it("queues a forced refresh behind a weak read and returns the refreshed token", async () => {
		const storage = createStorage();
		const oldAuth = {
			tokens: { access_token: "old", refresh_token: "refresh", account_id: "account-a" },
			lastRefresh: new Date().toISOString(),
			expiresAt: null
		};
		storage.values.set("credential", { generation: 1, fingerprint: "old", auth: oldAuth });
		let releaseRead!: () => void;
		const readGate = new Promise<void>((resolve) => (releaseRead = resolve));
		storage.get.mockImplementationOnce(async () => {
			await readGate;
			return storage.values.get("credential");
		});
		const state = {
			storage,
			blockConcurrencyWhile: vi.fn(async (operation: () => Promise<unknown>) => operation())
		} as unknown as DurableObjectState;
		const env = { CHATGPT_LOCAL_CLIENT_ID: "client-id" } as unknown as Env;
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "new" })));
		vi.stubGlobal("fetch", fetchMock);
		const coordinator = new AuthRefreshCoordinator(state, env);

		const weakRead = coordinator.fetch(
			new Request("https://internal/refresh", {
				method: "POST",
				body: JSON.stringify({ operation: "get", now: Date.now(), force: false, source: oldAuth })
			})
		);
		await Promise.resolve();
		const forcedRefresh = coordinator.fetch(
			new Request("https://internal/refresh", {
				method: "POST",
				body: JSON.stringify({ operation: "refresh", now: Date.now(), force: true, source: oldAuth })
			})
		);
		releaseRead();

		await weakRead;
		const response = await forcedRefresh;
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(await response.json()).toMatchObject({ access_token: "new", generation: 2 });
	});

	it("preserves fresh semantics when queued behind a blocked get", async () => {
		const storage = createStorage();
		const now = Date.parse("2026-08-19T03:04:05.000Z");
		const expiredAuth = {
			tokens: { access_token: "old", refresh_token: "refresh", account_id: "account-a" },
			lastRefresh: new Date(0).toISOString(),
			expiresAt: new Date(0).toISOString()
		};
		storage.values.set("credential", { generation: 1, fingerprint: "old", auth: expiredAuth });
		let releaseGet!: () => void;
		const getGate = new Promise<void>((resolve) => (releaseGet = resolve));
		let getStarted!: () => void;
		const getStart = new Promise<void>((resolve) => (getStarted = resolve));
		storage.get.mockImplementationOnce(async () => {
			getStarted();
			await getGate;
			return storage.values.get("credential");
		});
		const state = {
			storage,
			blockConcurrencyWhile: vi.fn(async (operation: () => Promise<unknown>) => operation())
		} as unknown as DurableObjectState;
		const env = { CHATGPT_LOCAL_CLIENT_ID: "client-id" } as unknown as Env;
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "fresh" })));
		vi.stubGlobal("fetch", fetchMock);
		const coordinator = new AuthRefreshCoordinator(state, env);

		const coordinate = (
			coordinator as unknown as {
				coordinate(input: { operation: "get" | "fresh"; now: number; force: boolean; source: typeof expiredAuth }): Promise<{
					auth: typeof expiredAuth;
				}>;
			}
		).coordinate.bind(coordinator);
		const weakGet = coordinate({ operation: "get", now, force: false, source: expiredAuth });
		await getStart;
		while (!(coordinator as unknown as { refreshInFlight: unknown }).refreshInFlight) await Promise.resolve();
		const fresh = coordinate({ operation: "fresh", now, force: false, source: expiredAuth });
		releaseGet();

		await expect(weakGet).resolves.toMatchObject({ auth: { tokens: { access_token: "old" } } });
		await expect(fresh).resolves.toMatchObject({ auth: { tokens: { access_token: "fresh" } } });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("does not commit a refresh result when the durable generation changed", async () => {
		const storage = createStorage();
		const oldAuth = {
			tokens: { access_token: "old", refresh_token: "refresh", account_id: "account-a" },
			lastRefresh: new Date(0).toISOString(),
			expiresAt: new Date(0).toISOString()
		};
		storage.values.set("credential", { generation: 3, fingerprint: "old", auth: oldAuth });
		const state = {
			storage,
			blockConcurrencyWhile: vi.fn(async (operation: () => Promise<unknown>) => operation())
		} as unknown as DurableObjectState;
		const env = { CHATGPT_LOCAL_CLIENT_ID: "client-id" } as unknown as Env;
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				await gate;
				return new Response(JSON.stringify({ access_token: "stale-result" }));
			})
		);
		const coordinator = new AuthRefreshCoordinator(state, env);
		const pending = coordinator.fetch(
			new Request("https://internal/refresh", {
				method: "POST",
				body: JSON.stringify({
					operation: "refresh",
					now: Date.now(),
					force: true,
					observedGeneration: 3,
					source: oldAuth
				})
			})
		);
		await Promise.resolve();
		const newer = { ...oldAuth, tokens: { ...oldAuth.tokens, access_token: "newer" } };
		storage.values.set("credential", { generation: 4, fingerprint: "newer", auth: newer });
		release();

		const response = await pending;
		expect(await response.json()).toMatchObject({ tokens: { access_token: "newer" }, generation: 4 });
		expect(storage.values.get("credential")).toMatchObject({ generation: 4, auth: newer });
	});
});
