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
		OPENAI_API_KEY: "client-secret",
		CHATGPT_LOCAL_CLIENT_ID: "client-id",
		CHATGPT_RESPONSES_URL: "unused"
	} as typeof env;

	it("mounts the login UI without embedding a gateway secret", async () => {
		const response = await worker.fetch(new Request("https://example.com/oauth/login"), bindings, createExecutionContext());
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain("OAuth login");
		expect(html).not.toContain("gateway-secret");
	});

	it("requires the gateway token for the login URL endpoint", async () => {
		const response = await worker.fetch(new Request("https://example.com/oauth/login/url"), bindings, createExecutionContext());
		expect(response.status).toBe(401);
	});

	it("uses the gateway token for API authentication, not the OAuth client secret", async () => {
		const request = new Request("https://example.com/v1/models", {
			headers: { Authorization: "Bearer client-secret" }
		});
		const response = await worker.fetch(request, bindings, createExecutionContext());
		expect(response.status).toBe(401);
	});
});
