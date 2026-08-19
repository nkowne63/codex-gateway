function normalizePrefix(prefix: string | undefined): string {
	return (prefix || "").trim().replace(/\s+/g, " ");
}

export async function stablePromptCacheKey(
	conversationId: string | undefined,
	normalizedPrefix: string | undefined
): Promise<string> {
	if (!conversationId) throw new Error("A conversation or request identifier is required");
	const seed = `${conversationId}\n${normalizePrefix(normalizedPrefix)}`;
	const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
	return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
