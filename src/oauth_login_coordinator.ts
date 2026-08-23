type OAuthState = { verifier: string; createdAt: number; expiresAt: number };

export class OAuthLoginCoordinator {
	constructor(private readonly state: DurableObjectState) {}

	async fetch(request: Request): Promise<Response> {
		if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
		const input = (await request.json()) as {
			operation?: string;
			verifier?: string;
			createdAt?: number;
			ttlSeconds?: number;
		};
		if (input.operation === "create" && typeof input.verifier === "string" && typeof input.createdAt === "number") {
			const expiresAt = input.createdAt + (input.ttlSeconds || 600) * 1000;
			await this.state.storage.put<OAuthState>("state", {
				verifier: input.verifier,
				createdAt: input.createdAt,
				expiresAt
			});
			await this.state.storage.setAlarm(expiresAt);
			return new Response(null, { status: 204 });
		}
		if (input.operation !== "claim") return new Response(null, { status: 400 });
		const record = await this.state.storage.transaction(async (transaction) => {
			const value = await transaction.get<OAuthState>("state");
			if (value && value.expiresAt > Date.now()) await transaction.delete("state");
			if (value && value.expiresAt <= Date.now()) return undefined;
			return value;
		});
		return record ? Response.json(record) : new Response(null, { status: 404 });
	}

	async alarm(): Promise<void> {
		await this.state.storage.delete("state");
	}
}
