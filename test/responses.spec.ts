import { describe, expect, it, vi } from "vitest";
import type { Env } from "../src/types";

const { startUpstreamRequest } = vi.hoisted(() => ({ startUpstreamRequest: vi.fn() }));
vi.mock("../src/upstream", () => ({ startUpstreamRequest }));

import responses from "../src/routes/responses";
import { mapModelId } from "../src/model_mapping";

const env = {
	GATEWAY_BEARER_TOKEN: "client-key",
	OPENAI_API_KEY: "client-key",
	CHATGPT_LOCAL_CLIENT_ID: "client-id",
	CHATGPT_RESPONSES_URL: "https://example.test/responses",
	MODEL_ID_MAP: '{"homelab-codex":"gpt-5-codex"}'
} as Env;

describe("Responses endpoint", () => {
	it("maps the OS model and preserves Responses input, tools, and data images", async () => {
		startUpstreamRequest.mockResolvedValueOnce({
			response: new Response(
				'data: {"type":"response.created","response":{"id":"resp_123"}}\n\n' +
					'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n' +
					'data: {"type":"response.completed","response":{"id":"resp_123","object":"response","status":"completed","model":"gpt-5-codex","output":[],"output_text":"Hello"}}\n\n'
			),
			error: null
		});
		const payload = {
			model: "homelab-codex",
			conversation_id: "conv-42",
			prompt_cache_key: "cache-42",
			input: [
				{
					type: "message",
					role: "user",
					content: [
						{ type: "input_text", text: "describe this" },
						{ type: "input_image", image_url: "data:image/png;base64,aGVsbG8=" }
					]
				},
				{ type: "function_call", call_id: "call_1", name: "lookup", arguments: '{"id":"abc"}' },
				{ type: "function_call_output", call_id: "call_1", output: "record found" }
			],
			tools: [{ type: "function", name: "lookup", description: "find a record", parameters: { type: "object" } }]
		};

		const response = await responses.fetch(
			new Request("https://gateway.test/v1/responses", {
				method: "POST",
				headers: { Authorization: "Bearer client-key", "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			}),
			env
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			id: "resp_123",
			object: "response",
			model: "gpt-5-codex",
			output_text: "Hello"
		});
		expect(startUpstreamRequest).toHaveBeenCalledWith(
			env,
			"gpt-5-codex",
			payload.input,
			expect.objectContaining({ tools: payload.tools, toolChoice: undefined, promptCacheKey: "cache-42" })
		);
	});

	it("passes the complete parsed request body to upstream construction", async () => {
		startUpstreamRequest.mockResolvedValueOnce({
			response: new Response(
				'data: {"type":"response.completed","response":{"id":"resp","object":"response","status":"completed","output":[]}}\n\n'
			),
			error: null
		});
		const payload = {
			input: "hello",
			previous_response_id: "resp_previous",
			metadata: { trace: "safe" },
			max_output_tokens: 123,
			truncation: "auto",
			include: ["web_search_call.action.sources"],
			store: true,
			service_tier: "priority"
		};

		await responses.fetch(
			new Request("https://gateway.test/v1/responses", {
				method: "POST",
				headers: { Authorization: "Bearer client-key", "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			}),
			env
		);

		expect(startUpstreamRequest).toHaveBeenLastCalledWith(
			env,
			expect.any(String),
			expect.any(Array),
			expect.objectContaining({ responsesPayload: payload })
		);
	});

	it("keeps one explicit conversation identity across a previous-response chain", async () => {
		startUpstreamRequest.mockResolvedValue({
			response: new Response(
				'data: {"type":"response.completed","response":{"id":"resp","object":"response","status":"completed","output":[]}}\n\n'
			),
			error: null
		});
		for (const previous_response_id of ["resp-1", "resp-2"]) {
			await responses.fetch(
				new Request("https://gateway.test/v1/responses", {
					method: "POST",
					headers: { Authorization: "Bearer client-key", "Content-Type": "application/json" },
					body: JSON.stringify({ input: "hello", conversation_id: "conv-stable", previous_response_id })
				}),
				env
			);
		}
		const keys = startUpstreamRequest.mock.calls.slice(-2).map((call) => call[3].promptCacheKey);
		expect(keys[0]).toBe(keys[1]);
	});

	it("uses distinct fallback keys for unrelated requests", async () => {
		startUpstreamRequest.mockResolvedValue({
			response: new Response(
				'data: {"type":"response.completed","response":{"id":"resp","object":"response","status":"completed","output":[]}}\n\n'
			),
			error: null
		});
		for (let index = 0; index < 2; index++) {
			await responses.fetch(
				new Request("https://gateway.test/v1/responses", {
					method: "POST",
					headers: { Authorization: "Bearer client-key", "Content-Type": "application/json" },
					body: JSON.stringify({ input: "hello" })
				}),
				env
			);
		}
		const keys = startUpstreamRequest.mock.calls.slice(-2).map((call) => call[3].promptCacheKey);
		expect(keys[0]).not.toBe(keys[1]);
	});

	it.each(["incomplete", "cancelled", "failed"])("preserves an authoritative %s terminal response", async (status) => {
		const terminal = {
			id: "resp_terminal",
			object: "response",
			status,
			model: "upstream-model",
			output: [{ type: "message", content: [] }],
			usage: { input_tokens: 3 },
			metadata: { trace: "safe" },
			incomplete_details: { reason: "max_output_tokens", nested: { access_token: "nested-secret" } },
			error: { message: "Bearer oauth-secret", code: "token-secret" }
		};
		startUpstreamRequest.mockResolvedValueOnce({
			response: new Response(`data: ${JSON.stringify({ type: `response.${status}`, response: terminal })}`),
			error: null
		});
		const response = await responses.fetch(
			new Request("https://gateway.test/v1/responses", {
				method: "POST",
				headers: { Authorization: "Bearer client-key", "Content-Type": "application/json" },
				body: JSON.stringify({ input: "hello" })
			}),
			env
		);
		const body = (await response.json()) as Record<string, any>;
		expect(body).toMatchObject({
			id: "resp_terminal",
			status,
			output: terminal.output,
			usage: terminal.usage,
			metadata: terminal.metadata
		});
		expect(JSON.stringify(body)).not.toContain("oauth-secret");
		expect(JSON.stringify(body)).not.toContain("token-secret");
		expect(JSON.stringify(body)).not.toContain("nested-secret");
		expect(body.incomplete_details).toEqual({ reason: "max_output_tokens", nested: {} });
	});

	it("rejects deltas without an authoritative terminal response", async () => {
		startUpstreamRequest.mockResolvedValueOnce({
			response: new Response('data: {"type":"response.output_text.delta","delta":"orphan"}'),
			error: null
		});
		const response = await responses.fetch(
			new Request("https://gateway.test/v1/responses", {
				method: "POST",
				headers: { Authorization: "Bearer client-key", "Content-Type": "application/json" },
				body: JSON.stringify({ input: "hello" })
			}),
			env
		);
		expect(response.status).toBe(502);
	});

	it("returns Responses SSE and redacts upstream error details", async () => {
		startUpstreamRequest.mockResolvedValueOnce({
			response: new Response(
				'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n' +
					'data: {"type":"response.failed","response":{"error":{"message":"Bearer oauth-secret"}}}\n\n'
			),
			error: null
		});

		const response = await responses.fetch(
			new Request("https://gateway.test/v1/responses", {
				method: "POST",
				headers: { Authorization: "Bearer client-key", "Content-Type": "application/json" },
				body: JSON.stringify({ model: "unknown-os-model", instructions: "Be concise", input: "hello", stream: true })
			}),
			env
		);

		expect(response.headers.get("Content-Type")).toContain("text/event-stream");
		const body = await response.text();
		expect(body).toContain('"type":"response.output_text.delta"');
		expect(body).toContain('"message":"Upstream request failed"');
		expect(body).not.toContain("oauth-secret");
	});

	it("redacts a credential-bearing upstream error response", async () => {
		startUpstreamRequest.mockResolvedValueOnce({
			response: null,
			error: new Response(JSON.stringify({ error: { message: "Bearer oauth-secret" } }), { status: 401 })
		});

		const response = await responses.fetch(
			new Request("https://gateway.test/v1/responses", {
				method: "POST",
				headers: { Authorization: "Bearer client-key", "Content-Type": "application/json" },
				body: JSON.stringify({ model: "unknown-os-model", instructions: "Be concise", input: "hello" })
			}),
			env
		);

		expect(await response.json()).toEqual({ error: { message: "Upstream request failed" } });
	});
});

describe("mapModelId", () => {
	it("uses configured mappings and a deterministic normalized fallback", () => {
		expect(mapModelId("homelab-codex", env)).toBe("gpt-5-codex");
		expect(mapModelId("gpt-5:latest", env)).toBe("gpt-5");
		expect(mapModelId("gpt-5.6", {} as Env)).toBe("gpt-5.6-sol");
		expect(mapModelId("homelab-codex", {} as Env)).toBe("gpt-5.6-luna");
	});
});
