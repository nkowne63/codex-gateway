import { AuthDotJson, TokenData, RefreshRequest, RefreshResponse, Env } from "./types";

const AUTH_TOKENS_KEY = "auth_tokens";
const AUTH_LAST_REFRESH_KEY = "auth_last_refresh";
const AUTH_EXPIRES_AT_KEY = "auth_expires_at";
const REFRESH_INTERVAL_MS = 28 * 24 * 60 * 60 * 1000;
const EXPIRY_SKEW_MS = 60 * 1000;

type StoredAuth = { tokens: TokenData; lastRefresh: string | null; expiresAt: string | null };

let refreshInFlight: Promise<TokenData | null> | null = null;

type JwtClaims = { "https://api.openai.com/auth"?: { chatgpt_account_id?: string } } & Record<string, unknown>;

function logAuthError(message: string, status?: number): void {
	console.error(status === undefined ? message : `${message} (status ${status})`);
}

function urlBase64Decode(input: string): string {
	input = input.replace(/-/g, "+").replace(/_/g, "/");
	const pad = input.length % 4;
	if (pad) input += new Array(5 - pad).join("=");
	return atob(input);
}

function parseJwtClaims(token: string): JwtClaims | null {
	if (!token || token.split(".").length !== 3) return null;
	try {
		return JSON.parse(urlBase64Decode(token.split(".")[1]));
	} catch {
		logAuthError("Unable to parse OAuth ID token claims");
		return null;
	}
}

function isTokenData(value: unknown): value is TokenData {
	if (!value || typeof value !== "object") return false;
	const tokens = value as Partial<TokenData>;
	return (
		typeof tokens.access_token === "string" &&
		tokens.access_token.length > 0 &&
		(tokens.refresh_token === undefined || (typeof tokens.refresh_token === "string" && tokens.refresh_token.length > 0)) &&
		(tokens.id_token === undefined || typeof tokens.id_token === "string")
	);
}

function validIsoDate(value: unknown): string | null {
	return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function getFallbackAuth(env: Env): StoredAuth | null {
	if (!env.OPENAI_CODEX_AUTH) return null;
	try {
		const auth = JSON.parse(env.OPENAI_CODEX_AUTH) as AuthDotJson;
		if (!isTokenData(auth.tokens)) {
			logAuthError("OPENAI_CODEX_AUTH does not contain valid OAuth tokens");
			return null;
		}
		return { tokens: auth.tokens, lastRefresh: validIsoDate(auth.last_refresh), expiresAt: validIsoDate(auth.expires_at) };
	} catch {
		logAuthError("Unable to parse OPENAI_CODEX_AUTH");
		return null;
	}
}

async function loadStoredAuth(env: Env, seedFallback: boolean): Promise<StoredAuth | null> {
	if (env.KV) {
		try {
			const tokens = await env.KV.get(AUTH_TOKENS_KEY, "json");
			if (isTokenData(tokens)) {
				return {
					tokens,
					lastRefresh: validIsoDate(await env.KV.get(AUTH_LAST_REFRESH_KEY)),
					expiresAt: validIsoDate(await env.KV.get(AUTH_EXPIRES_AT_KEY))
				};
			}
		} catch {
			logAuthError("Unable to read persisted OAuth credentials");
		}
	}

	const fallback = getFallbackAuth(env);
	if (fallback && env.KV && seedFallback) await persistAuth(env, fallback);
	return fallback;
}

async function persistAuth(env: Env, auth: StoredAuth): Promise<void> {
	if (!env.KV) return;
	await env.KV.put(AUTH_TOKENS_KEY, JSON.stringify(auth.tokens));
	await env.KV.put(AUTH_LAST_REFRESH_KEY, auth.lastRefresh || new Date().toISOString());
	if (auth.expiresAt) await env.KV.put(AUTH_EXPIRES_AT_KEY, auth.expiresAt);
}

function needsRefresh(auth: StoredAuth): boolean {
	if (auth.expiresAt) return Date.parse(auth.expiresAt) <= Date.now() + EXPIRY_SKEW_MS;
	return !auth.lastRefresh || Date.parse(auth.lastRefresh) <= Date.now() - REFRESH_INTERVAL_MS;
}

function accountIdFor(tokens: TokenData): string | null {
	if (tokens.account_id) return tokens.account_id;
	return tokens.id_token ? parseJwtClaims(tokens.id_token)?.["https://api.openai.com/auth"]?.chatgpt_account_id || null : null;
}

export async function getEffectiveChatgptAuth(env: Env): Promise<{ accessToken: string | null; accountId: string | null }> {
	const auth = await loadStoredAuth(env, true);
	return auth ? { accessToken: auth.tokens.access_token, accountId: accountIdFor(auth.tokens) } : { accessToken: null, accountId: null };
}

async function refreshStoredAuth(env: Env): Promise<TokenData | null> {
	const source = await loadStoredAuth(env, true);
	if (!source) return null;
	if (!source.tokens.refresh_token) {
		logAuthError("OAuth refresh is unavailable because no refresh token is configured");
		return null;
	}

	const request: RefreshRequest = {
		client_id: env.CHATGPT_LOCAL_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
		grant_type: "refresh_token",
		refresh_token: source.tokens.refresh_token,
		scope: "openid profile email"
	};

	try {
		const response = await fetch("https://auth.openai.com/oauth/token", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(request)
		});
		if (!response.ok) {
			logAuthError("OAuth refresh request failed", response.status);
			return null;
		}

		let refreshed: RefreshResponse;
		try {
			refreshed = (await response.json()) as RefreshResponse;
		} catch {
			logAuthError("OAuth refresh response was not valid JSON");
			return null;
		}
		if (typeof refreshed.access_token !== "string" || refreshed.access_token.length === 0) {
			logAuthError("OAuth refresh response did not include an access token");
			return null;
		}

		const current = await loadStoredAuth(env, false);
		if (
			current &&
			(JSON.stringify(current.tokens) !== JSON.stringify(source.tokens) ||
				current.lastRefresh !== source.lastRefresh ||
				current.expiresAt !== source.expiresAt)
		) {
			return current.tokens;
		}

		const expiresAt =
			typeof refreshed.expires_in === "number" && Number.isFinite(refreshed.expires_in) && refreshed.expires_in > 0
				? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
				: null;
		const updated: StoredAuth = {
			tokens: {
				id_token: typeof refreshed.id_token === "string" ? refreshed.id_token : source.tokens.id_token,
				access_token: refreshed.access_token,
				refresh_token: typeof refreshed.refresh_token === "string" && refreshed.refresh_token.length > 0 ? refreshed.refresh_token : source.tokens.refresh_token,
				account_id: source.tokens.account_id
			},
			lastRefresh: new Date().toISOString(),
			expiresAt
		};
		await persistAuth(env, updated);
		return updated.tokens;
	} catch {
		logAuthError("OAuth refresh request threw an exception");
		return null;
	}
}

export async function refreshAccessToken(env: Env): Promise<TokenData | null> {
	if (!refreshInFlight) {
		refreshInFlight = refreshStoredAuth(env).finally(() => {
			refreshInFlight = null;
		});
	}
	return refreshInFlight;
}

export async function getRefreshedAuth(env: Env): Promise<{ accessToken: string | null; accountId: string | null }> {
	const auth = await loadStoredAuth(env, true);
	if (!auth) return { accessToken: null, accountId: null };
	if (!needsRefresh(auth)) return { accessToken: auth.tokens.access_token, accountId: accountIdFor(auth.tokens) };

	const refreshed = await refreshAccessToken(env);
	const tokens = refreshed || auth.tokens;
	return { accessToken: tokens.access_token, accountId: accountIdFor(tokens) };
}
