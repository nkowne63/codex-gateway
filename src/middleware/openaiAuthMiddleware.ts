import { Context, Next } from "hono";
import { Env } from "../types";

/**
 * OpenAI API Key Authentication Middleware
 * Validates that requests include a valid OpenAI API key in the Authorization header
 */
export function openaiAuthMiddleware() {
	return async (c: Context<{ Bindings: Env }>, next: Next) => {
		const authHeader = c.req.header("Authorization");
		const configuredKey = c.env.OPENAI_API_KEY;
		const providedKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
		if (!configuredKey || !providedKey || providedKey !== configuredKey) {
			return c.json({ error: { message: "Unauthorized" } }, 401);
		}
		return next();
	};
}
