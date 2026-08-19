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
