import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/server/db/schema';

const cargos = [
	'Vendedor',
	'SDR / BDR',
	'Supervisor',
	'Gerente',
	'Analista',
	'Sócio'
];

async function seedCargos() {
	const client = createClient({
		url: 'file:local.db'
	});

	const db = drizzle(client, { schema });

	console.log('🌱 Iniciando seed de cargos...\n');

	for (const nome of cargos) {
		const id = `cargo_${nome.toLowerCase().replace(/\s*\/\s*/g, '_').replace(/\s+/g, '_')}`;
		
		try {
			await db.insert(schema.product).values({
				id,
				name: nome,
				isActive: true
			});
			console.log(`✅ Cargo criado: ${nome}`);
		} catch (error: any) {
			if (error.message?.includes('UNIQUE constraint failed')) {
				console.log(`⏭️  Cargo já existe: ${nome}`);
			} else {
				console.error(`❌ Erro ao criar cargo ${nome}:`, error.message);
			}
		}
	}

	console.log('\n✅ Seed de cargos concluído!');
	process.exit(0);
}

seedCargos().catch(console.error);
