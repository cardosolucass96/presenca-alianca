import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import type { Database } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

// Password hashing using PBKDF2 (compatible with Cloudflare Workers)
// Note: Cloudflare Workers limit is 100000 iterations
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const encoder = new TextEncoder();
	const passwordData = encoder.encode(password);
	
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		passwordData,
		'PBKDF2',
		false,
		['deriveBits']
	);
	
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256'
		},
		keyMaterial,
		KEY_LENGTH * 8
	);
	
	const hashArray = new Uint8Array(derivedBits);
	const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
	const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
	
	return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
	// Support both PBKDF2 and legacy argon2 hashes
	if (storedHash.startsWith('$argon2')) {
		// Legacy argon2 hash - needs migration
		// For now, we'll reject these and require password reset
		console.warn('Legacy argon2 hash detected - user needs password reset');
		return false;
	}
	
	if (!storedHash.startsWith('pbkdf2:')) {
		return false;
	}
	
	const parts = storedHash.split(':');
	if (parts.length !== 4) {
		return false;
	}
	
	const [, iterationsStr, saltHex, storedHashHex] = parts;
	const iterations = parseInt(iterationsStr, 10);
	
	// Reconstruct salt from hex
	const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
	
	const encoder = new TextEncoder();
	const passwordData = encoder.encode(password);
	
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		passwordData,
		'PBKDF2',
		false,
		['deriveBits']
	);
	
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations,
			hash: 'SHA-256'
		},
		keyMaterial,
		KEY_LENGTH * 8
	);
	
	const hashArray = new Uint8Array(derivedBits);
	const computedHashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
	
	// Constant-time comparison
	if (computedHashHex.length !== storedHashHex.length) {
		return false;
	}
	
	let result = 0;
	for (let i = 0; i < computedHashHex.length; i++) {
		result |= computedHashHex.charCodeAt(i) ^ storedHashHex.charCodeAt(i);
	}
	
	return result === 0;
}

// User management
export function generateUserId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase64url(bytes);
}

export async function createUser(
	db: Database,
	email: string,
	username: string,
	companyName: string,
	password: string,
	role: 'user' | 'admin' = 'user',
	positionId?: string,
	phone?: string
) {
	const passwordHash = await hashPassword(password);
	const userId = generateUserId();

	await db.insert(table.user).values({
		id: userId,
		email: email.toLowerCase(),
		phone: phone ? phone.replace(/\D/g, '') : null,
		username,
		companyName,
		positionId: positionId || null,
		passwordHash,
		role
	});

	return userId;
}

export async function getUserByEmail(db: Database, email: string) {
	const [user] = await db
		.select()
		.from(table.user)
		.where(eq(table.user.email, email.toLowerCase()));
	return user ?? null;
}

export async function getUserByPhone(db: Database, phone: string) {
	const cleanPhone = phone.replace(/\D/g, '');
	const [user] = await db
		.select()
		.from(table.user)
		.where(eq(table.user.phone, cleanPhone));
	return user ?? null;
}

export async function getUserByEmailOrPhone(db: Database, login: string) {
	// Se contém @ é email, senão tenta como telefone
	if (login.includes('@')) {
		return getUserByEmail(db, login);
	}
	return getUserByPhone(db, login);
}

// Session management
export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createSession(db: Database, token: string, userId: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await db.insert(table.session).values(session);
	return session;
}

export async function validateSessionToken(db: Database, token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			user: {
				id: table.user.id,
				email: table.user.email,
				username: table.user.username,
				role: table.user.role
			},
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.where(eq(table.session.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(db: Database, sessionId: string) {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: 'lax',
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}
