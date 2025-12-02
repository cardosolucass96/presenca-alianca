import { createClient } from '@libsql/client';

const client = createClient({
	url: 'file:./local.db'
});

async function migrate() {
	console.log('Applying category migration...');

	// Check if category table exists
	const tables = await client.execute(`
		SELECT name FROM sqlite_master WHERE type='table' AND name='category';
	`);

	if (tables.rows.length === 0) {
		// Create category table
		await client.execute(`
			CREATE TABLE category (
				id TEXT PRIMARY KEY NOT NULL,
				name TEXT NOT NULL,
				color TEXT DEFAULT '#6366f1' NOT NULL,
				is_active INTEGER DEFAULT 1 NOT NULL,
				created_at INTEGER NOT NULL
			);
		`);
		console.log('✓ Created category table');
	} else {
		console.log('- Category table already exists');
	}

	// Check if event_category table exists
	const eventCategoryTables = await client.execute(`
		SELECT name FROM sqlite_master WHERE type='table' AND name='event_category';
	`);

	if (eventCategoryTables.rows.length === 0) {
		// Create event_category junction table
		await client.execute(`
			CREATE TABLE event_category (
				event_id TEXT NOT NULL,
				category_id TEXT NOT NULL,
				PRIMARY KEY (event_id, category_id),
				FOREIGN KEY (event_id) REFERENCES event(id),
				FOREIGN KEY (category_id) REFERENCES category(id)
			);
		`);
		console.log('✓ Created event_category table');
	} else {
		console.log('- Event_category table already exists');
	}

	// Check if product_id column exists in event table
	const eventColumns = await client.execute(`PRAGMA table_info(event);`);
	const hasProductId = eventColumns.rows.some(row => row.name === 'product_id');

	if (hasProductId) {
		console.log('- Removing product_id from event table...');
		
		// Create new event table without product_id
		await client.execute(`
			CREATE TABLE event_new (
				id TEXT PRIMARY KEY NOT NULL,
				slug TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL,
				description TEXT,
				date_time INTEGER NOT NULL,
				end_time INTEGER NOT NULL,
				meet_link TEXT NOT NULL,
				expected_attendees INTEGER DEFAULT 0 NOT NULL,
				created_by TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				is_active INTEGER DEFAULT 1 NOT NULL,
				FOREIGN KEY (created_by) REFERENCES user(id)
			);
		`);

		// Copy data
		await client.execute(`
			INSERT INTO event_new (id, slug, name, description, date_time, end_time, meet_link, expected_attendees, created_by, created_at, is_active)
			SELECT id, slug, name, description, date_time, end_time, meet_link, expected_attendees, created_by, created_at, is_active FROM event;
		`);

		// Drop old table and rename new
		await client.execute(`DROP TABLE event;`);
		await client.execute(`ALTER TABLE event_new RENAME TO event;`);
		
		console.log('✓ Removed product_id from event table');
	} else {
		console.log('- product_id already removed from event table');
	}

	console.log('\n✅ Migration complete!');
}

migrate().catch(console.error);
