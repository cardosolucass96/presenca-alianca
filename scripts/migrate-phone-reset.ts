import { createClient } from '@libsql/client';

const db = createClient({
	url: 'file:./local.db'
});

console.log('Adicionando campo phone ao user...');

try {
	await db.execute(`ALTER TABLE user ADD COLUMN phone TEXT`);
	console.log('✅ Campo phone adicionado!');
	
	// Criar índice único separadamente
	await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone ON user(phone) WHERE phone IS NOT NULL`);
	console.log('✅ Índice único para phone criado!');
} catch (error: any) {
	if (error.message?.includes('duplicate column')) {
		console.log('⚠️ Campo phone já existe');
	} else {
		console.error('❌ Erro:', error.message);
	}
}

console.log('Criando tabela password_reset_token...');

try {
	await db.execute(`
		CREATE TABLE IF NOT EXISTS password_reset_token (
			id TEXT PRIMARY KEY NOT NULL,
			user_id TEXT NOT NULL REFERENCES user(id),
			token TEXT NOT NULL UNIQUE,
			expires_at INTEGER NOT NULL,
			used_at INTEGER,
			created_at INTEGER NOT NULL
		)
	`);
	console.log('✅ Tabela password_reset_token criada!');
} catch (error: any) {
	console.error('❌ Erro ao criar tabela:', error.message);
}

db.close();
