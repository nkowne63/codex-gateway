import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { openaiAuthMiddleware } from "../src/middleware/openaiAuthMiddleware";
import ollama from "../src/routes/ollama";
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
		const response = await ollama.fetch(
			new Request("https://gateway.test/tags"),
			{ OPENAI_API_KEY: "client-key" } as Env
		);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: { message: "Unauthorized" } });
	});
});
