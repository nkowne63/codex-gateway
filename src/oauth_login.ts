import { Hono } from "hono";
import { projectToKv } from "./auth_store";
import { vaultGet } from "./oauth_vault";
import type { Env, TokenData } from "./types";

export const OAUTH_CALLBACK_URI = "http://localhost:1455/auth/callback";
const AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const STATE_TTL_SECONDS = 600;

export type OAuthEnv = Env & { GATEWAY_BEARER_TOKEN?: string };
export type OAuthLoginOptions = {
	now?: () => number;
	random?: (length: number) => Uint8Array;
	fetch?: typeof fetch;
	verifyGatewayToken?: (token: string, env: OAuthEnv) => boolean | Promise<boolean>;
	stateTtlSeconds?: number;
};

type StateRecord = { verifier: string; createdAt: number };
type TokenExchange = { access_token?: unknown; refresh_token?: unknown; id_token?: unknown; expires_in?: unknown };

function bytes(length: number): Uint8Array {
	const output = new Uint8Array(length);
	crypto.getRandomValues(output);
	return output;
}

function base64Url(value: Uint8Array): string {
	let binary = "";
	for (const byte of value) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function challenge(verifier: string): Promise<string> {
	return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

function tokenFromRequest(request: Request): string | null {
	const value = request.headers.get("Authorization");
	return value?.startsWith("Bearer ") && value.length > 7 ? value.slice(7) : null;
}

async function authorized(c: { req: { raw: Request }; env: OAuthEnv }, options: OAuthLoginOptions): Promise<boolean> {
	const token = tokenFromRequest(c.req.raw);
	if (!token) return false;
	if (options.verifyGatewayToken) return Boolean(await options.verifyGatewayToken(token, c.env));
	return Boolean(c.env.GATEWAY_BEARER_TOKEN && token === c.env.GATEWAY_BEARER_TOKEN);
}

async function requestFields(request: Request): Promise<{ callbackUrl: string | null; auth?: unknown }> {
	const contentType = request.headers.get("Content-Type") || "";
	if (contentType.includes("application/json")) {
		try {
			const body = (await request.json()) as { callback_url?: unknown; url?: unknown; auth?: unknown };
			const value = body.callback_url ?? body.url;
			return { callbackUrl: typeof value === "string" ? value : null, auth: body.auth };
		} catch {
			return { callbackUrl: null };
		}
	}
	if (contentType.includes("application/x-www-form-urlencoded")) {
		const body = await request.text();
		const params = new URLSearchParams(body);
		return { callbackUrl: params.get("callback_url") || params.get("url") };
	}
	return { callbackUrl: null };
}

function callbackParams(raw: string): URLSearchParams | null {
	try {
		const url = new URL(raw);
		if (
			url.protocol !== "http:" ||
			url.hostname !== "localhost" ||
			url.port !== "1455" ||
			url.pathname !== "/auth/callback" ||
			url.username ||
			url.password ||
			url.hash
		)
			return null;
		const allowed = new Set(["code", "state", "error", "error_description", "error_uri"]);
		const seen = new Set<string>();
		for (const key of url.searchParams.keys()) {
			if (!allowed.has(key) || seen.has(key)) return null;
			seen.add(key);
		}
		return url.searchParams;
	} catch {
		return null;
	}
}

export function createOAuthLoginApp(options: OAuthLoginOptions = {}) {
	const app = new Hono<{ Bindings: OAuthEnv }>();
	const now = options.now || Date.now;
	const random = options.random || bytes;
	const fetcher = options.fetch || fetch;
	const ttl = options.stateTtlSeconds || STATE_TTL_SECONDS;

	app.get("/oauth/login/url", async (c) => {
		if (!(await authorized(c, options))) return c.json({ error: "unauthorized" }, 401);
		if (!c.env.OAUTH_LOGIN_COORDINATOR) return c.json({ error: "oauth_unavailable" }, 503);
		const state = base64Url(random(32));
		const verifier = base64Url(random(32));
		const stateStub = c.env.OAUTH_LOGIN_COORDINATOR.get(c.env.OAUTH_LOGIN_COORDINATOR.idFromName(`oauth:${state}`));
		const stored = await stateStub.fetch("https://oauth-login.internal/state", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ operation: "create", verifier, createdAt: now(), ttlSeconds: ttl })
		});
		if (!stored.ok) return c.json({ error: "oauth_unavailable" }, 503);
		const url = new URL(AUTHORIZE_URL);
		url.search = new URLSearchParams({
			client_id: c.env.CHATGPT_LOCAL_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
			redirect_uri: OAUTH_CALLBACK_URI,
			response_type: "code",
			scope: "openid profile email",
			state,
			code_challenge: await challenge(verifier),
			code_challenge_method: "S256"
		}).toString();
		return c.json({ authorization_url: url.toString() });
	});

	app.post("/oauth/callback", async (c) => {
		if (!(await authorized(c, options))) return c.json({ error: "unauthorized" }, 401);
		const { callbackUrl } = await requestFields(c.req.raw);
		const params = callbackUrl ? callbackParams(callbackUrl) : null;
		const state = params?.get("state");
		const code = params?.get("code");
		if (!params || !state || (!code && !params.get("error"))) return c.json({ error: "invalid_callback" }, 400);
		if (!c.env.OAUTH_LOGIN_COORDINATOR) return c.json({ error: "oauth_unavailable" }, 503);
		const stateStub = c.env.OAUTH_LOGIN_COORDINATOR.get(c.env.OAUTH_LOGIN_COORDINATOR.idFromName(`oauth:${state}`));
		const claimed = await stateStub.fetch("https://oauth-login.internal/state", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ operation: "claim" })
		});
		if (!claimed.ok) return c.json({ error: "invalid_state" }, 400);
		const record = (await claimed.json()) as StateRecord;
		if (!code) return c.json({ error: "authorization_denied" }, 400);
		const response = await fetcher(TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				client_id: c.env.CHATGPT_LOCAL_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
				grant_type: "authorization_code",
				code,
				redirect_uri: OAUTH_CALLBACK_URI,
				code_verifier: record.verifier
			})
		});
		if (!response.ok) return c.json({ error: "oauth_exchange_failed" }, 502);
		const exchanged = (await response.json()) as TokenExchange;
		if (typeof exchanged.access_token !== "string" || !exchanged.access_token)
			return c.json({ error: "oauth_exchange_failed" }, 502);
		const tokens: TokenData = { access_token: exchanged.access_token };
		if (typeof exchanged.refresh_token === "string") tokens.refresh_token = exchanged.refresh_token;
		if (typeof exchanged.id_token === "string") tokens.id_token = exchanged.id_token;
		const expiresAt =
			typeof exchanged.expires_in === "number" && exchanged.expires_in > 0
				? new Date(now() + exchanged.expires_in * 1000).toISOString()
				: null;
		await projectToKv(c.env, { tokens, lastRefresh: new Date(now()).toISOString(), expiresAt }, now());
		return c.json({ status: "ok" });
	});

	app.post("/oauth/bootstrap", async (c) => {
		if (!(await authorized(c, options))) return c.json({ error: "unauthorized" }, 401);
		if (c.env.OAUTH_BOOTSTRAP_ENABLED !== "true") return c.json({ error: "oauth_disabled" }, 410);
		if (!c.env.OAUTH_VAULT || !c.env.OAUTH_VAULT_KEY) return c.json({ error: "oauth_unavailable" }, 503);
		if (await vaultGet(c.env)) return c.json({ error: "bootstrap_already_complete" }, 409);
		let input: any;
		try { input = await c.req.json(); } catch { return c.json({ error: "invalid_request" }, 400); }
		const tokens = input?.auth?.tokens;
		if (!tokens || typeof tokens.access_token !== "string" || !tokens.access_token ||
			(tokens.refresh_token !== undefined && typeof tokens.refresh_token !== "string") ||
			(tokens.id_token !== undefined && typeof tokens.id_token !== "string") ||
			(tokens.account_id !== undefined && typeof tokens.account_id !== "string"))
			return c.json({ error: "invalid_request" }, 400);
		await projectToKv(c.env, { tokens, lastRefresh: new Date().toISOString(), expiresAt: null }, Date.now());
		return c.json({ status: "ok" });
	});

	return app;
}
