import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import * as schema from '../src/lib/server/db/schema';

const envContent = readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(
	envContent.split('\n').filter(line => line.includes('=')).map(line => {
		const [key, ...values] = line.split('=');
		return [key.trim(), values.join('=').trim()];
	})
);

const client = createClient({ url: envVars.DATABASE_URL });
const db = drizzle(client, { schema });

async function checkDb() {
	const users = await db.select().from(schema.user);
	console.log('📊 Usuários no banco:', users.length);
	users.forEach(u => console.log(`   - ${u.email} (${u.role}) - ${u.companyName}`));

	const products = await db.select().from(schema.product);
	console.log('\n💼a Cargos no banco:', products.length);
	products.forEach(p => console.log(`   - ${p.name} (${p.isActive ? 'ativo' : 'inativo'})`));

	const events = await db.select().from(schema.event);
	console.log('\n📅 Eventos no banco:', events.length);
	events.forEach(e => console.log(`   - ${e.name} (${e.isActive ? 'ativo' : 'inativo'})`));
}

checkDb().catch(console.error);
