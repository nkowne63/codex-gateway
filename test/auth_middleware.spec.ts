import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { openaiAuthMiddleware } from "../src/middleware/openaiAuthMiddleware";
import ollama from "../src/routes/ollama";
import openai from "../src/routes/openai";
import responses from "../src/routes/responses";
import type { Env } from "../src/types";

function protectedApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.use("/protected", openaiAuthMiddleware());
	app.post("/protected", (c) => c.json({ reached: true }));
	return app;
}

describe("openaiAuthMiddleware", () => {
	it("uses one redacted rejection response for every invalid credential", async () => {
		const app = protectedApp();
		for (const authorization of [undefined, "Basic client-key", "Bearer wrong-key"]) {
			const response = await app.fetch(
				new Request("https://gateway.test/protected", {
					method: "POST",
					headers: authorization ? { Authorization: authorization } : undefined
				}),
				{ OPENAI_API_KEY: "client-key" } as Env
			);

			expect(response.status).toBe(401);
			expect(await response.json()).toEqual({ error: { message: "Unauthorized" } });
		}
	});

	it("allows exactly one route execution when the configured key matches", async () => {
		const response = await protectedApp().fetch(
			new Request("https://gateway.test/protected", {
				method: "POST",
				headers: { Authorization: "Bearer client-key" }
			}),
			{ OPENAI_API_KEY: "client-key" } as Env
		);

		expect(await response.json()).toEqual({ reached: true });
	});

	it("protects the Ollama tags route with the same rejection response", async () => {
		const response = await ollama.fetch(new Request("https://gateway.test/tags"), {
			OPENAI_API_KEY: "client-key"
		} as Env);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: { message: "Unauthorized" } });
	});

	it.each([
		[openai, "POST", "/v1/chat/completions"],
		[openai, "POST", "/v1/completions"],
		[responses, "POST", "/v1/responses"],
		[openai, "GET", "/v1/models"],
		[openai, "GET", "/v1/model-presets"],
		[ollama, "POST", "/chat"],
		[ollama, "POST", "/show"],
		[ollama, "GET", "/tags"]
	] as const)("protects public route %s %s", async (router, method, path) => {
		const response = await router.fetch(new Request(`https://gateway.test${path}`, { method }), {
			OPENAI_API_KEY: "client-key"
		} as Env);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: { message: "Unauthorized" } });
	});
});
