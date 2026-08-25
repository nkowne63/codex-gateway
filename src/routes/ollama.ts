import { Hono } from "hono";
import { Env } from "../types";
import { openaiAuthMiddleware } from "../middleware/openaiAuthMiddleware";

const ollama = new Hono<{ Bindings: Env }>();

// Compatibility surface only: never forward to a local backend.
ollama.use("*", openaiAuthMiddleware(), async (c) =>
	c.json({ error: { message: "Ollama/local backend is disabled" } }, 410)
);

export default ollama;
