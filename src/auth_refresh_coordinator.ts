import { refreshSerialized, type RefreshCoordinationRequest } from "./auth_kv";
import type { Env } from "./types";

export class AuthRefreshCoordinator {
	private refreshInFlight: Promise<Awaited<ReturnType<typeof refreshSerialized>>> | null = null;

	constructor(
		private readonly state: DurableObjectState,
		private readonly env: Env
	) {}

	async fetch(request: Request): Promise<Response> {
		if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
		if (!this.refreshInFlight) {
			this.refreshInFlight = (async () => {
				const coordination = (await request.json()) as RefreshCoordinationRequest;
				return this.state.blockConcurrencyWhile(() => refreshSerialized(this.env, coordination));
			})().finally(() => {
				this.refreshInFlight = null;
			});
		}
		const tokens = await this.refreshInFlight;
		return Response.json(tokens);
	}
}
