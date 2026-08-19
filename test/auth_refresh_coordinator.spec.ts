import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthRefreshCoordinator } from "../src/auth_refresh_coordinator";
import type { Env } from "../src/types";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("AuthRefreshCoordinator", () => {
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
		const state = {
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
	});
});
