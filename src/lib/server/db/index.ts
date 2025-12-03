import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import * as schema from './schema';

// Tipo do banco de dados
export type Database = DrizzleD1Database<typeof schema> | LibSQLDatabase<typeof schema>;

let _devDb: LibSQLDatabase<typeof schema> | null = null;

/**
 * Cria a conexão com o banco de dados.
 * Em desenvolvimento, usa LibSQL local.
 * Em produção na Cloudflare, usa D1.
 */
export function getDatabase(platform?: App.Platform): Database {
	// Em desenvolvimento, SEMPRE usa LibSQL local
	if (dev) {
		if (!_devDb) {
			if (!env.DATABASE_URL) {
				throw new Error('DATABASE_URL is not set for development');
			}
			const client = createClient({ url: env.DATABASE_URL });
			_devDb = drizzleLibSQL(client, { schema });
		}
		return _devDb;
	}

	// Em produção, usa D1 da Cloudflare
	if (platform?.env?.DB) {
		return drizzleD1(platform.env.DB, { schema });
	}

	throw new Error(
		'Database not available. Please configure the D1 binding in Cloudflare Pages settings.'
	);
}

// Re-exporta o schema para facilitar imports
export * as table from './schema';


