import { describe, expect, it } from "vitest";
import { MODEL_IDS, MODEL_PRESETS } from "../src/models";

describe("model catalogue", () => {
	it("contains unique public model IDs", () => {
		const ids = [...MODEL_IDS, ...MODEL_PRESETS.map((preset) => preset.id)];
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("contains the current Codex CLI models", () => {
		expect(MODEL_IDS).toEqual(expect.arrayContaining([
		"gpt-5.3-codex-spark", "gpt-5.4", "gpt-5.4-mini", "gpt-5.5",
		"gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"
	]));
	});
});
