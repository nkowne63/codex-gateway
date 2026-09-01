import { env, createExecutionContext, waitOnExecutionContext, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Hello World worker", () => {
	it("responds with Hello World! (unit style)", async () => {
		const request = new IncomingRequest("http://example.com");
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"{\"status\":\"ok\"}"`);
	});

	it("responds with Hello World! (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(await response.text()).toMatchInlineSnapshot(`"{\"status\":\"ok\"}"`);
	});
});

describe("OAuth integration routes", () => {
	const bindings = {
		KV: undefined,
		GATEWAY_BEARER_TOKEN: "gateway-secret",
		OPENAI_API_KEY: "unused-api-key",
		OPENAI_PROVIDER: "chatgpt-oauth",
		CHATGPT_LOCAL_CLIENT_ID: "client-id",
		CHATGPT_RESPONSES_URL: "unused"
	} as typeof env;

	it("mounts the login UI without embedding a gateway secret", async () => {
		const response = await worker.fetch(new Request("https://example.com/oauth/login"), bindings, createExecutionContext());
		expect(response.status).toBe(200);
		expect(await response.text()).not.toContain("gateway-secret");
	});

	it("disables OAuth routes for the production API provider", async () => {
		const response = await worker.fetch(new Request("https://example.com/oauth/login"), { ...bindings, OPENAI_PROVIDER: "openai-api" }, createExecutionContext());
		expect(response.status).toBe(410);
	});

	it("requires the gateway token for the login URL endpoint", async () => {
		const response = await worker.fetch(new Request("https://example.com/oauth/login/url"), bindings, createExecutionContext());
		expect(response.status).toBe(401);
	});

	it("reaches the login URL handler when OAuth is enabled and the bearer is valid", async () => {
		const response = await worker.fetch(new Request("https://example.com/oauth/login/url", {
			headers: { Authorization: "Bearer gateway-secret" }
		}), {
			...bindings,
			OAUTH_LOGIN_COORDINATOR: {
				idFromName: () => "oauth:test",
				get: () => ({ fetch: async () => new Response(null, { status: 204 }) })
			}
		} as typeof env, createExecutionContext());
		expect(response.status).toBe(200);
		const body = await response.json<{ authorization_url: string }>();
		expect(new URL(body.authorization_url).hostname).toBe("auth.openai.com");
	});

	it("allows only the explicitly enabled empty-vault bootstrap route", async () => {
		const response = await worker.fetch(new Request("https://example.com/oauth/bootstrap", {
			method: "POST",
			headers: { Authorization: "Bearer gateway-secret", "Content-Type": "application/json" },
			body: JSON.stringify({ auth: { tokens: { access_token: "a" } } })
		}), {
			...bindings,
			OAUTH_BOOTSTRAP_ENABLED: "true",
			OAUTH_VAULT: { idFromName: () => "default", get: () => ({ fetch: async () => Response.json({ found: false }) }) },
			OAUTH_VAULT_KEY: btoa(String.fromCharCode(...new Uint8Array(32)))
		} as typeof env, createExecutionContext());
		expect(response.status).not.toBe(410);
	});

	it("uses the gateway token for API authentication, not the OAuth client secret", async () => {
		const request = new Request("https://example.com/v1/models", {
			headers: { Authorization: "Bearer client-secret" }
		});
		const response = await worker.fetch(request, bindings, createExecutionContext());
		expect(response.status).toBe(401);
	});
});
