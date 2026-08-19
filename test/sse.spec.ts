import { describe, expect, it, vi } from "vitest";
import { sseTranslateChat, sseTranslateResponses, sseTranslateText } from "../src/sse";

describe("SSE redaction and framing", () => {
	it("redacts every error-like Responses event and flushes an unterminated final line", async () => {
		const upstream = new Response(
			'data: {"type":"error","message":"top-level-secret","code":"secret-code","error":{"message":"Bearer first-secret"}}\n\n' +
				'data: {"type":"response.incomplete","response":{"status":"incomplete","incomplete_details":{"reason":"token-secret"},"error":{"message":"oauth-secret"}}}'
		);
		const body = await new Response(await sseTranslateResponses(upstream)).text();
		expect(body).toContain('"type":"error"');
		expect(body).toContain('"type":"response.incomplete"');
		expect(body).toContain("Upstream request failed");
		for (const secret of ["top-level-secret", "first-secret", "secret-code", "token-secret", "oauth-secret"])
			expect(body).not.toContain(secret);
	});

	it("deep-redacts every Responses event while preserving safe protocol data", async () => {
		const event = {
			type: "response.completed",
			response: {
				id: "resp_safe",
				status: "incomplete",
				incomplete_details: { reason: "max_output_tokens" },
				usage: { input_tokens: 4, output_tokens: 8 },
				metadata: {
					trace: "safe",
					nested: {
						access_token: "nested-access-secret",
						refreshToken: "camel-refresh-secret",
						"x-api-key": "hyphen-api-secret",
						note: "Bearer embedded-secret"
					}
				},
				output: [{ type: "message", content: [{ type: "output_text", text: "safe output" }] }],
				diagnostics: { authorization: "Bearer auth-secret", raw_error: "upstream leaked jwt.secret.value" }
			}
		};
		const body = await new Response(
			await sseTranslateResponses(new Response(`data: ${JSON.stringify(event)}\n\n`))
		).text();
		const sanitized = JSON.parse(body.match(/^data: (.+)$/m)![1]);

		expect(sanitized).toMatchObject({
			type: "response.completed",
			response: {
				id: "resp_safe",
				status: "incomplete",
				incomplete_details: { reason: "max_output_tokens" },
				usage: { input_tokens: 4, output_tokens: 8 },
				metadata: { trace: "safe" },
				output: event.response.output
			}
		});
		expect(sanitized.response.metadata.nested).not.toHaveProperty("refreshToken");
		expect(sanitized.response.metadata.nested).not.toHaveProperty("x-api-key");
		for (const secret of [
			"nested-access-secret",
			"camel-refresh-secret",
			"hyphen-api-secret",
			"embedded-secret",
			"auth-secret",
			"jwt.secret.value"
		])
			expect(body).not.toContain(secret);
	});

	it.each([
		["chat", sseTranslateChat],
		["completion", sseTranslateText]
	] as const)("redacts error events in existing %s streams without raw SSE logs", async (_name, translate) => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const stream = await translate(
			new Response('data: {"type":"response.failed","response":{"error":{"message":"Bearer stream-secret"}}}'),
			"gpt-5",
			1,
			true
		);
		const body = await new Response(stream).text();
		expect(body).toContain("Upstream request failed");
		expect(body).not.toContain("stream-secret");
		expect(log).not.toHaveBeenCalled();
		expect(error.mock.calls.flat().join(" ")).not.toContain("stream-secret");
		log.mockRestore();
		error.mockRestore();
	});
});
