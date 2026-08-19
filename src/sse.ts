// src/sse.ts
interface SseEvent {
	type: string;
	response?: {
		id?: string;
		error?: {
			message: string;
		};
	};
	item?: {
		type: string;
		call_id?: string;
		id?: string;
		name?: string;
		arguments?: string;
	};
	delta?: string;
}

const SAFE_ERROR = { message: "Upstream request failed" };
const SAFE_ERROR_MESSAGE = SAFE_ERROR.message;

const ERROR_CONTAINER_KEY = /^(?:error|raw_error|upstream_error|error_message)$/i;
const ERROR_TEXT_KEY = /^(?:message|details|code)$/i;
const AUTHORITATIVE_RESPONSE_KEY = /^(?:response|metadata|output|incomplete_details|usage)$/i;
const TOKEN_VALUE =
	/(?:Bearer\s+\S+|\b(?:access|refresh|auth|oauth|api|bearer|jwt|token)[-_][A-Za-z0-9._-]+|\bjwt\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|\bsk-[A-Za-z0-9_-]+\b)/gi;

function sanitizeString(value: string, errorText: boolean): string {
	if (errorText) return SAFE_ERROR_MESSAGE;
	return value.replace(TOKEN_VALUE, "[REDACTED]");
}

function isSensitiveKey(key: string): boolean {
	const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
	return (
		normalized === "token" || /(?:authorization|accesstoken|refreshtoken|idtoken|authtoken|apikey)$/.test(normalized)
	);
}

function sanitizeValue(value: unknown, key?: string, errorContext = false): unknown {
	if (key && isSensitiveKey(key)) return undefined;
	const inheritedErrorContext = Boolean(key && AUTHORITATIVE_RESPONSE_KEY.test(key)) ? false : errorContext;
	const nestedErrorContext = inheritedErrorContext || Boolean(key && ERROR_CONTAINER_KEY.test(key));
	if (typeof value === "string") {
		const errorText = Boolean(key && (ERROR_TEXT_KEY.test(key) || ERROR_CONTAINER_KEY.test(key)));
		return sanitizeString(value, nestedErrorContext && errorText);
	}
	if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, undefined, nestedErrorContext));
	if (!value || typeof value !== "object") return value;
	const objectErrorContext = nestedErrorContext || isErrorLike((value as Record<string, unknown>).type);

	const sanitized: Record<string, unknown> = {};
	for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
		const safeValue = sanitizeValue(nestedValue, nestedKey, objectErrorContext);
		if (safeValue !== undefined) sanitized[nestedKey] = safeValue;
	}
	return sanitized;
}

export function sanitizeEventData<T>(value: T): T {
	return sanitizeValue(value) as T;
}

function isErrorLike(type: unknown): boolean {
	return typeof type === "string" && /(error|failed|incomplete|cancelled)/i.test(type);
}

function enqueueSafeError(controller: ReadableStreamDefaultController, encoder = new TextEncoder()): void {
	controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: SAFE_ERROR })}\n\n`));
}

export async function sseTranslateResponses(upstreamResponse: Response): Promise<ReadableStream> {
	const reader = upstreamResponse.body?.getReader();
	if (!reader) throw new Error("Upstream response body is not readable.");
	return new ReadableStream({
		async start(controller) {
			const decoder = new TextDecoder();
			const encoder = new TextEncoder();
			let buffer = "";
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (value) buffer += decoder.decode(value, { stream: true });
					if (done) {
						buffer += decoder.decode();
						if (buffer) buffer += "\n";
					}
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";
					for (const line of lines) {
						if (!line.startsWith("data: ")) continue;
						const data = line.slice(6).trim();
						if (!data || data === "[DONE]") {
							controller.enqueue(encoder.encode("data: [DONE]\n\n"));
							continue;
						}
						try {
							const event = JSON.parse(data);
							const safeEvent = sanitizeEventData(event) as Record<string, unknown>;
							if (isErrorLike(safeEvent.type) && !("error" in safeEvent)) safeEvent.error = SAFE_ERROR;
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(safeEvent)}\n\n`));
						} catch {
							enqueueSafeError(controller, encoder);
						}
					}
					if (done) break;
				}
			} catch {
				enqueueSafeError(controller, encoder);
			} finally {
				reader.releaseLock();
				controller.close();
			}
		}
	});
}

export async function sseTranslateChat(
	upstreamResponse: Response,
	model: string,
	created: number,
	verbose: boolean = false,
	reasoningCompat: string = "think-tags"
): Promise<ReadableStream> {
	void verbose;
	const reader = upstreamResponse.body?.getReader();
	if (!reader) {
		throw new Error("Upstream response body is not readable.");
	}

	let responseId = "chatcmpl-stream";
	let thinkOpen = false;
	let thinkClosed = false;
	let sawAnySummary = false;
	let pendingSummaryParagraph = false;

	return new ReadableStream({
		async start(controller) {
			const decoder = new TextDecoder();
			let buffer = "";

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (value) buffer += decoder.decode(value, { stream: true });
					if (done) {
						buffer += decoder.decode();
						if (buffer) buffer += "\n";
					}

					// Process lines from the buffer
					const lines = buffer.split("\n");
					buffer = lines.pop() || ""; // Keep the last (possibly incomplete) line in buffer

					for (const line of lines) {
						if (!line.startsWith("data: ")) {
							continue;
						}
						const data = line.substring("data: ".length).trim();
						if (!data) {
							continue;
						}
						if (data === "[DONE]") {
							controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
							break;
						}

						let evt: SseEvent;
						try {
							evt = sanitizeEventData(JSON.parse(data));
						} catch {
							enqueueSafeError(controller);
							continue;
						}

						const kind = evt.type;
						if (evt.response && typeof evt.response.id === "string") {
							responseId = evt.response.id || responseId;
						}

						if (isErrorLike(kind)) {
							enqueueSafeError(controller);
						} else if (kind === "response.output_text.delta") {
							const delta = evt.delta || "";
							if (reasoningCompat === "think-tags" && thinkOpen && !thinkClosed) {
								const closeChunk = {
									id: responseId,
									object: "chat.completion.chunk",
									created: created,
									model: model,
									choices: [{ index: 0, delta: { content: "</think>" }, finish_reason: null }]
								};
								controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(closeChunk)}\n\n`));
								thinkOpen = false;
								thinkClosed = true;
							}
							const chunk = {
								id: responseId,
								object: "chat.completion.chunk",
								created: created,
								model: model,
								choices: [{ index: 0, delta: { content: delta }, finish_reason: null }]
							};
							controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
						} else if (kind === "response.output_item.done") {
							const item = evt.item;
							if (item && item.type === "function_call") {
								const callId = item.call_id || item.id || "";
								const name = item.name || "";
								const args = item.arguments || "";
								if (typeof callId === "string" && typeof name === "string" && typeof args === "string") {
									const deltaChunk = {
										id: responseId,
										object: "chat.completion.chunk",
										created: created,
										model: model,
										choices: [
											{
												index: 0,
												delta: {
													tool_calls: [
														{
															index: 0,
															id: callId,
															type: "function",
															function: { name: name, arguments: args }
														}
													]
												},
												finish_reason: null
											}
										]
									};
									controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(deltaChunk)}\n\n`));

									const finishChunk = {
										id: responseId,
										object: "chat.completion.chunk",
										created: created,
										model: model,
										choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }]
									};
									controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finishChunk)}\n\n`));
								}
							}
						} else if (kind === "response.reasoning_summary_part.added") {
							if (reasoningCompat === "think-tags" || reasoningCompat === "o3") {
								if (sawAnySummary) {
									pendingSummaryParagraph = true;
								} else {
									sawAnySummary = true;
								}
							}
						} else if (kind === "response.reasoning_summary_text.delta" || kind === "response.reasoning_text.delta") {
							const deltaTxt = evt.delta || "";
							if (reasoningCompat === "o3") {
								if (kind === "response.reasoning_summary_text.delta" && pendingSummaryParagraph) {
									const nlChunk = {
										id: responseId,
										object: "chat.completion.chunk",
										created: created,
										model: model,
										choices: [
											{
												index: 0,
												delta: { reasoning: { content: [{ type: "text", text: "\n" }] } },
												finish_reason: null
											}
										]
									};
									controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(nlChunk)}\n\n`));
									pendingSummaryParagraph = false;
								}
								const chunk = {
									id: responseId,
									object: "chat.completion.chunk",
									created: created,
									model: model,
									choices: [
										{
											index: 0,
											delta: { reasoning: { content: [{ type: "text", text: deltaTxt }] } },
											finish_reason: null
										}
									]
								};
								controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
							} else if (reasoningCompat === "think-tags") {
								if (!thinkOpen && !thinkClosed) {
									const openChunk = {
										id: responseId,
										object: "chat.completion.chunk",
										created: created,
										model: model,
										choices: [{ index: 0, delta: { content: "<think>" }, finish_reason: null }]
									};
									controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openChunk)}\n\n`));
									thinkOpen = true;
								}
								if (thinkOpen && !thinkClosed) {
									if (kind === "response.reasoning_summary_text.delta" && pendingSummaryParagraph) {
										const nlChunk = {
											id: responseId,
											object: "chat.completion.chunk",
											created: created,
											model: model,
											choices: [{ index: 0, delta: { content: "\n" }, finish_reason: null }]
										};
										controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(nlChunk)}\n\n`));
										pendingSummaryParagraph = false;
									}
									const contentChunk = {
										id: responseId,
										object: "chat.completion.chunk",
										created: created,
										model: model,
										choices: [{ index: 0, delta: { content: deltaTxt }, finish_reason: null }]
									};
									controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(contentChunk)}\n\n`));
								}
							} else {
								// Default behavior for other compat modes
								if (kind === "response.reasoning_summary_text.delta") {
									const chunk = {
										id: responseId,
										object: "chat.completion.chunk",
										created: created,
										model: model,
										choices: [
											{
												index: 0,
												delta: { reasoning_summary: deltaTxt },
												finish_reason: null
											}
										]
									};
									controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
								} else {
									const chunk = {
										id: responseId,
										object: "chat.completion.chunk",
										created: created,
										model: model,
										choices: [{ index: 0, delta: { reasoning: deltaTxt }, finish_reason: null }]
									};
									controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
								}
							}
						} else if (typeof kind === "string" && kind.endsWith(".done")) {
							// Pass
						} else if (kind === "response.output_text.done") {
							const chunk = {
								id: responseId,
								object: "chat.completion.chunk",
								created: created,
								model: model,
								choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
							};
							controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
						} else if (kind === "response.completed") {
							if (reasoningCompat === "think-tags" && thinkOpen && !thinkClosed) {
								const closeChunk = {
									id: responseId,
									object: "chat.completion.chunk",
									created: created,
									model: model,
									choices: [{ index: 0, delta: { content: "</think>" }, finish_reason: null }]
								};
								controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(closeChunk)}\n\n`));
								thinkOpen = false;
								thinkClosed = true;
							}
							controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
							break;
						}
					}
					if (done) break;
				}
			} catch {
				enqueueSafeError(controller);
			} finally {
				reader.releaseLock();
				controller.close();
			}
		}
	});
}

export async function sseTranslateText(
	upstreamResponse: Response,
	model: string,
	created: number,
	verbose: boolean = false
): Promise<ReadableStream> {
	void verbose;
	const reader = upstreamResponse.body?.getReader();
	if (!reader) {
		throw new Error("Upstream response body is not readable.");
	}

	let responseId = "cmpl-stream";

	return new ReadableStream({
		async start(controller) {
			const decoder = new TextDecoder();
			let buffer = "";

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (value) buffer += decoder.decode(value, { stream: true });
					if (done) {
						buffer += decoder.decode();
						if (buffer) buffer += "\n";
					}

					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (!line.startsWith("data: ")) {
							continue;
						}
						const data = line.substring("data: ".length).trim();
						if (!data || data === "[DONE]") {
							if (data === "[DONE]") {
								const chunk = {
									id: responseId,
									object: "text_completion.chunk",
									created: created,
									model: model,
									choices: [{ index: 0, text: "", finish_reason: "stop" }]
								};
								controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
							}
							continue;
						}

						let evt: SseEvent;
						try {
							evt = sanitizeEventData(JSON.parse(data));
						} catch {
							enqueueSafeError(controller);
							continue;
						}

						const kind = evt.type;
						if (evt.response && typeof evt.response.id === "string") {
							responseId = evt.response.id || responseId;
						}
						if (isErrorLike(kind)) {
							enqueueSafeError(controller);
						} else if (kind === "response.output_text.delta") {
							const deltaText = evt.delta || "";
							const chunk = {
								id: responseId,
								object: "text_completion.chunk",
								created: created,
								model: model,
								choices: [{ index: 0, text: deltaText, finish_reason: null }]
							};
							controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
						} else if (kind === "response.output_text.done") {
							const chunk = {
								id: responseId,
								object: "text_completion.chunk",
								created: created,
								model: model,
								choices: [{ index: 0, text: "", finish_reason: "stop" }]
							};
							controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
						} else if (kind === "response.completed") {
							controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
							break;
						}
					}
					if (done) break;
				}
			} catch {
				enqueueSafeError(controller);
			} finally {
				reader.releaseLock();
				controller.close();
			}
		}
	});
}
