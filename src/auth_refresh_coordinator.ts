import { authFingerprint, loadBootstrap, needsRefresh, projectToKv, requestRefresh } from "./auth_store";
import type { AuthOperation, DurableCredential, RefreshCoordinationRequest } from "./auth_store";
import type { Env } from "./types";

const CREDENTIAL_KEY = "credential";
const OPERATION_STRENGTH: Record<AuthOperation, number> = { get: 0, fresh: 1, refresh: 2 };

export class AuthRefreshCoordinator {
	private refreshInFlight: {
		operation: AuthOperation;
		promise: Promise<DurableCredential>;
	} | null = null;

	constructor(
		private readonly state: DurableObjectState,
		private readonly env: Env
	) {}

	async fetch(request: Request): Promise<Response> {
		if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
		if (this.env.GATEWAY_BEARER_TOKEN && request.headers.get("X-Internal-Auth") !== this.env.GATEWAY_BEARER_TOKEN)
			return new Response("Forbidden", { status: 403 });
		const input = (await request.json()) as RefreshCoordinationRequest;
		const record = await this.coordinate(input);
		return Response.json({ ...record, ...record.auth, ...record.auth.tokens });
	}

	private async coordinate(input: RefreshCoordinationRequest): Promise<DurableCredential> {
		const operation = input.operation || (input.force ? "refresh" : "fresh");
		const active = this.refreshInFlight;
		if (active) {
			if (OPERATION_STRENGTH[operation] <= OPERATION_STRENGTH[active.operation]) return active.promise;
			await active.promise;
			return this.coordinate(input);
		}
		const promise = this.state.blockConcurrencyWhile(async () => {
			input.source ||= (await loadBootstrap(this.env, input.now))!;
			let current = await this.state.storage.get<DurableCredential>(CREDENTIAL_KEY);
			if (!current) {
				current = { generation: 1, fingerprint: authFingerprint(input.source), auth: input.source };
				await this.state.storage.put(CREDENTIAL_KEY, current);
			}
			if (input.observedGeneration !== undefined && input.observedGeneration !== current.generation) return current;
			if (input.operation === "get" || (!input.force && !needsRefresh(current.auth, input.now))) return current;
			const generation = current.generation;
			const account = current.auth.tokens.account_id ? `account:${current.auth.tokens.account_id}` : "account:unknown";
			const updated = await requestRefresh(this.env, current.auth, input.now, account);
			if (!updated) return current;
			const latest = await this.state.storage.get<DurableCredential>(CREDENTIAL_KEY);
			if (!latest || latest.generation !== generation) return latest || current;
			const committed = { generation: generation + 1, fingerprint: authFingerprint(updated), auth: updated };
			await this.state.storage.put(CREDENTIAL_KEY, committed);
			await projectToKv(this.env, updated, input.now);
			return committed;
		});
		const inFlight = { operation, promise };
		this.refreshInFlight = inFlight;
		try {
			return await promise;
		} finally {
			if (this.refreshInFlight === inFlight) this.refreshInFlight = null;
		}
	}
}
