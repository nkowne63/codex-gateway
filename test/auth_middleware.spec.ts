import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { openaiAuthMiddleware } from "../src/middleware/openaiAuthMiddleware";
import ollama from "../src/routes/ollama";
import openai from "../src/routes/openai";
import responses from "../src/routes/responses";
import type { Env } from "../src/types";

function protectedApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.use("/protected", openaiAuthMiddleware());
	app.post("/protected", (c) => c.json({ reached: true }));
	return app;
}

describe("openaiAuthMiddleware", () => {
	const assertion = (claims: Record<string, unknown>) => `header.${btoa(JSON.stringify(claims)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.signature`;
	const encode = (value: ArrayBuffer | string) => {
		const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
		let binary = "";
		for (const byte of bytes) binary += String.fromCharCode(byte);
		return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	};
	const signedAccessAssertion = async (overrides: Record<string, unknown> = {}) => {
		const keyPair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
		const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
		const header = encode(JSON.stringify({ alg: "RS256", kid: "test-kid" }));
		const payload = encode(JSON.stringify({ iss: "https://team.example.com", aud: "audience", exp: Math.floor(Date.now() / 1000) + 300, type: "app", common_name: "service-client", ...overrides }));
		const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, new TextEncoder().encode(`${header}.${payload}`));
		return { token: `${header}.${payload}.${encode(signature)}`, jwk: { ...jwk, kid: "test-kid", alg: "RS256", kty: "RSA" } };
	};

	it("accepts a valid signed Cloudflare Access assertion", async () => {
		const { token, jwk } = await signedAccessAssertion();
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json" } });
		try {
			const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST", headers: { "Cf-Access-Jwt-Assertion": token } }), {
				GATEWAY_BEARER_TOKEN: "client-key", ACCESS_TEAM_DOMAIN: "team.example.com", ACCESS_AUDIENCE: "audience"
			} as Env);
			expect(response.status).toBe(200);
		} finally { globalThis.fetch = originalFetch; }
	});

	it.each([
		["tampered", { tamper: true }], ["issuer", { iss: "https://evil.example.com" }], ["audience", { aud: "wrong" }],
		["expired", { exp: Math.floor(Date.now() / 1000) - 1 }], ["type", { type: "user" }], ["common_name", { common_name: "" }]
	])("rejects invalid signed assertion: %s", async (_label, overrides) => {
		const { token, jwk } = await signedAccessAssertion(overrides.tamper ? {} : overrides);
		const invalid = overrides.tamper ? `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}` : token;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }));
		try {
			const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST", headers: { "Cf-Access-Jwt-Assertion": invalid } }), {
				GATEWAY_BEARER_TOKEN: "client-key", ACCESS_TEAM_DOMAIN: "team.example.com", ACCESS_AUDIENCE: "audience"
			} as Env);
			expect(response.status).toBe(401);
		} finally { globalThis.fetch = originalFetch; }
	});

	it("rejects a valid assertion when verification configuration is missing", async () => {
		const { token, jwk } = await signedAccessAssertion();
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }));
		try {
			const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST", headers: { "Cf-Access-Jwt-Assertion": token } }), { GATEWAY_BEARER_TOKEN: "client-key" } as Env);
			expect(response.status).toBe(401);
		} finally { globalThis.fetch = originalFetch; }
	});

	it("rejects a Cloudflare Access JWT payload without verified service-token headers", async () => {
		const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST",
			headers: { "Cf-Access-Jwt-Assertion": assertion({ type: "app", common_name: "service-client", sub: "" }) }
		}), { GATEWAY_BEARER_TOKEN: "client-key" } as Env);
		expect(response.status).toBe(401);
	});

	it("accepts matching Cloudflare service-token headers as a pair", async () => {
		const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST",
			headers: {
				"CF-Access-Client-Id": "service-client-id",
				"CF-Access-Client-Secret": "service-client-secret"
			}
		}), {
			GATEWAY_BEARER_TOKEN: "client-key",
			ACCESS_SERVICE_TOKEN_CLIENT_ID: "service-client-id",
			ACCESS_SERVICE_TOKEN_CLIENT_SECRET: "service-client-secret"
		} as Env);
		expect(response.status).toBe(200);
	});

	it.each([
		["CF-Access-Client-Id", "service-client-id"],
		["CF-Access-Client-Secret", "service-client-secret"]
	])("rejects a service-token request missing the matching pair: %s", async (header, value) => {
		const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST",
			headers: { [header]: value }
		}), {
			GATEWAY_BEARER_TOKEN: "client-key",
			ACCESS_SERVICE_TOKEN_CLIENT_ID: "service-client-id",
			ACCESS_SERVICE_TOKEN_CLIENT_SECRET: "service-client-secret"
		} as Env);
		expect(response.status).toBe(401);
	});

	it("rejects a service-token pair when either value mismatches", async () => {
		for (const headers of [
			{ "CF-Access-Client-Id": "wrong-id", "CF-Access-Client-Secret": "service-client-secret" },
			{ "CF-Access-Client-Id": "service-client-id", "CF-Access-Client-Secret": "wrong-secret" }
		]) {
			const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST", headers }), {
				GATEWAY_BEARER_TOKEN: "client-key",
				ACCESS_SERVICE_TOKEN_CLIENT_ID: "service-client-id",
				ACCESS_SERVICE_TOKEN_CLIENT_SECRET: "service-client-secret"
			} as Env);
			expect(response.status).toBe(401);
		}
	});

	it("rejects a malformed or payload-only assertion", async () => {
		const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST",
			headers: { "Cf-Access-Jwt-Assertion": "not-a-jwt" }
		}), { GATEWAY_BEARER_TOKEN: "client-key" } as Env);
		expect(response.status).toBe(401);
	});

	it("uses Authorization as the bearer fallback", async () => {
		const response = await protectedApp().fetch(new Request("https://gateway.test/protected", { method: "POST",
			headers: { Authorization: "Bearer client-key" }
		}), { GATEWAY_BEARER_TOKEN: "client-key" } as Env);
		expect(response.status).toBe(200);
	});

	it("uses one redacted rejection response for every invalid credential", async () => {
		const app = protectedApp();
		for (const authorization of [undefined, "Basic client-key", "Bearer wrong-key"]) {
			const response = await app.fetch(
				new Request("https://gateway.test/protected", {
					method: "POST",
					headers: authorization ? { Authorization: authorization } : undefined
				}),
				{ GATEWAY_BEARER_TOKEN: "client-key" } as Env
			);

			expect(response.status).toBe(401);
			expect(await response.json()).toEqual({ error: { message: "Unauthorized" } });
		}
	});

	it("allows exactly one route execution when the configured key matches", async () => {
		const response = await protectedApp().fetch(
			new Request("https://gateway.test/protected", {
				method: "POST",
				headers: { Authorization: "Bearer client-key" }
			}),
			{ GATEWAY_BEARER_TOKEN: "client-key" } as Env
		);

		expect(await response.json()).toEqual({ reached: true });
	});

	it("accepts the configured bearer token from the alternate gateway header", async () => {
		const response = await protectedApp().fetch(
			new Request("https://gateway.test/protected", {
				method: "POST",
				headers: { "X-Gateway-Authorization": "Bearer client-key" }
			}),
			{ GATEWAY_BEARER_TOKEN: "client-key" } as Env
		);

		expect(response.status).toBe(200);
	});

	it("prefers the alternate gateway header over Authorization", async () => {
		const response = await protectedApp().fetch(
			new Request("https://gateway.test/protected", {
				method: "POST",
				headers: {
					Authorization: "Bearer wrong-key",
					"X-Gateway-Authorization": "Bearer client-key"
				}
			}),
			{ GATEWAY_BEARER_TOKEN: "client-key" } as Env
		);

		expect(response.status).toBe(200);
	});

	it("rejects an invalid alternate gateway header", async () => {
		const response = await protectedApp().fetch(
			new Request("https://gateway.test/protected", {
				method: "POST",
				headers: { "X-Gateway-Authorization": "Bearer wrong-key" }
			}),
			{ GATEWAY_BEARER_TOKEN: "client-key" } as Env
		);

		expect(response.status).toBe(401);
	});

	it("protects the Ollama tags route with the same rejection response", async () => {
		const response = await ollama.fetch(new Request("https://gateway.test/tags"), {
			GATEWAY_BEARER_TOKEN: "client-key"
		} as Env);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: { message: "Unauthorized" } });
	});

	it.each([
		[openai, "POST", "/v1/chat/completions"],
		[openai, "POST", "/v1/completions"],
		[responses, "POST", "/v1/responses"],
		[openai, "GET", "/v1/models"],
		[openai, "GET", "/v1/model-presets"],
		[ollama, "POST", "/chat"],
		[ollama, "POST", "/show"],
		[ollama, "GET", "/tags"]
	] as const)("protects public route %s %s", async (router, method, path) => {
		const response = await router.fetch(new Request(`https://gateway.test${path}`, { method }), {
			GATEWAY_BEARER_TOKEN: "client-key"
		} as Env);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: { message: "Unauthorized" } });
	});
});
