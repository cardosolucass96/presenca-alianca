import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import { readFileSync } from 'fs';
import { webcrypto } from 'crypto';

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(
	envContent.split('\n').filter(line => line.includes('=')).map(line => {
		const [key, ...values] = line.split('=');
		return [key.trim(), values.join('=').trim()];
	})
);

const client = createClient({ url: envVars.DATABASE_URL });
const db = drizzle(client, { schema });

// PBKDF2 password hashing
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

async function hashPassword(password: string): Promise<string> {
	const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const encoder = new TextEncoder();
	const passwordData = encoder.encode(password);
	
	const keyMaterial = await webcrypto.subtle.importKey(
		'raw',
		passwordData,
		'PBKDF2',
		false,
		['deriveBits']
	);
	
	const derivedBits = await webcrypto.subtle.deriveBits(
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

async function updatePasswords() {
	// Get all users
	const users = await db.select().from(schema.user);
	
	console.log(`Found ${users.length} users to update`);
	
	for (const user of users) {
		// Check if already using PBKDF2 with 100000 iterations
		if (user.passwordHash.startsWith('pbkdf2:100000:')) {
			console.log(`✓ ${user.email} - already updated`);
			continue;
		}
		
		// Generate new password hash with default password
		// For demo users, use Demo123#
		// For admin, use admin123
		const defaultPassword = user.role === 'admin' ? 'admin123' : 'Demo123#';
		const newHash = await hashPassword(defaultPassword);
		
		await db.update(schema.user)
			.set({ passwordHash: newHash })
			.where(eq(schema.user.id, user.id));
		
		console.log(`✓ ${user.email} - updated to PBKDF2:100000`);
	}
	
	console.log('\n✅ All passwords updated!');
}

updatePasswords().catch(console.error);
