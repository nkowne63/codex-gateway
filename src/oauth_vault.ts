import type { Env, TokenData } from "./types";

const KEY = "credential";
type VaultRecord = { tokens: TokenData; lastRefresh: string | null; expiresAt: string | null };

async function keyFrom(env: Env): Promise<CryptoKey> {
	if (!env.OAUTH_VAULT_KEY) throw new Error("oauth vault key is not configured");
	const raw = Uint8Array.from(atob(env.OAUTH_VAULT_KEY), (c) => c.charCodeAt(0));
	if (raw.byteLength !== 32) throw new Error("oauth vault key must be 32 bytes");
	return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function seal(env: Env, value: VaultRecord): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFrom(env), new TextEncoder().encode(JSON.stringify(value))));
	const output = new Uint8Array(iv.length + ciphertext.length);
	output.set(iv);
	output.set(ciphertext, iv.length);
	return `v1:${btoa(String.fromCharCode(...output))}`;
}

async function open(env: Env, encoded: string): Promise<VaultRecord> {
	if (!encoded.startsWith("v1:")) throw new Error("unsupported vault record version");
	const bytes = Uint8Array.from(atob(encoded.slice(3)), (c) => c.charCodeAt(0));
	const value = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, await keyFrom(env), bytes.slice(12));
	return JSON.parse(new TextDecoder().decode(value)) as VaultRecord;
}

export class OAuthVault {
	constructor(private readonly state: DurableObjectState, private readonly env: Env) {}

	async fetch(request: Request): Promise<Response> {
		if (request.method === "GET") {
			const stored = await this.state.storage.get<string>(KEY);
			if (!stored) return Response.json({ found: false });
			try {
				return Response.json({ found: true, value: await open(this.env, stored) });
			} catch {
				return Response.json({ found: false }, { status: 503 });
			}
		}
		if (request.method !== "PUT") return new Response("Method Not Allowed", { status: 405 });
		try {
			await this.state.storage.put(KEY, await seal(this.env, (await request.json()) as VaultRecord));
			return new Response(null, { status: 204 });
		} catch {
			return Response.json({ error: "vault_unavailable" }, { status: 503 });
		}
	}
}

export async function vaultGet(env: Env): Promise<VaultRecord | null> {
	if (!env.OAUTH_VAULT) return null;
	const stub = env.OAUTH_VAULT.get(env.OAUTH_VAULT.idFromName("default"));
	const response = await stub.fetch("https://oauth-vault.internal/credential");
	if (!response.ok) return null;
	const body = (await response.json()) as { found: boolean; value?: VaultRecord };
	return body.found ? body.value || null : null;
}

export async function vaultPut(env: Env, value: VaultRecord): Promise<boolean> {
	if (!env.OAUTH_VAULT) return false;
	const stub = env.OAUTH_VAULT.get(env.OAUTH_VAULT.idFromName("default"));
	const response = await stub.fetch("https://oauth-vault.internal/credential", { method: "PUT", body: JSON.stringify(value) });
	return response.ok;
}
