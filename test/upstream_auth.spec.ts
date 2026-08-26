import { afterEach, describe, expect, it, vi } from "vitest";
import { startUpstreamRequest } from "../src/upstream";
import type { Env } from "../src/types";

const env = (extra: Partial<Env> = {}) =>
	({
		OPENAI_PROVIDER: "openai-api",
		OPENAI_API_KEY: "test-api-key",
		CHATGPT_TRANSPORT: "http",
		...extra
	}) as Env;

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function websocketFixture() {
	const listeners = new Map<string, (event: { data?: string }) => void>();
	const socket = {
		accept: vi.fn(),
		send: vi.fn(),
		close: vi.fn(),
		addEventListener: vi.fn((type: string, listener: (event: { data?: string }) => void) => {
			listeners.set(type, listener);
		})
	};
	return { socket, listeners };
}

describe("OpenAI API upstream provider", () => {
	const vault = () => ({ idFromName: () => "default", get: () => ({ fetch: async () => Response.json({ found: true, value: { tokens: { access_token: "oauth-token", account_id: "acct-redacted" }, lastRefresh: new Date().toISOString(), expiresAt: null } }) }) });
	it("forwards normalized Responses JSON to the private origin without forwarding the gateway token", async () => {
		const privateOrigin = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
			new Response('{"id":"resp_private","model":"gpt-5.6-luna"}', {
				status: 200,
				headers: { "Content-Type": "application/json" }
			})
		);
		vi.stubGlobal("fetch", vi.fn());
		const payload = { model: "gpt-5.6", input: "hello", stream: false };
		const result = await startUpstreamRequest(
			 env({
				UPSTREAM_MODE: "private-origin",
				CODEX_PRIVATE_ORIGIN: { fetch: privateOrigin } as unknown as Env["CODEX_PRIVATE_ORIGIN"]
			}),
			"gpt-5.6",
			[],
			{ rawResponsesBody: JSON.stringify(payload) }
		);
		const [input, init] = privateOrigin.mock.calls[0];
		expect(String(input)).toBe("http://127.0.0.1/v1/responses");
		expect(init?.method).toBe("POST");
		const headers = new Headers(init?.headers);
		expect(headers.get("Authorization")).toBeNull();
		expect(headers.get("X-Private-Origin-Authorization")).toBeNull();
		expect(headers.get("X-Gateway-Authorization")).toBeNull();
		expect(JSON.parse(String(init?.body))).toEqual({
			...payload,
			model: "gpt-5.6-luna",
			input: [{ type: "message", role: "user", content: "hello" }]
		});
		expect(result.error).toBeNull();
		expect(await result.response?.text()).toContain("gpt-5.6-luna");
	});

	it("preserves private-origin SSE responses", async () => {
		const privateOrigin = vi.fn(async () =>
			new Response('data: {"type":"response.completed"}\n\n', {
				status: 200,
				headers: { "Content-Type": "text/event-stream" }
			})
		);
		const result = await startUpstreamRequest(
			env({
				UPSTREAM_MODE: "private-origin",
				CODEX_PRIVATE_ORIGIN: { fetch: privateOrigin } as unknown as Env["CODEX_PRIVATE_ORIGIN"],
			}),
			"gpt-5.6-luna",
			[],
			{ rawResponsesBody: JSON.stringify({ model: "gpt-5.6-luna", input: "hello", stream: true }) }
		);
		expect(result.alreadySse).toBe(true);
		expect(await result.response?.text()).toBe('data: {"type":"response.completed"}\n\n');
	});

	it("injects ChatGPT OAuth headers into the private origin while keeping bearer tokens distinct", async () => {
		const privateOrigin = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			expect(headers.get("Authorization")).toBe("Bearer oauth-token");
			expect(headers.get("X-Private-Origin-Authorization")).toBeNull();
			expect(headers.get("ChatGPT-Account-ID")).toBe("acct-redacted");
			return new Response('data: {"type":"response.completed"}\n\n', {
				status: 200,
				headers: { "Content-Type": "text/event-stream" }
			});
		});
		const result = await startUpstreamRequest(
			env({
				OPENAI_PROVIDER: "chatgpt-oauth",
				UPSTREAM_MODE: "private-origin",
				CODEX_PRIVATE_ORIGIN: { fetch: privateOrigin } as unknown as Env["CODEX_PRIVATE_ORIGIN"],
				OAUTH_VAULT: vault() as unknown as Env["OAUTH_VAULT"],
				OAUTH_VAULT_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(7))),
				OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token", account_id: "acct-redacted" } })
			}),
			"gpt-5.6",
			[],
			{ rawResponsesBody: JSON.stringify({ input: "one", stream: true }) }
		);
		expect(result.response?.status).toBe(200);
	});

	it("fails closed when private-origin mode has no binding or token", async () => {
		const fetchMock = vi.fn(async () => new Response("unexpected"));
		vi.stubGlobal("fetch", fetchMock);
		const result = await startUpstreamRequest(env({ UPSTREAM_MODE: "private-origin" }), "gpt-5.6", [], {
			rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello" })
		});
		expect(result.response).toBeNull();
		expect(result.error?.status).toBe(503);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("uses the VPC boundary without requiring or forwarding a private-origin token", async () => {
		const privateOrigin = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			expect(headers.get("X-Private-Origin-Authorization")).toBeNull();
			expect(headers.get("Authorization")).toBe("Bearer oauth-token");
			return new Response('data: {}\n\n', { status: 200, headers: { "Content-Type": "text/event-stream" } });
		});
		const result = await startUpstreamRequest(env({
			OPENAI_PROVIDER: "chatgpt-oauth",
			UPSTREAM_MODE: "private-origin",
			CODEX_PRIVATE_ORIGIN: { fetch: privateOrigin } as unknown as Env["CODEX_PRIVATE_ORIGIN"],
			OAUTH_VAULT: vault() as unknown as Env["OAUTH_VAULT"],
			OAUTH_VAULT_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(7))),
			OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token" } })
		}), "gpt-5.6", [], { rawResponsesBody: JSON.stringify({ input: "hello", stream: true }) });
		expect(result.error).toBeNull();
	});

	it("rejects private-origin production mode when the OAuth vault binding is absent", async () => {
		const result = await startUpstreamRequest(env({
			OPENAI_PROVIDER: "chatgpt-oauth",
			UPSTREAM_MODE: "private-origin",
			CODEX_PRIVATE_ORIGIN: { fetch: vi.fn() } as unknown as Env["CODEX_PRIVATE_ORIGIN"],
			OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "must-not-fallback" } })
		}), "gpt-5.6", [], { rawResponsesBody: JSON.stringify({ input: "hello" }) });
		expect(result.error?.status).toBe(503);
	});

	it("uses the existing websocket provider when upstream mode is omitted", async () => {
		const { socket } = websocketFixture();
		const upstream = vi.fn(async () => {
			const response = new Response(null, { status: 200 });
			Object.defineProperty(response, "webSocket", { value: socket });
			return response;
		});
		vi.stubGlobal("fetch", upstream);
		const result = await startUpstreamRequest(
			env({
				OPENAI_PROVIDER: "chatgpt-oauth",
				OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token" } })
			}),
			"gpt-5.6",
			[],
			{ rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello" }) }
		);
		expect(result.error).toBeNull();
		expect(upstream).toHaveBeenCalledWith(expect.stringContaining("chatgpt.com/backend-api/codex/responses"), expect.anything());
	});
	it("uses CLI-compatible WS handshake headers and normalizes response.create", async () => {
		const { socket } = websocketFixture();
		const upstream = vi.fn(async (url: string) => {
			if (url.startsWith("https://raw.githubusercontent.com/")) return new Response("instructions", { status: 200 });
			const response = new Response(null, { status: 200 });
			Object.defineProperty(response, "webSocket", { value: socket });
			return response;
		});
		vi.stubGlobal("fetch", upstream);
		const payload = {
			model: "gpt-5.6-luna",
			input: [{ type: "message", role: "user", content: "hello" }],
			instructions: "be precise",
			stream: false,
			store: true,
			stream_options: { include_obfuscation: false },
			client_metadata: { trace: "safe" },
			previous_response_id: "resp_previous",
			service_tier: "priority",
			unknown_field: { preserved: true }
		};
		const result = await startUpstreamRequest(
			env({
				OPENAI_PROVIDER: "chatgpt-oauth",
				CHATGPT_TRANSPORT: "websocket",
				OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token", account_id: "acct-redacted" } })
			}),
			"gpt-5.6-luna",
			[],
			{ rawResponsesBody: JSON.stringify(payload) }
		);
		const [, init] = upstream.mock.calls.find(([url]) => url === "https://chatgpt.com/backend-api/codex/responses")!;
		result.response?.body?.getReader();
		const headers = new Headers(init?.headers);
		expect(headers.get("Origin")).toBe("https://chatgpt.com");
		expect(headers.get("Referer")).toBe("https://chatgpt.com/");
		expect(headers.get("Accept-Language")).toBe("en-US,en;q=0.9");
		expect(headers.get("x-client-request-id")).toMatch(/^[0-9a-f-]{36}$/i);
		expect(headers.get("x-codex-installation-id")).toMatch(/^[0-9a-f-]{36}$/i);
		expect(headers.get("OpenAI-Beta")).toBe("responses_websockets=2026-02-06");
		expect(headers.get("Authorization")).toBe("Bearer oauth-token");
		expect(init?.body).toBeUndefined();
		expect(socket.send).toHaveBeenCalledWith(
			JSON.stringify({
				type: "response.create",
				response: { ...payload, stream: true, store: false }
			})
		);
		expect(upstream.mock.calls.filter(([url]) => url.startsWith("https://raw.githubusercontent.com/")).length).toBe(0);
		expect(JSON.stringify(socket.send.mock.calls)).not.toContain("oauth-token");
	});

	it.each([404, 500])("continues to the WS upstream when optional base instructions return %s", async (status) => {
		const { socket } = websocketFixture();
		const upstream = vi.fn(async (url: string) => {
			if (url.startsWith("https://raw.githubusercontent.com/")) return new Response("unavailable", { status });
			const response = new Response(null, { status: 200 });
			Object.defineProperty(response, "webSocket", { value: socket });
			return response;
		});
		vi.stubGlobal("fetch", upstream);

		const result = await startUpstreamRequest(
			env({
				OPENAI_PROVIDER: "chatgpt-oauth",
				CHATGPT_TRANSPORT: "websocket",
				OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token" } })
			}),
			"gpt-5.6-luna",
			[],
			{ rawResponsesBody: JSON.stringify({ model: "gpt-5.6-luna", input: "hello" }) }
		);

		expect(result.error).toBeNull();
		expect(result.response).not.toBeNull();
		expect(upstream.mock.calls.some(([url]) => url === "https://chatgpt.com/backend-api/codex/responses")).toBe(true);
	});

	it.each([401, 403, 429, 500])("classifies WS handshake HTTP status %s without upstream body", async (status) => {
		const upstream = vi.fn(async (url: string) =>
			url.startsWith("https://raw.githubusercontent.com/")
				? new Response("instructions", { status: 200 })
				: new Response("upstream secret body", { status })
		);
		vi.stubGlobal("fetch", upstream);
		const result = await startUpstreamRequest(
			env({
				OPENAI_PROVIDER: "chatgpt-oauth",
				CHATGPT_TRANSPORT: "websocket",
				OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token" } })
			}),
			"gpt-5.6-luna",
			[],
			{ rawResponsesBody: JSON.stringify({ input: "hello" }) }
		);
		expect(result.response).toBeNull();
		expect(result.error?.status).toBe(status);
		expect(await result.error?.text()).not.toContain("upstream secret body");
	});

	it("connects to the ChatGPT Codex upstream and proxies its response", async () => {
		const upstream = vi.fn(
			async () =>
				new Response(JSON.stringify({ id: "resp_hosted", status: "completed" }), {
					status: 200,
					headers: { "Content-Type": "application/json" }
				})
		);
		vi.stubGlobal("fetch", upstream);
		const result = await startUpstreamRequest(
			env({
				OPENAI_PROVIDER: "chatgpt-oauth",
				OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token", account_id: "acct-redacted" } })
			}),
			"gpt-5.6",
			[],
			{ rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello", stream: false }) }
		);
		expect(upstream).toHaveBeenCalledWith(
			"https://chatgpt.com/backend-api/codex/responses",
			expect.objectContaining({ method: "POST" })
		);
		const [, init] = upstream.mock.calls.find(([url]) => url === "https://chatgpt.com/backend-api/codex/responses")!;
		const headers = new Headers(init?.headers);
		expect(headers.get("Authorization")).toBe("Bearer oauth-token");
		expect(headers.get("ChatGPT-Account-ID")).toBe("acct-redacted");
		expect(headers.get("originator")).toBe("codex_cli_rs");
		expect(headers.get("User-Agent")).toBe("codex_cli_rs/0.149.1");
		expect(headers.get("Accept")).toBe("text/event-stream");
		expect(headers.get("OpenAI-Beta")).toBe("responses=2026-02-06");
		expect(headers.get("Origin")).toBe("https://chatgpt.com");
		expect(headers.get("Referer")).toBe("https://chatgpt.com/");
		expect(headers.get("Accept-Language")).toBe("en-US,en;q=0.9");
		expect(headers.get("x-client-request-id")).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
		expect(JSON.parse(String(init?.body))).toMatchObject({ model: "gpt-5.6-luna", stream: false });
		expect(String(init?.body)).not.toContain("oauth-token");
		expect(result.response?.status).toBe(200);
		expect(await result.response?.json()).toMatchObject({ id: "resp_hosted" });
	});

	it("creates a fresh client request UUID for each OAuth upstream request", async () => {
		const upstream = vi.fn(async () => new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", upstream);
		const oauthEnv = env({
			OPENAI_PROVIDER: "chatgpt-oauth",
			OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token", account_id: "acct-redacted" } })
		});
		await startUpstreamRequest(oauthEnv, "gpt-5.6-luna", [], { rawResponsesBody: JSON.stringify({ input: "one" }) });
		await startUpstreamRequest(oauthEnv, "gpt-5.6-luna", [], { rawResponsesBody: JSON.stringify({ input: "two" }) });
		const ids = upstream.mock.calls
			.filter(([url]) => url === "https://chatgpt.com/backend-api/codex/responses")
			.map(([, init]) => new Headers(init?.headers).get("x-client-request-id"));
		expect(ids).toHaveLength(2);
		expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/i);
		expect(ids[1]).toMatch(/^[0-9a-f-]{36}$/i);
		expect(ids[0]).not.toBe(ids[1]);
	});

	it("normalizes the legacy model while preserving the rest of the OAuth Responses body", async () => {
		const upstream = vi.fn(
			async () => new Response("data: {}\n\n", { status: 200, headers: { "Content-Type": "text/event-stream" } })
		);
		vi.stubGlobal("fetch", upstream);
		const body = { model: "gpt-5.6", input: "hello", stream: true, metadata: { trace: "safe" } };
		await startUpstreamRequest(
			env({
				OPENAI_PROVIDER: "chatgpt-oauth",
				OPENAI_CODEX_AUTH: JSON.stringify({ tokens: { access_token: "oauth-token", account_id: "acct-redacted" } })
			}),
			"gpt-5.6",
			[],
			{ rawResponsesBody: JSON.stringify(body) }
		);
		const [, init] = upstream.mock.calls.find(([url]) => url === "https://chatgpt.com/backend-api/codex/responses")!;
		expect(JSON.parse(String(init?.body))).toEqual({
			...body,
			model: "gpt-5.6-luna",
			input: [{ type: "message", role: "user", content: "hello" }]
		});
	});

	it("fails closed with 503 when the provider key is missing", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const result = await startUpstreamRequest(env({ OPENAI_API_KEY: undefined }), "gpt-5.6", [], {
			rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello" })
		});
		expect(result.response).toBeNull();
		expect(result.error?.status).toBe(503);
		expect(await result.error?.text()).not.toContain("test-api-key");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("fails closed with 503 when ChatGPT OAuth credentials are missing", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const result = await startUpstreamRequest(
			env({ OPENAI_PROVIDER: "chatgpt-oauth", OPENAI_CODEX_AUTH: undefined }),
			"gpt-5.6",
			[]
		);
		expect(result.response).toBeNull();
		expect(result.error?.status).toBe(503);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sends the public model and Responses body with only API authentication", async () => {
		const upstream = vi.fn(async () => new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", upstream);
		const body = {
			model: "gpt-5.6",
			input: [{ type: "message", role: "user", content: "hello" }],
			tools: [{ type: "function", name: "lookup" }],
			instructions: "be precise",
			stream: true
		};
		const result = await startUpstreamRequest(env(), "gpt-5.6", [], { rawResponsesBody: JSON.stringify(body) });
		expect(result.response?.status).toBe(200);
		const [url, init] = upstream.mock.calls.find(([candidate]) => candidate === "https://api.openai.com/v1/responses")!;
		const headers = new Headers(init?.headers);
		expect(url).toBe("https://api.openai.com/v1/responses");
		expect(headers.get("Authorization")).toBe("Bearer test-api-key");
		expect(headers.get("ChatGPT-Account-ID")).toBeNull();
		expect(headers.get("originator")).toBeNull();
		expect(headers.get("OpenAI-Beta")).toBeNull();
		expect(JSON.parse(String(init?.body))).toEqual({ ...body, model: "gpt-5.6-luna" });
	});

	it("always uses the fixed OpenAI Responses endpoint", async () => {
		const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		await startUpstreamRequest(
			env({ OPENAI_API_URL: "https://attacker.example/steal" } as Partial<Env>),
			"gpt-5.6",
			[],
			{ rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello", stream: false }) }
		);
		const apiCall = fetchMock.mock.calls.find(([url]) => url === "https://api.openai.com/v1/responses");
		expect(apiCall?.[0]).toBe("https://api.openai.com/v1/responses");
		expect(new Headers(apiCall?.[1]?.headers).get("Accept")).toBe("application/json");
	});

	it.each([401, 403])("returns a safe error without OAuth refresh for upstream %s", async (status) => {
		const fetchMock = vi.fn(async () => new Response("secret upstream detail", { status }));
		vi.stubGlobal("fetch", fetchMock);
		const result = await startUpstreamRequest(env({ OPENAI_CODEX_AUTH: "oauth-secret" }), "gpt-5.6", [], {
			rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello" })
		});
		expect(result.error?.status).toBe(status);
		expect(await result.error?.text()).toBe(JSON.stringify({ error: { message: "Upstream request failed" } }));
		expect(fetchMock.mock.calls.filter(([url]) => url === "https://api.openai.com/v1/responses")).toHaveLength(1);
	});

	it("preserves non-stream Responses requests and generated stream requests", async () => {
		const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		await startUpstreamRequest(env(), "gpt-5.6", [], {
			rawResponsesBody: JSON.stringify({ model: "gpt-5.6", input: "hello", stream: false })
		});
		const apiCalls = fetchMock.mock.calls.filter(([url]) => url === "https://api.openai.com/v1/responses");
		expect(JSON.parse(String(apiCalls[0][1]?.body)).stream).toBe(false);
		await startUpstreamRequest(env(), "gpt-5.6", [{ type: "message", role: "user", content: "hello" }]);
		const allApiCalls = fetchMock.mock.calls.filter(([url]) => url === "https://api.openai.com/v1/responses");
		expect(JSON.parse(String(allApiCalls[1][1]?.body))).toMatchObject({ model: "gpt-5.6-luna", stream: true });
	});

	it("never selects a legacy provider even when configured otherwise", async () => {
		const result = await startUpstreamRequest(
			env({ OPENAI_PROVIDER: "legacy-oauth", OPENAI_CODEX_AUTH: "oauth-secret" } as Partial<Env>),
			"gpt-5.6",
			[]
		);
		expect(result.error?.status).toBe(503);
	});

	it("fails closed when the provider is missing", async () => {
		const result = await startUpstreamRequest(env({ OPENAI_PROVIDER: undefined }), "gpt-5.6", []);
		expect(result.response).toBeNull();
		expect(result.error?.status).toBe(503);
	});
});
