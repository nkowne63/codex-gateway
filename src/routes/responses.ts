import { Hono } from "hono";
import { stablePromptCacheKey } from "../cache_key";
import { getInstructionsForModel } from "../instructions";
import { mapModelId } from "../model_mapping";
import { openaiAuthMiddleware } from "../middleware/openaiAuthMiddleware";
import { buildReasoningParam } from "../reasoning";
import { sseTranslateResponses } from "../sse";
import { Env, InputItem, Tool } from "../types";
import { startUpstreamRequest } from "../upstream";

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

	let id = "resp_gateway";
	let outputText = "";
	const output: unknown[] = [];
	let failed = false;
	const decoder = new TextDecoder();
	let buffer = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";
			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				try {
					const event = JSON.parse(line.slice(6));
					if (typeof event.response?.id === "string") id = event.response.id;
					if (event.type === "response.output_text.delta" && typeof event.delta === "string") outputText += event.delta;
					if (event.type === "response.output_item.done" && event.item) output.push(event.item);
					if (event.type === "response.failed") failed = true;
				} catch {
					// Ignore malformed upstream events; do not reflect them to clients.
				}
			}
		}
	} catch {
		return responseError("Upstream request failed", 502);
	} finally {
		reader.releaseLock();
	}

	if (failed) return responseError("Upstream request failed", 502);
	return new Response(
		JSON.stringify({
			id,
			object: "response",
			created_at: Math.floor(Date.now() / 1000),
			status: "completed",
			model,
			output,
			output_text: outputText
		}),
		{ status: upstream.status, headers: { "Content-Type": "application/json" } }
	);
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
	const instructions = typeof payload.instructions === "string" ? payload.instructions : await getInstructionsForModel(model);
	const conversationId =
		typeof payload.conversation === "string"
			? payload.conversation
			: typeof payload.previous_response_id === "string"
				? payload.previous_response_id
				: undefined;
	const promptCacheKey = await stablePromptCacheKey(conversationId, instructions);
	const reasoning =
		typeof payload.reasoning === "object" && payload.reasoning !== null
			? (payload.reasoning as { effort?: string; summary?: string })
			: undefined;
	const { response: upstream, error } = await startUpstreamRequest(c.env, model, inputItems, {
		instructions,
		tools: Array.isArray(payload.tools) ? (payload.tools as Tool[]) : [],
		toolChoice: payload.tool_choice as "auto" | "none" | { type: string; function: { name: string } },
		parallelToolCalls: Boolean(payload.parallel_tool_calls),
		reasoningParam: buildReasoningParam(c.env.REASONING_EFFORT || "minimal", c.env.REASONING_SUMMARY || "auto", reasoning),
		promptCacheKey
	});
	if (error) return responseError("Upstream request failed", error.status || 502);
	if (!upstream) return responseError("Upstream request failed", 502);

	if (payload.stream) {
		return new Response(await sseTranslateResponses(upstream), {
			status: upstream.status,
			headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", ...c.res.headers }
		});
	}
	return responseJson(upstream, model);
});

export default responses;
