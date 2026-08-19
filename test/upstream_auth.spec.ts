import { afterEach, describe, expect, it, vi } from "vitest";
import { startUpstreamRequest } from "../src/upstream";
import type { Env } from "../src/types";

function createKv() {
	const values = new Map<string, string>([
		[
			"auth_tokens",
			JSON.stringify({ access_token: "stale-token", refresh_token: "kv-refresh-token", account_id: "kv-account" })
		],
		["auth_last_refresh", new Date().toISOString()]
	]);
	return {
		get: vi.fn(async (key: string, type?: "json") => {
			const value = values.get(key) ?? null;
			return type === "json" && value ? JSON.parse(value) : value;
		}),
		put: vi.fn(async (key: string, value: string) => values.set(key, value)),
		delete: vi.fn(async (key: string) => values.delete(key))
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("upstream authentication", () => {
	it("refreshes a KV-only credential after a 401", async () => {
		const env = {
			KV: createKv(),
			OPENAI_API_KEY: "client-key",
			CHATGPT_LOCAL_CLIENT_ID: "client-id",
			CHATGPT_RESPONSES_URL: "https://chatgpt.com/backend-api/codex/responses"
		} as Env;
		let upstreamCalls = 0;
		const fetchMock = vi.fn(async (url: string) => {
			if (url === "https://auth.openai.com/oauth/token")
				return new Response(JSON.stringify({ access_token: "fresh-token" }));
			if (url === env.CHATGPT_RESPONSES_URL) {
				upstreamCalls += 1;
				return upstreamCalls === 1
					? new Response(JSON.stringify({ error: { message: "unauthorized" } }), { status: 401 })
					: new Response("ok", { status: 200 });
			}
			return new Response("instructions");
		});
		vi.stubGlobal("fetch", fetchMock);
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		const result = await startUpstreamRequest(env, "gpt-5", []);

		expect(result.response?.status).toBe(200);
		expect(upstreamCalls).toBe(2);
		const retry = fetchMock.mock.calls.filter(([url]) => url === env.CHATGPT_RESPONSES_URL)[1];
		expect(new Headers(retry[1]?.headers).get("Authorization")).toBe("Bearer fresh-token");
	});

	it("redacts token-bearing values from HTTP and thrown upstream errors", async () => {
		const env = {
			KV: createKv(),
			OPENAI_API_KEY: "client-key",
			CHATGPT_LOCAL_CLIENT_ID: "client-id",
			CHATGPT_RESPONSES_URL: "https://chatgpt.com/backend-api/codex/responses?secret=query-token"
		} as Env;
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ error: { message: "Bearer response-token" } }), {
						status: 500,
						headers: { Authorization: "Bearer response-header-token", "x-safe": "metadata" }
					})
			)
		);

		const result = await startUpstreamRequest(env, "gpt-5", [{ type: "message", role: "user", content: "body-token" }]);
		const logged = errorSpy.mock.calls.flat().join(" ");
		const response = await result.error!.text();

		expect(logged).toContain("status=500");
		expect(logged).toContain("url=chatgpt.com/backend-api/codex/responses");
		for (const secret of [
			"stale-token",
			"kv-account",
			"response-token",
			"response-header-token",
			"query-token",
			"body-token"
		]) {
			expect(logged).not.toContain(secret);
			expect(response).not.toContain(secret);
		}
		expect(response).toContain("Upstream request failed");
	});

	it("redacts an access token from thrown-fetch responses and logs", async () => {
		const env = {
			KV: createKv(),
			OPENAI_API_KEY: "client-key",
			CHATGPT_LOCAL_CLIENT_ID: "client-id",
			CHATGPT_RESPONSES_URL: "https://chatgpt.com/backend-api/codex/responses"
		} as Env;
		const accessToken = "stale-token";
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url === env.CHATGPT_RESPONSES_URL) throw new Error(`socket failed with ${accessToken}`);
				return new Response("instructions");
			})
		);

		const result = await startUpstreamRequest(env, "gpt-5", []);
		const response = await result.error!.text();
		const logged = errorSpy.mock.calls.flat().join(" ");

		expect(response).not.toContain(accessToken);
		expect(logged).not.toContain(accessToken);
		expect(response).toContain("Upstream request failed");
	});
});
