import { Env } from "./types";
import { normalizeModelName } from "./utils";

function configuredModelMap(value: string | undefined): Record<string, string> {
	if (!value) return {};
	try {
		const parsed: unknown = JSON.parse(value);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
		return Object.fromEntries(
			Object.entries(parsed).filter(
				(entry): entry is [string, string] => typeof entry[1] === "string" && !!entry[1].trim()
			)
		);
	} catch {
		return {};
	}
}

export function mapModelId(osModelId: string | undefined, env: Env): string {
	const requested = typeof osModelId === "string" ? osModelId.trim() : "";
	const mapped = configuredModelMap(env.MODEL_ID_MAP)[requested];
	return mapped ? mapped.trim() : normalizeModelName(requested, env.DEBUG_MODEL, env.OPENAI_DEFAULT_MODEL);
}
