import { AuthDotJson, TokenData, RefreshRequest, RefreshResponse, Env } from "./types";

const AUTH_TOKENS_KEY = "auth_tokens";
const AUTH_LAST_REFRESH_KEY = "auth_last_refresh";
const AUTH_EXPIRES_AT_KEY = "auth_expires_at";
const REFRESH_INTERVAL_MS = 28 * 24 * 60 * 60 * 1000;
const EXPIRY_SKEW_MS = 60 * 1000;

type StoredAuth = { tokens: TokenData; lastRefresh: string | null; expiresAt: string | null };
export type EffectiveAuth = { accessToken: string | null; accountId: string | null };
export type RefreshCoordinationRequest = { accountKey: string; now: number; force: boolean; observed: string };

const refreshesInFlight = new Map<string, Promise<TokenData | null>>();
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
		(tokens.refresh_token === undefined ||
			(typeof tokens.refresh_token === "string" && tokens.refresh_token.length > 0)) &&
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
		return {
			tokens: auth.tokens,
			lastRefresh: validIsoDate(auth.last_refresh),
			expiresAt: validIsoDate(auth.expires_at)
		};
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
	if (fallback && env.KV && seedFallback) await persistAuth(env, fallback, Date.now());
	return fallback;
}

async function persistAuth(env: Env, auth: StoredAuth, now: number): Promise<void> {
	if (!env.KV) return;
	await env.KV.put(AUTH_TOKENS_KEY, JSON.stringify(auth.tokens));
	await env.KV.put(AUTH_LAST_REFRESH_KEY, auth.lastRefresh || new Date(now).toISOString());
	if (auth.expiresAt) await env.KV.put(AUTH_EXPIRES_AT_KEY, auth.expiresAt);
	else await env.KV.delete(AUTH_EXPIRES_AT_KEY);
}

function needsRefresh(auth: StoredAuth, now: number): boolean {
	if (auth.expiresAt) return Date.parse(auth.expiresAt) <= now + EXPIRY_SKEW_MS;
	return !auth.lastRefresh || Date.parse(auth.lastRefresh) <= now - REFRESH_INTERVAL_MS;
}

function accountIdFor(tokens: TokenData): string | null {
	if (tokens.account_id) return tokens.account_id;
	return tokens.id_token
		? parseJwtClaims(tokens.id_token)?.["https://api.openai.com/auth"]?.chatgpt_account_id || null
		: null;
}

function fingerprint(auth: StoredAuth): string {
	return JSON.stringify([auth.tokens, auth.lastRefresh, auth.expiresAt]);
}

async function accountKeyFor(tokens: TokenData): Promise<string> {
	const accountId = accountIdFor(tokens);
	if (accountId) return `account:${accountId}`;
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(tokens.refresh_token || tokens.access_token)
	);
	return `token:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function effective(tokens: TokenData | null): EffectiveAuth {
	return tokens
		? { accessToken: tokens.access_token, accountId: accountIdFor(tokens) }
		: { accessToken: null, accountId: null };
}

export async function refreshSerialized(env: Env, request: RefreshCoordinationRequest): Promise<TokenData | null> {
	const source = await loadStoredAuth(env, true);
	if (!source) return null;
	if (request.force && fingerprint(source) !== request.observed) return source.tokens;
	if (!request.force && !needsRefresh(source, request.now)) return source.tokens;
	if (!source.tokens.refresh_token) {
		logAuthError("OAuth refresh is unavailable because no refresh token is configured");
		return null;
	}
	const body: RefreshRequest = {
		client_id: env.CHATGPT_LOCAL_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
		grant_type: "refresh_token",
		refresh_token: source.tokens.refresh_token,
		scope: "openid profile email"
	};
	try {
		const response = await fetch("https://auth.openai.com/oauth/token", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
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
		if (current && fingerprint(current) !== fingerprint(source)) return current.tokens;
		const updated: StoredAuth = {
			tokens: {
				id_token: typeof refreshed.id_token === "string" ? refreshed.id_token : source.tokens.id_token,
				access_token: refreshed.access_token,
				refresh_token:
					typeof refreshed.refresh_token === "string" && refreshed.refresh_token.length > 0
						? refreshed.refresh_token
						: source.tokens.refresh_token,
				account_id: source.tokens.account_id
			},
			lastRefresh: new Date(request.now).toISOString(),
			expiresAt:
				typeof refreshed.expires_in === "number" && Number.isFinite(refreshed.expires_in) && refreshed.expires_in > 0
					? new Date(request.now + refreshed.expires_in * 1000).toISOString()
					: null
		};
		await persistAuth(env, updated, request.now);
		return updated.tokens;
	} catch {
		logAuthError("OAuth refresh request threw an exception");
		return null;
	}
}

async function coordinateRefresh(env: Env, source: StoredAuth, now: number, force: boolean): Promise<TokenData | null> {
	const accountKey = await accountKeyFor(source.tokens);
	const existing = refreshesInFlight.get(accountKey);
	if (existing) return existing;
	const request: RefreshCoordinationRequest = { accountKey, now, force, observed: fingerprint(source) };
	const operation = (async () => {
		if (!env.AUTH_REFRESH_COORDINATOR) return refreshSerialized(env, request);
		const id = env.AUTH_REFRESH_COORDINATOR.idFromName(accountKey);
		const response = await env.AUTH_REFRESH_COORDINATOR.get(id).fetch("https://auth-refresh.internal/refresh", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(request)
		});
		if (!response.ok) return null;
		const value: unknown = await response.json();
		return isTokenData(value) ? value : null;
	})();
	refreshesInFlight.set(accountKey, operation);
	try {
		return await operation;
	} finally {
		if (refreshesInFlight.get(accountKey) === operation) refreshesInFlight.delete(accountKey);
	}
}

export const AuthStore = {
	async getFresh(env: Env, now: number): Promise<EffectiveAuth> {
		const source = await loadStoredAuth(env, true);
		if (!source) return effective(null);
		if (!needsRefresh(source, now)) return effective(source.tokens);
		return effective((await coordinateRefresh(env, source, now, false)) || source.tokens);
	},
	async refresh(env: Env, now: number): Promise<EffectiveAuth> {
		const source = await loadStoredAuth(env, true);
		if (!source) return effective(null);
		return effective((await coordinateRefresh(env, source, now, true)) || source.tokens);
	}
};

export async function getEffectiveChatgptAuth(env: Env): Promise<EffectiveAuth> {
	const auth = await loadStoredAuth(env, true);
	return effective(auth?.tokens || null);
}

export async function refreshAccessToken(env: Env): Promise<TokenData | null> {
	const source = await loadStoredAuth(env, true);
	return source ? coordinateRefresh(env, source, Date.now(), true) : null;
}

export async function getRefreshedAuth(env: Env): Promise<EffectiveAuth> {
	return AuthStore.getFresh(env, Date.now());
}
