import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import { readFileSync } from 'fs';

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

async function cleanDemoData() {
	console.log('🧹 Cleaning demo data...\n');

	// Delete in order to respect foreign keys
	console.log('Deleting attendances...');
	await db.delete(schema.attendance);

	console.log('Deleting event categories...');
	await db.delete(schema.eventCategory);

	console.log('Deleting events...');
	await db.delete(schema.event);

	console.log('Deleting sessions...');
	await db.delete(schema.session);

	console.log('Deleting password reset tokens...');
	await db.delete(schema.passwordResetToken);

	console.log('Deleting non-admin users...');
	await db.run(sql`DELETE FROM user WHERE role != 'admin'`);

	console.log('Deleting categories...');
	await db.delete(schema.category);

	console.log('Deleting products...');
	await db.delete(schema.product);

	console.log('\n✅ All demo data cleaned!');
}

cleanDemoData().catch(console.error);
