import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createOAuthLoginPage } from "../src/oauth_login_page";

describe("OAuth login page", () => {
	it("escapes injected endpoint and displays no secret or callback data", async () => {
		const app = new Hono();
		app.route("/", createOAuthLoginPage({ callbackEndpoint: "/oauth/callback?x=\"&y=<" }));
		const response = await app.request("/");
		const html = await response.text();

		expect(response.status).toBe(200);
		expect(html).toContain("&quot;");
		expect(html).toContain("&lt;");
		expect(html).not.toContain("gateway-secret");
		expect(html).not.toContain("code=");
		expect(html).not.toContain("callback_url=");
		expect(html).not.toContain("<script src=");
	});

	it("posts JSON with a bearer token and keeps credentials out of the URL", async () => {
		const app = new Hono();
		app.route("/", createOAuthLoginPage({ callbackEndpoint: "/oauth/callback" }));
		const html = await (await app.request("/")).text();

		expect(html).toContain('<input id="token" name="token" type="password" autocomplete="off" required>');
		expect(html).toContain('<textarea id="callback-url" name="callback_url" required></textarea>');
		expect(html).toContain('fetch("/oauth/callback",');
		expect(html).toContain('Authorization: `Bearer ${token}`');
		expect(html).toContain('JSON.stringify({ callback_url: callbackUrl })');
		expect(html).not.toContain('action="/oauth/callback"');
		expect(html).not.toContain("?token");
		expect(html).not.toContain("URLSearchParams");
	});

	it("sanitizes displayed server errors", async () => {
		const app = new Hono();
		app.route("/", createOAuthLoginPage({ callbackEndpoint: "/oauth/callback" }));
		const html = await (await app.request("/")).text();

		expect(html).toContain("status.textContent =");
		expect(html).toContain("response.ok");
		expect(html).toContain("Unable to complete OAuth callback.");
		expect(html).not.toContain("innerHTML");
	});
});
