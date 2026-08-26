import { describe, expect, it } from "vitest";
import { buildReasoningParam } from "../src/reasoning";

describe("GPT-5.6 reasoning effort", () => {
	const officialEfforts = ["none", "low", "medium", "high", "xhigh", "max"] as const;

	it.each(officialEfforts)("accepts %s", (effort) => {
		expect(buildReasoningParam("medium", "auto", { effort }).effort).toBe(effort);
	});

	it("defaults missing effort to medium", () => {
		expect(buildReasoningParam(undefined, "auto").effort).toBe("medium");
	});

	it("maps legacy minimal to medium", () => {
		expect(buildReasoningParam("minimal", "auto").effort).toBe("medium");
		expect(buildReasoningParam("medium", "auto", { effort: "minimal" }).effort).toBe("medium");
	});

	it("keeps invalid configured values on the medium fallback", () => {
		expect(buildReasoningParam("invalid", "auto").effort).toBe("medium");
	});

	it("keeps the configured effort when no valid override is available", () => {
		expect(buildReasoningParam("high", "auto", { effort: "invalid" }).effort).toBe("high");
	});

	it("request effort overrides configured effort", () => {
		expect(buildReasoningParam("low", "auto", { effort: "xhigh" }).effort).toBe("xhigh");
	});
});
