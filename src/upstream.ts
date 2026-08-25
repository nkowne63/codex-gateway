import { normalizeModelName } from "./utils";
import { getInstructionsForModel } from "./instructions";
import { stablePromptCacheKey } from "./cache_key";
import { Env, InputItem, Tool } from "./types"; // Import types
import { AuthStore } from "./auth_store";

type ReasoningParam = {
	effort?: string;
	summary?: string;
};

type ToolChoice = "auto" | "none" | "required" | { type: string; function: { name: string } };

function safeUpstreamLocation(requestUrl: string): string {
	try {
		const url = new URL(requestUrl);
		return `${url.host}${url.pathname}`;
	} catch {
		return "invalid-url";
	}
}

function logUpstreamError(status: number | "fetch-failed", requestUrl: string, metadata: string): void {
	console.error(`Upstream request failed status=${status} url=${safeUpstreamLocation(requestUrl)} ${metadata}`);
}

export async function startUpstreamRequest(
	env: Env, // Pass the environment object
	model: string,
	inputItems: InputItem[],
	options?: {
		instructions?: string;
		tools?: Tool[];
		toolChoice?: ToolChoice;
		parallelToolCalls?: boolean;
		reasoningParam?: ReasoningParam;
		promptCacheKey?: string;
		responsesPayload?: Record<string, unknown>;
		rawResponsesBody?: string;
	}
): Promise<{ response: Response | null; error: Response | null }> {
	const { instructions, tools, toolChoice, parallelToolCalls, reasoningParam } = options || {};
	if (env.OPENAI_PROVIDER !== "openai-api" && env.OPENAI_PROVIDER !== "chatgpt-oauth") {
		return {
			response: null,
			error: new Response(JSON.stringify({ error: { message: "OpenAI API provider is not enabled" } }), { status: 503, headers: { "Content-Type": "application/json" } })
		};
	}
	const isChatGptOAuth = env.OPENAI_PROVIDER === "chatgpt-oauth";
	if (!isChatGptOAuth && !env.OPENAI_API_KEY) {
		return { response: null, error: new Response(JSON.stringify({ error: { message: "OpenAI API provider is not configured" } }), { status: 503, headers: { "Content-Type": "application/json" } }) };
	}

	const include: string[] = [];
	if (reasoningParam?.effort !== "none") {
		include.push("reasoning.encrypted_content");
	}

	const requestUrl = isChatGptOAuth ? "https://chatgpt.com/backend-api/codex/responses" : "https://api.openai.com/v1/responses";

	const sessionId = options?.promptCacheKey || (await stablePromptCacheKey(crypto.randomUUID(), instructions || model));

	const baseInstructions = await getInstructionsForModel(model);

	const responsesPayload = options?.responsesPayload;
	const requestBody =
		options?.rawResponsesBody !== undefined
			? options.rawResponsesBody
			: responsesPayload
				? JSON.stringify({
						...structuredClone(responsesPayload),
						model: normalizeModelName(model, env.DEBUG_MODEL),
						stream: true,
						prompt_cache_key: sessionId,
						instructions: instructions || baseInstructions
					})
				: JSON.stringify({
						model: normalizeModelName(model, env.DEBUG_MODEL),
						instructions: instructions || baseInstructions, // Use fetched instructions
						input: inputItems,
						tools: tools || [],
						tool_choice:
							(toolChoice &&
								(toolChoice === "auto" ||
									toolChoice === "none" ||
									toolChoice === "required" ||
									typeof toolChoice === "object")) ||
							toolChoice === undefined
								? toolChoice || "auto"
								: "auto",
						parallel_tool_calls: parallelToolCalls || false,
						store: false,
						stream: true,
						include: include,
						prompt_cache_key: sessionId,
						...(reasoningParam && { reasoning: reasoningParam })
					});

	const headers: HeadersInit = {
		"Content-Type": "application/json",
		"User-Agent": "codex_cli_rs/0.149.1"
	};
	if (isChatGptOAuth) {
		const auth = await AuthStore.getFresh(env, Date.now());
		if (!auth.accessToken) {
			return { response: null, error: new Response(JSON.stringify({ error: { message: "ChatGPT OAuth provider is not configured" } }), { status: 503, headers: { "Content-Type": "application/json" } }) };
		}
		headers["Authorization"] = `Bearer ${auth.accessToken}`;
		if (auth.accountId) headers["ChatGPT-Account-ID"] = auth.accountId;
		headers["originator"] = "codex_cli_rs";
	} else {
		headers["Authorization"] = `Bearer ${env.OPENAI_API_KEY}`;
	}
	try {
		headers["Accept"] = JSON.parse(requestBody).stream === true ? "text/event-stream" : "application/json";
	} catch {
		headers["Accept"] = "application/json";
	}

	try {
		const upstreamResponse = await fetch(requestUrl, {
			method: "POST",
			headers: headers,
			body: requestBody
			// Cloudflare Workers fetch does not have a 'timeout' option like requests.
			// You might need to implement a custom timeout using AbortController if necessary.
		});

		// Response received

		if (!upstreamResponse.ok) {
			// Handle HTTP errors from upstream
			logUpstreamError(upstreamResponse.status, requestUrl, "kind=http method=POST");

			return {
				response: null,
				error: new Response(
					JSON.stringify({
						error: {
							message: "Upstream request failed"
						}
					}),
					{ status: upstreamResponse.status, headers: { "Content-Type": "application/json" } }
				)
			};
		}

		return { response: upstreamResponse, error: null };
	} catch {
		logUpstreamError("fetch-failed", requestUrl, "kind=network method=POST");

		return {
			response: null,
			error: new Response(
				JSON.stringify({
					error: {
						message: "Upstream request failed"
					}
				}),
				{ status: 502, headers: { "Content-Type": "application/json" } }
			)
		};
	}
}
