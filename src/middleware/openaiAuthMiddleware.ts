import { Context, Next } from "hono";
import { Env } from "../types";

/**
 * Gateway bearer-token authentication middleware.
 * Validates that requests include the dedicated gateway token.
 * The alternate header is preferred so Cloudflare Access can use Authorization independently.
 */
export function openaiAuthMiddleware() {
	return async (c: Context<{ Bindings: Env }>, next: Next) => {
		const authHeader = c.req.header("X-Gateway-Authorization") ?? c.req.header("Authorization");
		const configuredKey = c.env.GATEWAY_BEARER_TOKEN;
		const providedKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
		if (configuredKey && providedKey && providedKey === configuredKey) {
			return next();
		}

		const accessClientId = c.req.header("CF-Access-Client-Id");
		const accessClientSecret = c.req.header("CF-Access-Client-Secret");
		if (
			accessClientId && accessClientSecret &&
			c.env.ACCESS_SERVICE_TOKEN_CLIENT_ID && c.env.ACCESS_SERVICE_TOKEN_CLIENT_SECRET &&
			accessClientId === c.env.ACCESS_SERVICE_TOKEN_CLIENT_ID &&
			accessClientSecret === c.env.ACCESS_SERVICE_TOKEN_CLIENT_SECRET
		) {
			return next();
		}

		if (await verifyAccessAssertion(c.req.header("Cf-Access-Jwt-Assertion"), c.req.path, c.env)) {
			return next();
		}

		return c.json({ error: { message: "Unauthorized" } }, 401);
	};
}

type AccessClaims = { iss?: unknown; aud?: unknown; exp?: unknown; type?: unknown; common_name?: unknown };
type AccessCerts = { keys?: Array<JsonWebKey & { kid?: string; alg?: string; kty?: string }> };
const certCache = new Map<string, { expires: number; keys: AccessCerts["keys"] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function accessIssuer(domain: string | undefined): string | undefined {
	if (!domain) return undefined;
	try {
		const url = new URL(domain.includes("://") ? domain : `https://${domain}`);
		if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" && url.pathname !== "") return undefined;
		return `https://${url.hostname}${url.port ? `:${url.port}` : ""}`;
	} catch { return undefined; }
}

async function verifyAccessAssertion(assertion: string | undefined, path: string, env: Env): Promise<boolean> {
	const issuer = accessIssuer(env.ACCESS_TEAM_DOMAIN);
	const audience = path.startsWith("/api/") ? env.ACCESS_AUDIENCE_API ?? env.ACCESS_AUDIENCE : env.ACCESS_AUDIENCE_V1 ?? env.ACCESS_AUDIENCE;
	if (!assertion || !issuer || !audience) return false;
	const parts = assertion.split(".");
	if (parts.length !== 3) return false;
	try {
		const base64url = (value: string) => value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
		const decode = (value: string) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64url(value)), (ch) => ch.charCodeAt(0))));
		const header = decode(parts[0]) as { alg?: unknown; kid?: unknown };
		const claims = decode(parts[1]) as AccessClaims;
		if (header.alg !== "RS256" || typeof header.kid !== "string" || claims.iss !== issuer || claims.type !== "app" || typeof claims.common_name !== "string" || !claims.common_name) return false;
		const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
		if (!audiences.includes(audience) || typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return false;
		let keys = certCache.get(issuer);
		if (!keys || keys.expires <= Date.now()) {
			const response = await fetch(`${issuer}/cdn-cgi/access/certs`);
			if (!response.ok) return false;
			const body = await response.json() as AccessCerts;
			if (!Array.isArray(body.keys)) return false;
			keys = { expires: Date.now() + CACHE_TTL_MS, keys: body.keys };
			certCache.set(issuer, keys);
		}
		const jwk = keys.keys?.find((key) => key.kid === header.kid && key.alg === "RS256" && key.kty === "RSA");
		if (!jwk) return false;
		const cryptoKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
		const bytes = (value: string) => Uint8Array.from(atob(base64url(value)), (ch) => ch.charCodeAt(0));
		return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, bytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
	} catch { return false; }
}
