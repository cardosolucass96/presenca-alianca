import { eq } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';
import type { Database } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { hashPassword } from './auth';

const HOUR_IN_MS = 1000 * 60 * 60;

export function generateResetToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return encodeBase64url(bytes);
}

export function generateResetId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase64url(bytes);
}

export async function createPasswordResetToken(db: Database, userId: string): Promise<string> {
	const id = generateResetId();
	const token = generateResetToken();
	const expiresAt = new Date(Date.now() + HOUR_IN_MS);

	await db.insert(table.passwordResetToken).values({
		id,
		userId,
		token,
		expiresAt
	});

	return token;
}

export async function getValidResetToken(db: Database, token: string) {
	const [result] = await db
		.select()
		.from(table.passwordResetToken)
		.where(eq(table.passwordResetToken.token, token));

	if (!result) return null;
	if (Date.now() >= result.expiresAt.getTime()) return null;
	if (result.usedAt) return null;

	return result;
}

export async function markTokenAsUsed(db: Database, tokenId: string) {
	await db
		.update(table.passwordResetToken)
		.set({ usedAt: new Date() })
		.where(eq(table.passwordResetToken.id, tokenId));
}

export async function resetPassword(db: Database, token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
	const resetToken = await getValidResetToken(db, token);
	
	if (!resetToken) {
		return { success: false, error: 'Token inválido ou expirado' };
	}

	const passwordHash = await hashPassword(newPassword);

	await db
		.update(table.user)
		.set({ passwordHash })
		.where(eq(table.user.id, resetToken.userId));

	await markTokenAsUsed(db, resetToken.id);

	return { success: true };
}

export async function getUserForReset(db: Database, token: string) {
	const resetToken = await getValidResetToken(db, token);
	
	if (!resetToken) return null;

	const [user] = await db
		.select({
			id: table.user.id,
			username: table.user.username,
			email: table.user.email
		})
		.from(table.user)
		.where(eq(table.user.id, resetToken.userId));

	return user ?? null;
}
