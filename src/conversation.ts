import { stablePromptCacheKey } from "./cache_key";

function firstString(...values: unknown[]): string | undefined {
	return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

export async function resolvePromptCacheKey(
	payload: Record<string, unknown>,
	headers: Headers,
	prefix: string
): Promise<string> {
	const explicitCacheKey = firstString(
		payload.prompt_cache_key,
		headers.get("prompt-cache-key"),
		headers.get("x-prompt-cache-key")
	);
	if (explicitCacheKey) return explicitCacheKey;

	const stableConversationId = firstString(
		payload.conversation_id,
		payload.conversation,
		headers.get("conversation-id"),
		headers.get("x-conversation-id")
	);
	const requestId = firstString(
		headers.get("session-id"),
		headers.get("x-session-id"),
		headers.get("request-id"),
		headers.get("x-request-id")
	);
	return stablePromptCacheKey(stableConversationId || requestId || crypto.randomUUID(), prefix);
}
