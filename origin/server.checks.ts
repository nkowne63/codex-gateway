import { describe, expect, it } from "vitest";
import { normalizeModel, promptFrom } from "./server.js";

describe("origin contract", () => {
  it("normalizes only supported models", () => {
    expect(normalizeModel("gpt-5.6")).toBe("gpt-5.6-luna");
    expect(() => normalizeModel("gpt-4o")).toThrow();
  });
  it("promptifies input without exposing policy", () => {
    expect(promptFrom({ instructions: "be brief", input: "hello" })).toBe("be brief\n\nhello");
  });
});
