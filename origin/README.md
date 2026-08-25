# Codex CLI private origin

Loopback-only HTTP/SSE adapter for the homelab VPC. It authenticates with `ORIGIN_BEARER_TOKEN`, accepts `POST /v1/responses`, and delegates OAuth refresh and credential handling to the installed Codex CLI. It never reads or writes `auth.json`.

```sh
ORIGIN_BEARER_TOKEN='...' CODEX_HOME=/home/nkowne63rt/.codex PORT=8788 npm start
```

Only `127.0.0.1` is bound. `gpt-5.6` is normalized to `gpt-5.6-luna`; other models return 400. Logs intentionally omit credentials, prompts, and response text.
