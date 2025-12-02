import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { encodeBase64url } from '@oslojs/encoding';
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

// PBKDF2 password hashing (compatible with Cloudflare Workers)
// Note: Cloudflare Workers limit is 100000 iterations
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

function generateUserId(): string {
	const bytes = new Uint8Array(15);
	crypto.getRandomValues(bytes);
	return encodeBase64url(bytes);
}

async function seedAdmin() {
	const email = 'lucas.cardoso@grupovorp.com';
	const username = 'Lucas Cardoso';
	const companyName = 'Grupo Vorp';
	const password = 'Vorp123#';
	const role = 'admin';

	const passwordHash = await hashPassword(password);
	const userId = generateUserId();

	await db.insert(schema.user).values({
		id: userId,
		email: email.toLowerCase(),
		username,
		companyName,
		passwordHash,
		role
	});

	console.log('✅ Admin user created successfully!');
	console.log(`   Email: ${email}`);
	console.log(`   Password: ${password}`);
	console.log(`   Company: ${companyName}`);
}

seedAdmin().catch(console.error);
