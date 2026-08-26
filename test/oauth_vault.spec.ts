import { describe, expect, it } from "vitest";
import { OAuthVault } from "../src/oauth_vault";
import type { Env } from "../src/types";

function state() {
	const values = new Map<string, unknown>();
	return {
		storage: {
			get: async <T>(key: string) => values.get(key) as T | undefined,
			put: async (key: string, value: unknown) => void values.set(key, value)
		}
	} as unknown as DurableObjectState;
}

describe("OAuthVault", () => {
	it("encrypts credentials at rest and returns them only through the vault", async () => {
		const runtime = state();
		const env = { OAUTH_VAULT_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(7))) } as Env;
		const vault = new OAuthVault(runtime, env);
		const credential = { tokens: { access_token: "oauth-secret", refresh_token: "refresh-secret" }, lastRefresh: null, expiresAt: null };
		const put = await vault.fetch(new Request("https://vault", { method: "PUT", body: JSON.stringify(credential) }));
		expect(put.status).toBe(204);
		const stored = await runtime.storage.get<string>("credential");
		expect(stored).toBeTruthy();
		expect(stored).not.toContain("oauth-secret");
		expect(stored).not.toContain("refresh-secret");
		const get = await vault.fetch(new Request("https://vault"));
		expect(await get.json()).toEqual({ found: true, value: credential });
	});

	it("stores a versioned encrypted record", async () => {
		const runtime = state();
		const env = { OAUTH_VAULT_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(8))) } as Env;
		const vault = new OAuthVault(runtime, env);
		await vault.fetch(new Request("https://vault", { method: "PUT", body: JSON.stringify({ tokens: { access_token: "a" }, lastRefresh: null, expiresAt: null }) }));
		const stored = await runtime.storage.get<string>("credential");
		expect(stored).toMatch(/^v1:/);
	});
});
