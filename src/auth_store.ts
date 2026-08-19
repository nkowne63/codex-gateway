import type { AuthDotJson, Env, RefreshRequest, RefreshResponse, TokenData } from "./types";

const AUTH_TOKENS_KEY = "auth_tokens";
const AUTH_LAST_REFRESH_KEY = "auth_last_refresh";
const AUTH_EXPIRES_AT_KEY = "auth_expires_at";
const REFRESH_INTERVAL_MS = 28 * 24 * 60 * 60 * 1000;
const EXPIRY_SKEW_MS = 60 * 1000;

export type StoredAuth = { tokens: TokenData; lastRefresh: string | null; expiresAt: string | null };
export type CodexAuth = StoredAuth & { accessToken: string | null; accountId: string | null; generation?: number };
export type RefreshCoordinationRequest = {
	operation?: "get" | "fresh" | "refresh";
	now: number;
	force: boolean;
	observedGeneration?: number;
	source: StoredAuth;
};
export type DurableCredential = { generation: number; fingerprint: string; auth: StoredAuth };

type InFlightOperation = {
	operation: "get" | "fresh" | "refresh";
	promise: Promise<DurableCredential | null>;
};
const refreshesInFlight = new Map<string, InFlightOperation>();
type JwtClaims = { "https://api.openai.com/auth"?: { chatgpt_account_id?: string } } & Record<string, unknown>;

export function logRefresh(account: string, errorClass: string, status?: number): void {
	const prefix = account.startsWith("account:") ? account.slice(8, 20) : account.slice(0, 12);
	console.error(
		`auth_refresh account=${prefix || "unknown"} error_class=${errorClass}${status ? ` status=${status}` : ""}`
	);
}

function decode(input: string): string {
	input = input.replace(/-/g, "+").replace(/_/g, "/");
	if (input.length % 4) input += "=".repeat(4 - (input.length % 4));
	return atob(input);
}

function accountIdFor(tokens: TokenData): string | null {
	if (tokens.account_id) return tokens.account_id;
	if (!tokens.id_token || tokens.id_token.split(".").length !== 3) return null;
	try {
		const claims = JSON.parse(decode(tokens.id_token.split(".")[1])) as JwtClaims;
		return claims["https://api.openai.com/auth"]?.chatgpt_account_id || null;
	} catch {
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

function validDate(value: unknown): string | null {
	return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function fallback(env: Env): StoredAuth | null {
	if (!env.OPENAI_CODEX_AUTH) return null;
	try {
		const auth = JSON.parse(env.OPENAI_CODEX_AUTH) as AuthDotJson;
		if (!isTokenData(auth.tokens)) return null;
		return { tokens: auth.tokens, lastRefresh: validDate(auth.last_refresh), expiresAt: validDate(auth.expires_at) };
	} catch {
		return null;
	}
}

export async function loadBootstrap(env: Env, now: number, seed = true): Promise<StoredAuth | null> {
	if (env.KV) {
		try {
			const tokens = await env.KV.get(AUTH_TOKENS_KEY, "json");
			if (isTokenData(tokens))
				return {
					tokens,
					lastRefresh: validDate(await env.KV.get(AUTH_LAST_REFRESH_KEY)),
					expiresAt: validDate(await env.KV.get(AUTH_EXPIRES_AT_KEY))
				};
		} catch {
			/* fall through */
		}
	}
	const source = fallback(env);
	if (source && env.KV && seed) {
		const seeded = { ...source, lastRefresh: source.lastRefresh || new Date(now).toISOString() };
		await projectToKv(env, seeded, now);
		return seeded;
	}
	return source;
}

export async function projectToKv(env: Env, auth: StoredAuth, now: number): Promise<void> {
	if (!env.KV) return;
	await env.KV.put(AUTH_TOKENS_KEY, JSON.stringify(auth.tokens));
	await env.KV.put(AUTH_LAST_REFRESH_KEY, auth.lastRefresh || new Date(now).toISOString());
	if (auth.expiresAt) await env.KV.put(AUTH_EXPIRES_AT_KEY, auth.expiresAt);
	else await env.KV.delete(AUTH_EXPIRES_AT_KEY);
}

export function authFingerprint(auth: StoredAuth): string {
	return JSON.stringify([auth.tokens, auth.lastRefresh, auth.expiresAt]);
}
export function needsRefresh(auth: StoredAuth, now: number): boolean {
	if (auth.expiresAt) return Date.parse(auth.expiresAt) <= now + EXPIRY_SKEW_MS;
	return !auth.lastRefresh || Date.parse(auth.lastRefresh) <= now - REFRESH_INTERVAL_MS;
}

export async function accountKeyFor(tokens: TokenData): Promise<string> {
	const account = accountIdFor(tokens);
	if (account) return `account:${account}`;
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(tokens.refresh_token || tokens.access_token)
	);
	return `token:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function requestRefresh(
	env: Env,
	source: StoredAuth,
	now: number,
	accountKey: string
): Promise<StoredAuth | null> {
	if (!source.tokens.refresh_token) {
		logRefresh(accountKey, "missing_refresh_token");
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
			logRefresh(accountKey, "oauth_http", response.status);
			return null;
		}
		let refreshed: RefreshResponse;
		try {
			refreshed = (await response.json()) as RefreshResponse;
		} catch {
			logRefresh(accountKey, "invalid_json");
			return null;
		}
		if (typeof refreshed.access_token !== "string" || !refreshed.access_token) {
			logRefresh(accountKey, "invalid_response");
			return null;
		}
		return {
			tokens: {
				id_token: typeof refreshed.id_token === "string" ? refreshed.id_token : source.tokens.id_token,
				access_token: refreshed.access_token,
				refresh_token:
					typeof refreshed.refresh_token === "string" && refreshed.refresh_token
						? refreshed.refresh_token
						: source.tokens.refresh_token,
				account_id: source.tokens.account_id
			},
			lastRefresh: new Date(now).toISOString(),
			expiresAt:
				typeof refreshed.expires_in === "number" && refreshed.expires_in > 0
					? new Date(now + refreshed.expires_in * 1000).toISOString()
					: null
		};
	} catch {
		logRefresh(accountKey, "network");
		return null;
	}
}

function codex(record: DurableCredential | null): CodexAuth {
	const auth = record?.auth;
	return {
		tokens: auth?.tokens || { access_token: "" },
		lastRefresh: auth?.lastRefresh || null,
		expiresAt: auth?.expiresAt || null,
		accessToken: auth?.tokens.access_token || null,
		accountId: auth ? accountIdFor(auth.tokens) : null,
		...(record ? { generation: record.generation } : {})
	};
}

async function coordinate(
	env: Env,
	source: StoredAuth,
	now: number,
	operation: "get" | "fresh" | "refresh"
): Promise<DurableCredential | null> {
	const accountKey = await accountKeyFor(source.tokens);
	const active = refreshesInFlight.get(accountKey);
	if (active) {
		if (operation !== "refresh" || active.operation === "refresh") return active.promise;
		await active.promise;
		const current = await loadBootstrap(env, now, false);
		return current ? coordinate(env, current, now, operation) : null;
	}
	const promise = (async () => {
		if (env.AUTH_REFRESH_COORDINATOR) {
			const stub = env.AUTH_REFRESH_COORDINATOR.get(env.AUTH_REFRESH_COORDINATOR.idFromName(accountKey));
			const response = await stub.fetch("https://auth-refresh.internal/credential", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					operation,
					now,
					force: operation === "refresh",
					source
				} satisfies RefreshCoordinationRequest)
			});
			if (!response.ok) return null;
			return (await response.json()) as DurableCredential;
		}
		const before = authFingerprint(source);
		const updated =
			operation === "get" || (operation === "fresh" && !needsRefresh(source, now))
				? source
				: await requestRefresh(env, source, now, accountKey);
		if (!updated) return { generation: 1, fingerprint: before, auth: source };
		const current = await loadBootstrap(env, now, false);
		if (current && authFingerprint(current) !== before)
			return { generation: 2, fingerprint: authFingerprint(current), auth: current };
		await projectToKv(env, updated, now);
		return { generation: 2, fingerprint: authFingerprint(updated), auth: updated };
	})();
	const inFlight = { operation, promise };
	refreshesInFlight.set(accountKey, inFlight);
	try {
		return await promise;
	} finally {
		if (refreshesInFlight.get(accountKey) === inFlight) refreshesInFlight.delete(accountKey);
	}
}

export const AuthStore = {
	async get(env: Env): Promise<CodexAuth> {
		const now = Date.now();
		const source = await loadBootstrap(env, now);
		return source ? codex(await coordinate(env, source, now, "get")) : codex(null);
	},
	async getFresh(env: Env, now: number): Promise<CodexAuth> {
		const source = await loadBootstrap(env, now);
		return source ? codex(await coordinate(env, source, now, "fresh")) : codex(null);
	},
	async refresh(env: Env, now: number): Promise<CodexAuth> {
		const source = await loadBootstrap(env, now);
		return source ? codex(await coordinate(env, source, now, "refresh")) : codex(null);
	}
};
