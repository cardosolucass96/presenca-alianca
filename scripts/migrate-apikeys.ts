import { createClient } from '@libsql/client';

const db = createClient({
	url: 'file:./local.db'
});

console.log('Criando tabela api_key...');

try {
	await db.execute(`
		CREATE TABLE IF NOT EXISTS api_key (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			key TEXT NOT NULL UNIQUE,
			is_active INTEGER NOT NULL DEFAULT 1,
			last_used_at INTEGER,
			created_at INTEGER NOT NULL,
			created_by TEXT NOT NULL REFERENCES user(id)
		)
	`);
	
	console.log('✅ Tabela api_key criada com sucesso!');
} catch (error) {
	console.error('❌ Erro ao criar tabela:', error);
}

db.close();
