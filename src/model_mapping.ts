import { Env } from "./types";
import { normalizeModelName } from "./utils";
import { MODEL_IDS, MODEL_PRESETS } from "./models";

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
	return normalizeModelName(mapped || requested, env.DEBUG_MODEL, env.OPENAI_DEFAULT_MODEL);
}

export function isKnownModelId(model: string, env: Env): boolean {
	const known = new Set<string>([...MODEL_IDS, ...MODEL_PRESETS.map((preset) => preset.model), "codex-mini-latest"]);
	return (
		known.has(model) ||
		Object.values(configuredModelMap(env.MODEL_ID_MAP)).some(
			(mapped) => normalizeModelName(mapped, env.DEBUG_MODEL) === model
		)
	);
}
