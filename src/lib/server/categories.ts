import { eq, desc } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';
import type { Database } from '$lib/server/db';
import { category } from '$lib/server/db/schema';
import type { Category } from '$lib/server/db/schema';

function generateCategoryId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(10));
	return encodeBase64url(bytes);
}

export async function createCategory(db: Database, name: string, color: string = '#6366f1'): Promise<Category> {
	const id = generateCategoryId();

	const [newCategory] = await db
		.insert(category)
		.values({
			id,
			name: name.trim(),
			color
		})
		.returning();

	return newCategory;
}

export async function getAllCategories(db: Database, includeInactive = false): Promise<Category[]> {
	if (includeInactive) {
		return db.select().from(category).orderBy(desc(category.createdAt));
	}
	return db
		.select()
		.from(category)
		.where(eq(category.isActive, true))
		.orderBy(desc(category.createdAt));
}

export async function getActiveCategories(db: Database): Promise<Category[]> {
	return db
		.select()
		.from(category)
		.where(eq(category.isActive, true))
		.orderBy(desc(category.createdAt));
}

export async function getCategoryById(db: Database, id: string): Promise<Category | null> {
	const [result] = await db.select().from(category).where(eq(category.id, id));
	return result ?? null;
}

export async function updateCategory(db: Database, id: string, data: { name?: string; color?: string }): Promise<Category | null> {
	const updateData: Partial<Category> = {};
	if (data.name) updateData.name = data.name.trim();
	if (data.color) updateData.color = data.color;

	const [updated] = await db
		.update(category)
		.set(updateData)
		.where(eq(category.id, id))
		.returning();

	return updated ?? null;
}

export async function toggleCategoryActive(db: Database, id: string): Promise<Category | null> {
	const existing = await getCategoryById(db, id);
	if (!existing) return null;

	const [updated] = await db
		.update(category)
		.set({ isActive: !existing.isActive })
		.where(eq(category.id, id))
		.returning();

	return updated ?? null;
}

export async function deleteCategory(db: Database, id: string): Promise<boolean> {
	const result = await db.delete(category).where(eq(category.id, id));
	return (result.rowsAffected ?? 0) > 0;
}
