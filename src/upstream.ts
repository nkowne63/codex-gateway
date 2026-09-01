import { normalizeModelName } from "./utils";
import { getInstructionsForModel } from "./instructions";
import { stablePromptCacheKey } from "./cache_key";
import { Env, InputItem, Tool } from "./types"; // Import types
import { AuthStore, authFingerprint, authSource, persistSecretFallback, secretBootstrap } from "./auth_store";

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

function normalizeResponsesPayloadInput(payload: Record<string, unknown>): Record<string, unknown> {
	if (typeof payload.input !== "string") return payload;
	return {
		...payload,
		input: [{ type: "message", role: "user", content: payload.input }]
	};
}

const PRIVATE_TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;
// Official Workshop descriptions contain prose, newlines, tabs, and currently
// reach roughly 2 KiB. Normalize them at the private-origin boundary while
// keeping a bounded description size for upstream safety.
const PRIVATE_DESCRIPTION_MAX = 4096;

function normalizePrivateToolDescription(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	return value
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
		.replace(/\s+/gu, " ")
		.trim()
		.slice(0, PRIVATE_DESCRIPTION_MAX)
		.trim();
}

function validParametersSchema(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const schema = value as Record<string, unknown>;
	if (schema.type !== "object") return false;
	if (schema.properties !== undefined && (!schema.properties || typeof schema.properties !== "object" || Array.isArray(schema.properties))) return false;
	if (schema.required !== undefined) {
		if (!Array.isArray(schema.required) || schema.required.some((item) => typeof item !== "string") || new Set(schema.required).size !== schema.required.length) return false;
		const properties = (schema.properties || {}) as Record<string, unknown>;
		if (schema.required.some((item) => !(item in properties))) return false;
	}
	return true;
}

function safePrivateOriginTools(value: unknown): Array<Record<string, unknown>> {
	if (!Array.isArray(value)) return [];
	return value.flatMap((tool) => {
		if (!tool || typeof tool !== "object" || Array.isArray(tool)) return [];
		const candidate = tool as Record<string, unknown>;
		if (candidate.type !== "function" || typeof candidate.name !== "string" || !PRIVATE_TOOL_NAME.test(candidate.name)) return [];
		const safe: Record<string, unknown> = { type: "function", name: candidate.name };
		if (candidate.description !== undefined) {
			const description = normalizePrivateToolDescription(candidate.description);
			if (description !== undefined) safe.description = description;
		}
		if (!validParametersSchema(candidate.parameters)) return [];
		safe.parameters = candidate.parameters;
		if (typeof candidate.strict === "boolean") safe.strict = candidate.strict;
		return [safe];
	});
}

function safePrivateOriginToolChoice(value: unknown): unknown {
	if (value === "auto" || value === "none" || value === "required") return value;
	if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
	const choice = value as Record<string, unknown>;
	return choice.type === "function" && typeof choice.name === "string" && choice.name.trim() ? { type: "function", name: choice.name } : undefined;
}

function normalizePrivateOriginPayload(payload: Record<string, unknown>, defaultReasoning?: ReasoningParam): Record<string, unknown> {
	const validEfforts = new Set(["none", "low", "medium", "high", "xhigh", "max"]);
	const rawReasoning = payload.reasoning;
	const sanitizedTools = safePrivateOriginTools(payload.tools);
	const sanitizedToolChoice = safePrivateOriginToolChoice(payload.tool_choice);
	const validToolNames = new Set(sanitizedTools.map((tool) => tool.name));
	const usableToolChoice = sanitizedToolChoice && typeof sanitizedToolChoice === "object" && (sanitizedToolChoice as Record<string, unknown>).type === "function" && !validToolNames.has((sanitizedToolChoice as Record<string, unknown>).name) ? undefined : sanitizedToolChoice;
	const requestedEffort =
		typeof rawReasoning === "object" && rawReasoning !== null && typeof (rawReasoning as { effort?: unknown }).effort === "string"
			? (rawReasoning as { effort: string }).effort.trim().toLowerCase()
			: defaultReasoning?.effort;
	const normalizedEffort = requestedEffort === "minimal" ? "medium" : requestedEffort;
	const effort = normalizedEffort && validEfforts.has(normalizedEffort) ? normalizedEffort : undefined;
	return {
		model: payload.model,
		input: normalizeResponsesPayloadInput(payload).input,
		stream: true,
		store: false,
		...(sanitizedTools.length ? { tools: sanitizedTools } : {}),
		...(usableToolChoice !== undefined ? { tool_choice: usableToolChoice } : {}),
		...(typeof payload.parallel_tool_calls === "boolean" ? { parallel_tool_calls: payload.parallel_tool_calls } : {}),
		...(effort ? { reasoning: { effort } } : {})
	};
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
		signal?: AbortSignal;
	}
): Promise<{ response: Response | null; error: Response | null; alreadySse?: boolean }> {
	const { instructions, tools, toolChoice, parallelToolCalls, reasoningParam } = options || {};
	const privateOriginMode = env.UPSTREAM_MODE === "private-origin";
	if (privateOriginMode && (!env.CODEX_PRIVATE_ORIGIN || !env.CODEX_PRIVATE_ORIGIN_TOKEN || (env.OPENAI_PROVIDER === "chatgpt-oauth" && authSource(env) !== "secret" && (!env.OAUTH_VAULT || !env.OAUTH_VAULT_KEY)))) {
		return {
			response: null,
			error: new Response(JSON.stringify({ error: { message: "Private origin is not configured" } }), {
				status: 503,
				headers: { "Content-Type": "application/json" }
			})
		};
	}
	if (env.OPENAI_PROVIDER !== "openai-api" && env.OPENAI_PROVIDER !== "chatgpt-oauth") {
		return {
			response: null,
			error: new Response(JSON.stringify({ error: { message: "OpenAI API provider is not enabled" } }), {
				status: 503,
				headers: { "Content-Type": "application/json" }
			})
		};
	}
	const isChatGptOAuth = env.OPENAI_PROVIDER === "chatgpt-oauth";
	if (!isChatGptOAuth && !env.OPENAI_API_KEY) {
		return {
			response: null,
			error: new Response(JSON.stringify({ error: { message: "OpenAI API provider is not configured" } }), {
				status: 503,
				headers: { "Content-Type": "application/json" }
			})
		};
	}
	const oauthAuth = isChatGptOAuth ? await AuthStore.getFresh(env, Date.now()) : null;
	if (isChatGptOAuth && !oauthAuth?.accessToken) {
		return {
			response: null,
			error: new Response(JSON.stringify({ error: { message: "ChatGPT OAuth provider is not configured" } }), {
				status: 503,
				headers: { "Content-Type": "application/json" }
			})
		};
	}

	const include: string[] = [];
	if (reasoningParam?.effort !== "none") {
		include.push("reasoning.encrypted_content");
	}

	const requestUrl = isChatGptOAuth
		? env.CHATGPT_RESPONSES_URL || "https://chatgpt.com/backend-api/codex/responses"
		: "https://api.openai.com/v1/responses";

	const sessionId = options?.promptCacheKey || (await stablePromptCacheKey(crypto.randomUUID(), instructions || model));

	// Request-provided instructions are authoritative. Base instructions are optional
	// enrichment for generated requests and must never gate the upstream connection.
	const baseInstructions = instructions || (options?.rawResponsesBody === undefined ? await getInstructionsForModel(model) : "");

	const responsesPayload = options?.responsesPayload;
	const requestBody =
		options?.rawResponsesBody !== undefined
			? (() => {
					try {
						const parsed = (privateOriginMode
							? (payload: Record<string, unknown>) => normalizePrivateOriginPayload(payload, reasoningParam)
							: normalizeResponsesPayloadInput)(JSON.parse(options.rawResponsesBody) as Record<string, unknown>);
						return JSON.stringify({
							...parsed,
							model: normalizeModelName(typeof parsed.model === "string" ? parsed.model : model, env.DEBUG_MODEL, model)
						});
					} catch {
						return options.rawResponsesBody;
					}
				})()
			: responsesPayload
				? JSON.stringify({
						...(privateOriginMode ? normalizePrivateOriginPayload(structuredClone(responsesPayload), reasoningParam) : structuredClone(responsesPayload)),
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
	if (privateOriginMode) {
		return startPrivateOriginRequest(
			env.CODEX_PRIVATE_ORIGIN!,
			env.CODEX_PRIVATE_ORIGIN_TOKEN!,
			requestBody,
			oauthAuth?.accessToken || null,
			oauthAuth?.accountId || null,
			options?.signal
		);
	}
	if (isChatGptOAuth) {
		headers["Authorization"] = `Bearer ${oauthAuth!.accessToken}`;
		if (oauthAuth!.accountId) headers["ChatGPT-Account-ID"] = oauthAuth!.accountId;
		headers["originator"] = "codex_cli_rs";
		headers["Origin"] = "https://chatgpt.com";
		headers["Referer"] = "https://chatgpt.com/";
		headers["Accept-Language"] = "en-US,en;q=0.9";
		headers["x-client-request-id"] = crypto.randomUUID();
	} else {
		headers["Authorization"] = `Bearer ${env.OPENAI_API_KEY}`;
	}
	try {
		headers["Accept"] = isChatGptOAuth
			? "text/event-stream"
			: JSON.parse(requestBody).stream === true
				? "text/event-stream"
				: "application/json";
	} catch (error) {
		headers["Accept"] = isChatGptOAuth ? "text/event-stream" : "application/json";
	}
	if (isChatGptOAuth) headers["OpenAI-Beta"] = "responses=2026-02-06";
	if (isChatGptOAuth && (env.CHATGPT_TRANSPORT || "websocket") === "websocket") {
		const websocketResult = await startChatGptWebSocket(requestUrl, headers, requestBody, options?.signal);
		if (authSource(env) === "fallback" && websocketResult.error?.status === 401 && env.OAUTH_VAULT) {
			const secretAuth = secretBootstrap(env);
			if (secretAuth && authFingerprint(secretAuth) !== authFingerprint(oauthAuth!)) {
				const fallbackHeaders = new Headers(headers);
				fallbackHeaders.set("Authorization", `Bearer ${secretAuth.tokens.access_token}`);
				if (secretAuth.tokens.account_id) fallbackHeaders.set("ChatGPT-Account-ID", secretAuth.tokens.account_id);
				const fallbackResult = await startChatGptWebSocket(requestUrl, fallbackHeaders, requestBody, options?.signal);
				if (!fallbackResult.error) await persistSecretFallback(env, secretAuth);
				return fallbackResult;
			}
		}
		return websocketResult;
	}

	const request = () => fetch(requestUrl, {
		method: "POST",
		headers: headers,
		body: requestBody,
		signal: options?.signal
	});
	try {
		let upstreamResponse = await request();
		// A stale encrypted vault may survive a local CLI re-authentication. Only a
		// vault-selected 401 may use the immutable secret bootstrap, and only once.
		if (isChatGptOAuth && authSource(env) === "fallback" && env.OAUTH_VAULT && upstreamResponse.status === 401) {
			const secretAuth = secretBootstrap(env);
			if (secretAuth && authFingerprint(secretAuth) !== authFingerprint(oauthAuth!)) {
				headers["Authorization"] = `Bearer ${secretAuth.tokens.access_token}`;
				if (secretAuth.tokens.account_id) headers["ChatGPT-Account-ID"] = secretAuth.tokens.account_id;
				upstreamResponse = await request();
				if (upstreamResponse.ok) await persistSecretFallback(env, secretAuth);
			}
		}

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

async function startPrivateOriginRequest(
	origin: Fetcher,
	originToken: string,
	requestBody: string,
	chatGptToken: string | null,
	accountId: string | null,
	signal?: AbortSignal
): Promise<{ response: Response | null; error: Response | null; alreadySse?: boolean }> {
	try {
		const upstreamResponse = await origin.fetch("http://127.0.0.1/v1/responses", {
			method: "POST",
			headers: {
				// The private-origin credential authenticates the hop to the RPi proxy;
				// the ChatGPT credential must remain distinct and become upstream
				// Authorization only after the proxy validates the hop credential.
				"X-Private-Origin-Authorization": `Bearer ${originToken}`,
				...(chatGptToken ? { "X-ChatGPT-OAuth-Authorization": `Bearer ${chatGptToken}` } : {}),
				...(accountId ? { "ChatGPT-Account-ID": accountId } : {}),
				"Content-Type": "application/json",
				Accept: requestBody.includes('"stream":true') ? "text/event-stream" : "application/json"
			},
			body: requestBody,
			signal
		});
		if (!upstreamResponse.ok) {
			return {
				response: null,
				error: new Response(JSON.stringify({ error: { message: "Private origin request failed" } }), {
					status: upstreamResponse.status,
					headers: { "Content-Type": "application/json" }
				})
			};
		}
		return {
			response: upstreamResponse,
			error: null,
			alreadySse: upstreamResponse.headers.get("content-type")?.includes("text/event-stream") === true
		};
	} catch {
		return {
			response: null,
			error: new Response(JSON.stringify({ error: { message: "Private origin request failed" } }), {
				status: 502,
				headers: { "Content-Type": "application/json" }
			})
		};
	}
}

async function startChatGptWebSocket(
	requestUrl: string,
	headers: HeadersInit,
	requestBody: string,
	signal?: AbortSignal
): Promise<{ response: Response | null; error: Response | null; alreadySse?: boolean }> {
	const wsHeaders = new Headers(headers);
	wsHeaders.set("Upgrade", "websocket");
	wsHeaders.set("Accept", "text/event-stream");
	wsHeaders.set("OpenAI-Beta", "responses_websockets=2026-02-06");
	wsHeaders.set("Origin", "https://chatgpt.com");
	wsHeaders.set("Referer", "https://chatgpt.com/");
	wsHeaders.set("Accept-Language", "en-US,en;q=0.9");
	wsHeaders.set("x-client-request-id", crypto.randomUUID());
	wsHeaders.set("x-codex-installation-id", crypto.randomUUID());
	try {
		const upstream = await fetch(requestUrl, { method: "GET", headers: wsHeaders, signal });
		if (!upstream.ok) {
			const accessDenied = upstream.status === 401 || upstream.status === 403;
			return {
				response: null,
				error: new Response(
					JSON.stringify({
						error: {
							message: accessDenied ? "Upstream WebSocket access denied" : "Upstream WebSocket handshake failed"
						}
					}),
					{ status: upstream.status, headers: { "Content-Type": "application/json" } }
				)
			};
		}
		const socket = upstream.webSocket;
		if (!socket)
			return {
				response: null,
				error: new Response(JSON.stringify({ error: { message: "Upstream WebSocket upgrade failed" } }), {
					status: 502,
					headers: { "Content-Type": "application/json" }
				})
			};
		(socket.accept as unknown as (options: { allowHalfOpen: boolean }) => void)({ allowHalfOpen: true });
		const body = normalizeWebSocketPayload(requestBody);
		try {
			socket.send(JSON.stringify({ type: "response.create", response: body }));
		} catch {
			try {
				socket.close();
			} catch {}
			return {
				response: null,
				error: new Response(JSON.stringify({ error: { message: "Upstream WebSocket request failed" } }), {
					status: 502,
					headers: { "Content-Type": "application/json" }
				})
			};
		}
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				const encoder = new TextEncoder();
				const close = () => {
					try {
						socket.close();
					} catch {}
					controller.close();
				};
				const onAbort = () => close();
				if (signal) signal.addEventListener("abort", onAbort, { once: true });
				socket.addEventListener("message", (event) => {
					try {
						if (typeof event.data !== "string") return;
						const parsed = JSON.parse(event.data) as Record<string, unknown>;
						const data = `data: ${JSON.stringify(parsed)}\n\n`;
						controller.enqueue(encoder.encode(data));
						if (["response.completed", "response.failed", "response.incomplete"].includes(String(parsed.type))) close();
					} catch {
						/* malformed upstream events are not reflected */
					}
				});
				socket.addEventListener("close", close, { once: true });
				socket.addEventListener("error", close, { once: true });
			}
		});
		return {
			response: new Response(stream, {
				status: 200,
				headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
			}),
			error: null,
			alreadySse: true
		};
	} catch {
		return {
			response: null,
			error: new Response(JSON.stringify({ error: { message: "Upstream WebSocket request failed" } }), {
				status: 502,
				headers: { "Content-Type": "application/json" }
			})
		};
	}
}

function normalizeWebSocketPayload(requestBody: string): Record<string, unknown> {
	const body = JSON.parse(requestBody) as Record<string, unknown>;
	return { ...body, stream: true, store: false };
}
