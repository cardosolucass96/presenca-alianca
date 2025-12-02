import { eq, desc } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';
import type { Database } from '$lib/server/db';
import { product } from '$lib/server/db/schema';
import type { Product } from '$lib/server/db/schema';

function generateProductId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(10));
	return encodeBase64url(bytes);
}

export async function createProduct(db: Database, name: string): Promise<Product> {
	const id = generateProductId();

	const [newProduct] = await db
		.insert(product)
		.values({
			id,
			name: name.trim()
		})
		.returning();

	return newProduct;
}

export async function getAllProducts(db: Database, includeInactive = false): Promise<Product[]> {
	if (includeInactive) {
		return db.select().from(product).orderBy(desc(product.createdAt));
	}
	return db
		.select()
		.from(product)
		.where(eq(product.isActive, true))
		.orderBy(desc(product.createdAt));
}

export async function getActiveProducts(db: Database): Promise<Product[]> {
	return db
		.select()
		.from(product)
		.where(eq(product.isActive, true))
		.orderBy(desc(product.createdAt));
}

export async function getProductById(db: Database, id: string): Promise<Product | null> {
	const [result] = await db.select().from(product).where(eq(product.id, id));
	return result ?? null;
}

export async function updateProduct(db: Database, id: string, name: string): Promise<Product | null> {
	const [updated] = await db
		.update(product)
		.set({ name: name.trim() })
		.where(eq(product.id, id))
		.returning();

	return updated ?? null;
}

export async function toggleProductActive(db: Database, id: string): Promise<Product | null> {
	const existing = await getProductById(db, id);
	if (!existing) return null;

	const [updated] = await db
		.update(product)
		.set({ isActive: !existing.isActive })
		.where(eq(product.id, id))
		.returning();

	return updated ?? null;
}

export async function deleteProduct(db: Database, id: string): Promise<boolean> {
	const result = await db.delete(product).where(eq(product.id, id));
	return (result.rowsAffected ?? 0) > 0;
}
