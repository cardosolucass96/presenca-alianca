import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const product = sqliteTable('product', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

export const category = sqliteTable('category', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	color: text('color').notNull().default('#6366f1'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	phone: text('phone').unique(),
	username: text('username').notNull(),
	companyName: text('company_name').notNull(),
	productId: text('product_id').references(() => product.id),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

export const passwordResetToken = sqliteTable('password_reset_token', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	token: text('token').notNull().unique(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	usedAt: integer('used_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const event = sqliteTable('event', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	dateTime: integer('date_time', { mode: 'timestamp' }).notNull(),
	endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
	meetLink: text('meet_link').notNull(),
	expectedAttendees: integer('expected_attendees').notNull().default(0),
	createdBy: text('created_by').notNull().references(() => user.id),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
});

export const eventCategory = sqliteTable('event_category', {
	eventId: text('event_id').notNull().references(() => event.id),
	categoryId: text('category_id').notNull().references(() => category.id)
}, (table) => [
	primaryKey({ columns: [table.eventId, table.categoryId] })
]);

export const attendance = sqliteTable('attendance', {
	id: text('id').primaryKey(),
	eventId: text('event_id').notNull().references(() => event.id),
	userId: text('user_id').notNull().references(() => user.id),
	confirmedAt: integer('confirmed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	attended: integer('attended', { mode: 'boolean' }).notNull().default(false)
});

export const apiKey = sqliteTable('api_key', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	key: text('key').notNull().unique(),
	createdBy: text('created_by').notNull().references(() => user.id),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Product = typeof product.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Event = typeof event.$inferSelect;
export type EventCategory = typeof eventCategory.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type ApiKey = typeof apiKey.$inferSelect;
export type PasswordResetToken = typeof passwordResetToken.$inferSelect;
