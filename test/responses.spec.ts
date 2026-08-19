import { describe, expect, it, vi } from "vitest";
import type { Env } from "../src/types";

const { startUpstreamRequest } = vi.hoisted(() => ({ startUpstreamRequest: vi.fn() }));
vi.mock("../src/upstream", () => ({ startUpstreamRequest }));

import responses from "../src/routes/responses";
import { mapModelId } from "../src/model_mapping";

const env = {
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
					'data: {"type":"response.completed","response":{"id":"resp_123"}}\n\n'
			),
			error: null
		});
		const payload = {
			model: "homelab-codex",
			conversation: "conv-42",
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
			expect.objectContaining({ tools: payload.tools, promptCacheKey: expect.any(String) })
		);
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
	});
});
