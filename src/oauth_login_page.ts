import { Hono } from "hono";

export type OAuthLoginPageOptions = {
	callbackEndpoint: string;
};

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;"
			})[character] ?? character
	);
}

export function createOAuthLoginPage(options: OAuthLoginPageOptions): Hono {
	const app = new Hono();
	const callbackEndpoint = escapeHtml(options.callbackEndpoint);

	app.get("/", (c) =>
		c.html(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OAuth login</title></head>
<body>
<main>
<h1>OAuth login</h1>
<form id="oauth-form">
<label for="token">Gateway token</label>
<input id="token" name="token" type="password" autocomplete="off" required>
<label for="callback-url">Callback URL</label>
<textarea id="callback-url" name="callback_url" required></textarea>
<button type="submit">Complete login</button>
</form>
<p id="status" role="status" aria-live="polite"></p>
<script>
const form = document.getElementById("oauth-form");
const status = document.getElementById("status");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const tokenField = document.getElementById("token");
  const callbackField = document.getElementById("callback-url");
  const token = tokenField.value;
  const callbackUrl = callbackField.value;
  status.textContent = "Submitting…";
  try {
    const response = await fetch("${callbackEndpoint}", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({ callback_url: callbackUrl })
    });
    if (!response.ok) throw new Error("request failed");
    status.textContent = "OAuth login completed.";
    form.reset();
  } catch {
    status.textContent = "Unable to complete OAuth callback.";
  }
});
</script>
</main>
</body>
</html>`)
	);

	return app;
}
