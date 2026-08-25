# Gateway Authentication

The proxy authenticates clients with a dedicated gateway bearer token. Production inference uses the separate server-side `OPENAI_API_KEY`; it is never accepted as the client credential or returned to clients. The historical Codex OAuth login code remains only for explicit deprecated compatibility flows and is unreachable from the `openai-api` provider.

## Overview

All API endpoints (`/v1/*` and `/api/*`) require `GATEWAY_BEARER_TOKEN` in the Authorization header.

## Configuration

### Environment Variables

Add the following environment variable to your `.dev.vars` file (for local development) or Cloudflare Workers environment:

```
GATEWAY_BEARER_TOKEN=replace-with-a-long-random-secret
```

`OPENAI_API_KEY` is not used as the client authentication token.

### Cloudflare Workers Deployment

When deploying to Cloudflare Workers, set the environment variable using:

```bash
wrangler secret put GATEWAY_BEARER_TOKEN
```

Then enter the gateway token when prompted.

## Client Usage

### Authentication Header

All requests to the proxy endpoints must include an Authorization header with the Bearer token format:

```
Authorization: Bearer <GATEWAY_BEARER_TOKEN>
```

### Example Requests

#### OpenAI Chat Completions

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer <GATEWAY_BEARER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

#### Disabled local endpoints

The legacy Ollama routes under `/api/*` are fail-closed and return `410 Gone` after authentication. They do not proxy to a local backend.

## Error Responses

### Missing Authorization Header

```json
{
  "error": {
    "message": "Missing Authorization header"
  }
}
```
**Status Code:** 401 Unauthorized

### Invalid Authorization Format

```json
{
  "error": {
    "message": "Invalid Authorization header format. Expected: Bearer <token>"
  }
}
```
**Status Code:** 401 Unauthorized

### Invalid API Key

```json
{
  "error": {
    "message": "Invalid API key"
  }
}
```
**Status Code:** 401 Unauthorized

### Server Configuration Error

```json
{
  "error": {
    "message": "Server configuration error"
  }
}
```
**Status Code:** 500 Internal Server Error

This occurs when the `GATEWAY_BEARER_TOKEN` environment variable is not configured on the server.

## Security Notes

1. **Keep credentials secure**: Never expose the gateway token or upstream OAuth credentials in client-side code or public repositories.

2. **Use Environment Variables**: Always store API keys in environment variables, never hardcode them.

3. **Rotate Keys Regularly**: Consider rotating your API keys periodically for enhanced security.

4. **Monitor Usage**: Keep track of API key usage to detect any unauthorized access.

## Public Endpoints

The following endpoints do **NOT** require authentication:

- `GET /` - Root endpoint with service information
- `GET /health` - Health check endpoint

All other endpoints require `GATEWAY_BEARER_TOKEN`. The historical OAuth login UI is retained for compatibility only and is disabled with `410` when the production `openai-api` provider is active. Production inference uses the server-side OpenAI API key and does not refresh OAuth tokens.
