import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const MODEL = "gpt-5.6-luna";
type Event = { type?: string; item?: { type?: string; text?: string; content?: Array<{ text?: string }> }; response?: unknown };

export function normalizeModel(model: unknown): string {
  if (model === "gpt-5.6" || model === MODEL) return MODEL;
  throw new Error("unsupported model");
}

export function promptFrom(body: { input?: unknown; instructions?: unknown }): string {
  const input = typeof body.input === "string" ? body.input : JSON.stringify(body.input ?? "");
  const instructions = typeof body.instructions === "string" ? body.instructions : "";
  return [instructions, input].filter(Boolean).join("\n\n").slice(0, 200_000);
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let data = "";
  for await (const chunk of req) data += chunk;
  if (data.length > 1_000_000) throw new Error("body too large");
  const value = JSON.parse(data || "{}");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid json");
  return value;
}

function auth(req: IncomingMessage): boolean {
  const expected = process.env.ORIGIN_BEARER_TOKEN;
  const value = req.headers.authorization;
  return Boolean(expected && value === `Bearer ${expected}`);
}

function eventText(event: Event): string {
  const item = event.item;
  if (item?.text) return item.text;
  return item?.content?.map((part) => part.text ?? "").join("") ?? "";
}

export function createOriginServer(opts: { spawnFn?: typeof spawn } = {}) {
  const spawnFn = opts.spawnFn ?? spawn;
  return createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/responses") return res.writeHead(404).end();
    if (!auth(req)) return res.writeHead(401).end();
    let body: Record<string, unknown>;
    try { body = await readBody(req); normalizeModel(body.model); } catch (error) {
      return res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: (error as Error).message } }));
    }
    const stream = body.stream === true;
    const child = spawnFn("codex", ["exec", "--skip-git-repo-check", "--ephemeral", "--json", "--model", MODEL, "-"], {
      env: { ...process.env, HOME: process.env.CODEX_HOME ? process.env.CODEX_HOME.replace(/\/\.codex$/, "") : process.env.HOME, CODEX_HOME: process.env.CODEX_HOME },
      stdio: ["pipe", "pipe", "ignore"],
    });
    child.stdin.write(promptFrom(body)); child.stdin.end();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; if (!child.killed) child.kill("SIGTERM"); }, Number(process.env.ORIGIN_TIMEOUT_MS ?? 120_000));
    if (!stream) {
      let answer = ""; child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { for (const line of String(chunk).split("\n")) { try { const e = JSON.parse(line) as Event; if (e.type === "item.completed") answer += eventText(e); } catch {} } });
      child.on("close", (code) => { clearTimeout(timer); if (code === 0) res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id: `resp_${randomUUID()}`, object: "response", model: MODEL, output_text: answer })); else res.writeHead(504).end(JSON.stringify({ error: { type: timedOut ? "incomplete" : "failed" } })); });
      return;
    }
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.write(`data: ${JSON.stringify({ type: "response.created", model: MODEL })}\n\n`);
    let buffer = ""; child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { buffer += String(chunk); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) { try { const e = JSON.parse(line) as Event; if (e.type === "item.completed") { const text = eventText(e); if (text) res.write(`data: ${JSON.stringify({ type: "response.output_text.delta", delta: text })}\n\n`); res.write(`data: ${JSON.stringify({ type: "response.output_text.done", text })}\n\n`); } } catch {} } });
    child.on("close", (code) => { res.write(`data: ${JSON.stringify(code === 0 ? { type: "response.completed", model: MODEL } : { type: "response.failed" })}\n\ndata: [DONE]\n\n`); res.end(); });
    req.on("close", () => { if (!child.killed) child.kill("SIGTERM"); });
    child.on("close", () => clearTimeout(timer));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) createOriginServer().listen(Number(process.env.PORT ?? 8788), "127.0.0.1");
