import { Context, Next } from "hono";
import { Env } from "../types";

/**
 * Gateway bearer-token authentication middleware.
 * Validates that requests include the dedicated gateway token in the Authorization header.
 */
export function openaiAuthMiddleware() {
	return async (c: Context<{ Bindings: Env }>, next: Next) => {
		const authHeader = c.req.header("Authorization");
		const configuredKey = c.env.GATEWAY_BEARER_TOKEN;
		const providedKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
		if (!configuredKey || !providedKey || providedKey !== configuredKey) {
			return c.json({ error: { message: "Unauthorized" } }, 401);
		}
		return next();
	};
}
