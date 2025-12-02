import { eq, desc } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';
import type { Database } from '$lib/server/db';
import { apiKey } from '$lib/server/db/schema';
import type { ApiKey } from '$lib/server/db/schema';

function generateApiKeyId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(10));
	return encodeBase64url(bytes);
}

function generateApiKeySecret(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return 'pa_' + encodeBase64url(bytes);
}

export async function createApiKey(db: Database, name: string, createdBy: string): Promise<{ apiKey: ApiKey; plainKey: string }> {
	const id = generateApiKeyId();
	const plainKey = generateApiKeySecret();

	const [newApiKey] = await db
		.insert(apiKey)
		.values({
			id,
			name: name.trim(),
			key: plainKey,
			createdBy
		})
		.returning();

	return { apiKey: newApiKey, plainKey };
}

export async function getAllApiKeys(db: Database): Promise<ApiKey[]> {
	return await db
		.select()
		.from(apiKey)
		.orderBy(desc(apiKey.createdAt));
}

export async function getApiKeyById(db: Database, id: string): Promise<ApiKey | null> {
	const [result] = await db.select().from(apiKey).where(eq(apiKey.id, id));
	return result ?? null;
}

export async function validateApiKey(db: Database, key: string): Promise<ApiKey | null> {
	const [result] = await db
		.select()
		.from(apiKey)
		.where(eq(apiKey.key, key));
	
	if (!result || !result.isActive) return null;

	await db
		.update(apiKey)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKey.id, result.id));

	return result;
}

export async function toggleApiKeyActive(db: Database, id: string): Promise<ApiKey | null> {
	const existing = await getApiKeyById(db, id);
	if (!existing) return null;

	const [updated] = await db
		.update(apiKey)
		.set({ isActive: !existing.isActive })
		.where(eq(apiKey.id, id))
		.returning();

	return updated ?? null;
}

export async function deleteApiKey(db: Database, id: string): Promise<boolean> {
	const result = await db.delete(apiKey).where(eq(apiKey.id, id));
	return (result.rowsAffected ?? 0) > 0;
}
