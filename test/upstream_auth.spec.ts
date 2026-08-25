import { afterEach, describe, expect, it, vi } from "vitest";
import { startUpstreamRequest } from "../src/upstream";
import type { Env } from "../src/types";

const env = (extra: Partial<Env> = {}) => ({
	OPENAI_PROVIDER: "openai-api",
	OPENAI_API_KEY: "test-api-key",
	...extra
}) as Env;

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("OpenAI API upstream provider", () => {
	it("fails closed with 503 when the provider key is missing", async () => {
		const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
		const result = await startUpstreamRequest(env({ OPENAI_API_KEY: undefined }), "gpt-5.6", [], { rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello" }) });
		expect(result.response).toBeNull(); expect(result.error?.status).toBe(503);
		expect(await result.error?.text()).not.toContain("test-api-key"); expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sends the public model and Responses body with only API authentication", async () => {
		const upstream = vi.fn(async () => new Response("ok", { status: 200 })); vi.stubGlobal("fetch", upstream);
		const body = { model: "gpt-5.6", input: [{ type: "message", role: "user", content: "hello" }], tools: [{ type: "function", name: "lookup" }], instructions: "be precise", stream: true };
		const result = await startUpstreamRequest(env(), "gpt-5.6", [], { rawResponsesBody: JSON.stringify(body) });
		expect(result.response?.status).toBe(200);
		const [url, init] = upstream.mock.calls.find(([candidate]) => candidate === "https://api.openai.com/v1/responses")!; const headers = new Headers(init?.headers);
		expect(url).toBe("https://api.openai.com/v1/responses"); expect(headers.get("Authorization")).toBe("Bearer test-api-key");
		expect(headers.get("ChatGPT-Account-ID")).toBeNull(); expect(headers.get("originator")).toBeNull(); expect(headers.get("OpenAI-Beta")).toBeNull();
		expect(JSON.parse(String(init?.body))).toEqual(body);
	});

	it("always uses the fixed OpenAI Responses endpoint", async () => {
		const fetchMock = vi.fn(async () => new Response("ok", { status: 200 })); vi.stubGlobal("fetch", fetchMock);
		await startUpstreamRequest(env({ OPENAI_API_URL: "https://attacker.example/steal" } as Partial<Env>), "gpt-5.6", [], { rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello", stream: false }) });
		const apiCall = fetchMock.mock.calls.find(([url]) => url === "https://api.openai.com/v1/responses");
		expect(apiCall?.[0]).toBe("https://api.openai.com/v1/responses");
		expect(new Headers(apiCall?.[1]?.headers).get("Accept")).toBe("application/json");
	});

	it.each([401, 403])("returns a safe error without OAuth refresh for upstream %s", async (status) => {
		const fetchMock = vi.fn(async () => new Response("secret upstream detail", { status })); vi.stubGlobal("fetch", fetchMock);
		const result = await startUpstreamRequest(env({ OPENAI_CODEX_AUTH: "oauth-secret" }), "gpt-5.6", [], { rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello" }) });
		expect(result.error?.status).toBe(status); expect(await result.error?.text()).toBe(JSON.stringify({ error: { message: "Upstream request failed" } })); expect(fetchMock.mock.calls.filter(([url]) => url === "https://api.openai.com/v1/responses")).toHaveLength(1);
	});

	it("preserves non-stream Responses requests and generated stream requests", async () => {
		const fetchMock = vi.fn(async () => new Response("ok", { status: 200 })); vi.stubGlobal("fetch", fetchMock);
		await startUpstreamRequest(env(), "gpt-5.6", [], { rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello", stream: false }) });
		const apiCalls = fetchMock.mock.calls.filter(([url]) => url === "https://api.openai.com/v1/responses");
		expect(JSON.parse(String(apiCalls[0][1]?.body)).stream).toBe(false);
		await startUpstreamRequest(env(), "gpt-5.6", [{ type: "message", role: "user", content: "hello" }]);
		const allApiCalls = fetchMock.mock.calls.filter(([url]) => url === "https://api.openai.com/v1/responses");
		expect(JSON.parse(String(allApiCalls[1][1]?.body))).toMatchObject({ model: "gpt-5.6", stream: true });
	});

	it("never selects a legacy provider even when configured otherwise", async () => {
		const result = await startUpstreamRequest(env({ OPENAI_PROVIDER: "legacy-oauth", OPENAI_CODEX_AUTH: "oauth-secret" } as Partial<Env>), "gpt-5.6", []);
		expect(result.error?.status).toBe(503);
	});

	it("fails closed when the provider is missing", async () => {
		const result = await startUpstreamRequest(env({ OPENAI_PROVIDER: undefined }), "gpt-5.6", []);
		expect(result.response).toBeNull();
		expect(result.error?.status).toBe(503);
	});
});
