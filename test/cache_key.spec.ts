import { describe, expect, it } from "vitest";
import { stablePromptCacheKey } from "../src/cache_key";

describe("stablePromptCacheKey", () => {
	it("is stable for a conversation when later input changes", async () => {
		const first = await stablePromptCacheKey("conv-42", "You are a helpful assistant.\n\nSummarize:");
		const later = await stablePromptCacheKey("conv-42", "You are a helpful assistant. Summarize:");

		expect(first).toBe(later);
	});

	it("separates conversations without hashing the changing full input", async () => {
		const first = await stablePromptCacheKey("conv-42", "shared prefix");
		const second = await stablePromptCacheKey("conv-43", "shared prefix");

		expect(first).not.toBe(second);
	});

	it("separates unrelated fallback request identifiers", async () => {
		const first = await stablePromptCacheKey("request-1", "shared prefix");
		const second = await stablePromptCacheKey("request-2", "shared prefix");

		expect(first).not.toBe(second);
	});
});
