import { normalizeModelName } from "./utils";
import { AuthStore } from "./auth_store";
import { getInstructionsForModel } from "./instructions";
import { stablePromptCacheKey } from "./cache_key";
import { Env, InputItem, Tool } from "./types"; // Import types

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
	const { accessToken, accountId } = await AuthStore.getFresh(env, Date.now());

	// KV token check (minimal logging)

	if (!accessToken || !accountId) {
		return {
			response: null,
			error: new Response(
				JSON.stringify({
					error: {
						message: "Missing ChatGPT credentials. Run 'codex login' first"
					}
				}),
				{ status: 401, headers: { "Content-Type": "application/json" } }
			)
		};
	}

	const include: string[] = [];
	if (reasoningParam?.effort !== "none") {
		include.push("reasoning.encrypted_content");
	}

	const requestUrl = env.CHATGPT_RESPONSES_URL;

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
		"Content-Type": "application/json"
	};

	headers["Authorization"] = `Bearer ${accessToken}`;
	headers["Accept"] = "text/event-stream";
	headers["ChatGPT-Account-ID"] = accountId;
	headers["OpenAI-Beta"] = "responses=experimental";
	headers["originator"] = "codex_cli_rs";
	if (sessionId) {
		headers["session_id"] = sessionId;
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

			// Check if it's a 401 Unauthorized and we can refresh the token
			if (upstreamResponse.status === 401) {
				const refreshedAuth = await AuthStore.refresh(env, Date.now());
				if (refreshedAuth.accessToken) {
					const headers: HeadersInit = {
						"Content-Type": "application/json"
					};

					headers["Authorization"] = `Bearer ${refreshedAuth.accessToken}`;
					headers["Accept"] = "text/event-stream";
					headers["ChatGPT-Account-ID"] = refreshedAuth.accountId || accountId;
					headers["OpenAI-Beta"] = "responses=experimental";
					headers["originator"] = "codex_cli_rs";
					if (sessionId) {
						headers["session_id"] = sessionId;
					}

					const retryResponse = await fetch(requestUrl, {
						method: "POST",
						headers: headers,
						body: requestBody
					});

					if (retryResponse.ok) {
						return { response: retryResponse, error: null };
					}
				}
			}

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
