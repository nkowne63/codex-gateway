import { Hono } from "hono";
import { getInstructionsForModel } from "../instructions";
import { mapModelId } from "../model_mapping";
import { openaiAuthMiddleware } from "../middleware/openaiAuthMiddleware";
import { buildReasoningParam } from "../reasoning";
import { sseTranslateResponses } from "../sse";
import { Env, InputItem, Tool } from "../types";
import { startUpstreamRequest } from "../upstream";
import { resolvePromptCacheKey } from "../conversation";

const responses = new Hono<{ Bindings: Env }>();

function responseError(message: string, status: number) {
	return new Response(JSON.stringify({ error: { message } }), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}

async function responseJson(upstream: Response, model: string): Promise<Response> {
	const reader = upstream.body?.getReader();
	if (!reader) return responseError("Upstream request failed", 502);

	let terminalResponse: Record<string, unknown> | undefined;
	const decoder = new TextDecoder();
	let buffer = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				buffer += decoder.decode();
				if (buffer) buffer += "\n";
			}
			if (value) buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";
			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				try {
					const event = JSON.parse(line.slice(6));
					if (
						/^response\.(completed|incomplete|cancelled|failed)$/.test(event.type) &&
						event.response &&
						typeof event.response === "object"
					) {
						terminalResponse = event.response;
					}
				} catch {
					// Ignore malformed upstream events; do not reflect them to clients.
				}
			}
			if (done) break;
		}
	} catch {
		return responseError("Upstream request failed", 502);
	} finally {
		reader.releaseLock();
	}

	if (!terminalResponse) return responseError("Upstream request failed", 502);
	const response = sanitizeTerminalResponse(terminalResponse);
	return new Response(JSON.stringify({ ...response, model: response.model || model }), {
		status: upstream.status,
		headers: { "Content-Type": "application/json" }
	});
}

function sanitizeTerminalResponse(response: Record<string, unknown>): Record<string, unknown> {
	const sanitized = { ...response };
	if ("error" in sanitized) sanitized.error = { message: "Upstream request failed" };
	if ("incomplete_details" in sanitized) sanitized.incomplete_details = { reason: "Upstream request failed" };
	return sanitized;
}

responses.post("/v1/responses", openaiAuthMiddleware(), async (c) => {
	let payload: Record<string, unknown>;
	try {
		payload = await c.req.json();
	} catch {
		return responseError("Invalid JSON body", 400);
	}

	const input = payload.input;
	const inputItems: InputItem[] = typeof input === "string" ? [{ type: "message", role: "user", content: input }] : [];
	if (Array.isArray(input)) inputItems.push(...(input as InputItem[]));
	if (!inputItems.length) return responseError("Request must include input", 400);

	const model = mapModelId(payload.model as string | undefined, c.env);
	const instructions =
		typeof payload.instructions === "string" ? payload.instructions : await getInstructionsForModel(model);
	const promptCacheKey = await resolvePromptCacheKey(payload, c.req.raw.headers, instructions);
	const reasoning =
		typeof payload.reasoning === "object" && payload.reasoning !== null
			? (payload.reasoning as { effort?: string; summary?: string })
			: undefined;
	const { response: upstream, error } = await startUpstreamRequest(c.env, model, inputItems, {
		instructions,
		tools: Array.isArray(payload.tools) ? (payload.tools as Tool[]) : [],
		toolChoice: payload.tool_choice as "auto" | "none" | "required" | { type: string; function: { name: string } },
		parallelToolCalls: Boolean(payload.parallel_tool_calls),
		reasoningParam: buildReasoningParam(
			c.env.REASONING_EFFORT || "minimal",
			c.env.REASONING_SUMMARY || "auto",
			reasoning
		),
		promptCacheKey
	});
	if (error) return responseError("Upstream request failed", error.status || 502);
	if (!upstream) return responseError("Upstream request failed", 502);

	if (payload.stream) {
		return new Response(await sseTranslateResponses(upstream), {
			status: upstream.status,
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				...c.res.headers
			}
		});
	}
	return responseJson(upstream, model);
});

export default responses;
