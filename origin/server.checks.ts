import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { createOriginServer, normalizeModel, promptFrom } from "./server.js";

describe("origin contract", () => {
  it("normalizes only supported models", () => {
    expect(normalizeModel("gpt-5.6")).toBe("gpt-5.6-luna");
    expect(() => normalizeModel("gpt-4o")).toThrow();
  });
  it("promptifies input without exposing policy", () => {
    expect(promptFrom({ instructions: "be brief", input: "hello" })).toBe("be brief\n\nhello");
  });

  it("requires separate origin and ChatGPT OAuth credentials", async () => {
    const previous = process.env.ORIGIN_BEARER_TOKEN;
    process.env.ORIGIN_BEARER_TOKEN = "test-origin-token";
    let spawnOptions: { env?: NodeJS.ProcessEnv } | undefined;
    const spawnFn = ((_command: string, _args: string[], options: { env?: NodeJS.ProcessEnv }) => {
      spawnOptions = options;
      const child = new EventEmitter() as EventEmitter & { stdin: { write: (value: string) => void; end: () => void }; stdout: EventEmitter & { setEncoding: (value: string) => void }; killed: boolean; kill: () => void };
      child.stdin = { write: () => undefined, end: () => undefined };
      child.stdout = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
      child.killed = false;
      child.kill = () => { child.killed = true; };
      queueMicrotask(() => child.emit("close", 1));
      return child;
    }) as never;
    const server = createOriginServer({ spawnFn });
    const address = await new Promise<{ port: number }>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve(server.address() as { port: number }));
    });
    const response = await fetch(`http://127.0.0.1:${address.port}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: "Bearer test-origin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-5.6", input: "test" }),
    });
    expect(response.status).toBe(401);
    const swapped = await fetch(`http://127.0.0.1:${address.port}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: "Bearer test-oauth-token",
        "x-chatgpt-oauth-authorization": "Bearer test-origin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-5.6", input: "test" }),
    });
    expect(swapped.status).toBe(401);
    const valid = await fetch(`http://127.0.0.1:${address.port}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: "Bearer test-origin-token",
        "x-chatgpt-oauth-authorization": "Bearer test-oauth-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-5.6", input: "test" }),
    });
    expect(valid.status).toBe(504);
    expect(spawnOptions?.env?.X_CHATGPT_OAUTH_AUTHORIZATION).toBe("Bearer test-oauth-token");
    expect(spawnOptions?.env?.ORIGIN_BEARER_TOKEN).toBe("test-origin-token");
    server.close();
    if (previous === undefined) delete process.env.ORIGIN_BEARER_TOKEN;
    else process.env.ORIGIN_BEARER_TOKEN = previous;
  });
});
