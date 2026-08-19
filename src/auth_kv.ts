import {
	AuthStore,
	accountKeyFor,
	authFingerprint,
	loadBootstrap,
	needsRefresh,
	projectToKv,
	requestRefresh
} from "./auth_store";
import type { Env, TokenData } from "./types";

export { AuthStore } from "./auth_store";
export type { CodexAuth, RefreshCoordinationRequest, StoredAuth } from "./auth_store";

export async function refreshSerialized(
	env: Env,
	request: { now: number; force: boolean; observed?: string }
): Promise<TokenData | null> {
	const source = await loadBootstrap(env, request.now);
	if (!source) return null;
	if (request.force && request.observed && authFingerprint(source) !== request.observed) return source.tokens;
	if (!request.force && !needsRefresh(source, request.now)) return source.tokens;
	const updated = await requestRefresh(env, source, request.now, await accountKeyFor(source.tokens));
	if (!updated) return null;
	const current = await loadBootstrap(env, request.now, false);
	if (current && authFingerprint(current) !== authFingerprint(source)) return current.tokens;
	await projectToKv(env, updated, request.now);
	return updated.tokens;
}

export async function getEffectiveChatgptAuth(env: Env) {
	const auth = await AuthStore.get(env);
	return { accessToken: auth.accessToken, accountId: auth.accountId };
}

export async function refreshAccessToken(env: Env): Promise<TokenData | null> {
	if (!env.AUTH_REFRESH_COORDINATOR) {
		const source = await loadBootstrap(env, Date.now());
		return source ? refreshSerialized(env, { now: Date.now(), force: true, observed: authFingerprint(source) }) : null;
	}
	const auth = await AuthStore.refresh(env, Date.now());
	return auth.accessToken ? auth.tokens : null;
}

export async function getRefreshedAuth(env: Env) {
	const auth = await AuthStore.getFresh(env, Date.now());
	return { accessToken: auth.accessToken, accountId: auth.accountId };
}
