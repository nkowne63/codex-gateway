import { Hono } from "hono";
import { cors } from "hono/cors";
import openai from "./routes/openai"; // Import the openai router
import ollama from "./routes/ollama"; // Import the ollama router
import responses from "./routes/responses";
import { createOAuthLoginApp } from "./oauth_login";
import { createOAuthLoginPage } from "./oauth_login_page";
import type { Env } from "./types";
export { AuthRefreshCoordinator } from "./auth_refresh_coordinator";
export { OAuthLoginCoordinator } from "./oauth_login_coordinator";

const app = new Hono<{ Bindings: Env }>();

app.use(
	"*",
	cors({
		origin: "*", // Or specify allowed origins
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"OpenAI-Beta",
			"chatgpt-account-id",
			"Prompt-Cache-Key",
			"X-Prompt-Cache-Key",
			"Conversation-Id",
			"X-Conversation-Id",
			"Session-Id",
			"X-Session-Id",
			"Request-Id",
			"X-Request-Id"
		],
		allowMethods: ["POST", "GET", "OPTIONS"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		maxAge: 600,
		credentials: true
	})
);

app.get("/", (c) => c.json({ status: "ok" }));

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/oauth/login", createOAuthLoginPage({ callbackEndpoint: "/oauth/callback" }));
app.route("/", createOAuthLoginApp());

app.route("/", openai); // Mount the OpenAI routes under /v1
app.route("/", responses);
app.route("/api", ollama); // Mount the Ollama routes under /api

export default app;
