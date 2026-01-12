import { eq, desc, like, and, or, count } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { hashPassword } from './auth';

export async function getAllUsers(db: Database) {
	return await db
		.select({
			id: table.user.id,
			email: table.user.email,
			phone: table.user.phone,
			username: table.user.username,
			companyName: table.user.companyName,
			productId: table.user.productId,
			role: table.user.role,
			createdAt: table.user.createdAt
		})
		.from(table.user)
		.orderBy(desc(table.user.createdAt));
}

export async function getUserById(db: Database, id: string) {
	const [user] = await db
		.select({
			id: table.user.id,
			email: table.user.email,
			phone: table.user.phone,
			username: table.user.username,
			companyName: table.user.companyName,
			productId: table.user.productId,
			role: table.user.role,
			createdAt: table.user.createdAt
		})
		.from(table.user)
		.where(eq(table.user.id, id));
	return user ?? null;
}

export async function getUserWithProduct(db: Database, id: string) {
	const [result] = await db
		.select({
			user: {
				id: table.user.id,
				email: table.user.email,
				phone: table.user.phone,
				username: table.user.username,
				companyName: table.user.companyName,
				productId: table.user.productId,
				role: table.user.role,
				createdAt: table.user.createdAt
			},
			productName: table.product.name
		})
		.from(table.user)
		.leftJoin(table.product, eq(table.user.productId, table.product.id))
		.where(eq(table.user.id, id));
	return result ?? null;
}

export async function updateUser(
	db: Database,
	id: string,
	data: {
		email?: string;
		phone?: string | null;
		username?: string;
		companyName?: string;
		productId?: string | null;
		role?: 'user' | 'admin';
	}
) {
	const updateData: Record<string, unknown> = {};
	
	if (data.email !== undefined) updateData.email = data.email.toLowerCase();
	if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.replace(/\D/g, '') : null;
	if (data.username !== undefined) updateData.username = data.username;
	if (data.companyName !== undefined) updateData.companyName = data.companyName;
	if (data.productId !== undefined) updateData.productId = data.productId;
	if (data.role !== undefined) updateData.role = data.role;

	await db.update(table.user).set(updateData).where(eq(table.user.id, id));
}

export async function updateUserPassword(db: Database, id: string, newPassword: string) {
	const passwordHash = await hashPassword(newPassword);
	await db.update(table.user).set({ passwordHash }).where(eq(table.user.id, id));
}

export async function deleteUser(db: Database, id: string) {
	// Delete user's sessions first
	await db.delete(table.session).where(eq(table.session.userId, id));
	// Delete user's attendances
	await db.delete(table.attendance).where(eq(table.attendance.userId, id));
	// Delete user
	await db.delete(table.user).where(eq(table.user.id, id));
}

export async function getUsersWithProducts(db: Database) {
	return await db
		.select({
			id: table.user.id,
			email: table.user.email,
			phone: table.user.phone,
			username: table.user.username,
			companyName: table.user.companyName,
			productId: table.user.productId,
			productName: table.product.name,
			role: table.user.role,
			createdAt: table.user.createdAt
		})
		.from(table.user)
		.leftJoin(table.product, eq(table.user.productId, table.product.id))
		.orderBy(desc(table.user.createdAt));
}

export async function getUserAttendances(db: Database, userId: string) {
	return await db
		.select({
			attendance: table.attendance,
			event: {
				id: table.event.id,
				name: table.event.name,
				slug: table.event.slug,
				dateTime: table.event.dateTime,
				endTime: table.event.endTime
			}
		})
		.from(table.attendance)
		.innerJoin(table.event, eq(table.attendance.eventId, table.event.id))
		.where(eq(table.attendance.userId, userId))
		.orderBy(desc(table.event.dateTime));
}

export async function getUserEventsWithCategories(db: Database, userId: string) {
	const attendances = await db
		.select({
			eventId: table.event.id,
			eventName: table.event.name,
			eventSlug: table.event.slug,
			eventDateTime: table.event.dateTime,
			eventEndTime: table.event.endTime,
			eventMeetLink: table.event.meetLink,
			confirmedAt: table.attendance.confirmedAt,
			attended: table.attendance.attended
		})
		.from(table.attendance)
		.innerJoin(table.event, eq(table.attendance.eventId, table.event.id))
		.where(eq(table.attendance.userId, userId))
		.orderBy(desc(table.event.dateTime));

	// Buscar categorias para cada evento
	const eventsWithCategories = await Promise.all(
		attendances.map(async (att) => {
			const categories = await db
				.select({
					id: table.category.id,
					name: table.category.name,
					color: table.category.color
				})
				.from(table.eventCategory)
				.innerJoin(table.category, eq(table.eventCategory.categoryId, table.category.id))
				.where(eq(table.eventCategory.eventId, att.eventId));

			return {
				id: att.eventId,
				name: att.eventName,
				slug: att.eventSlug,
				dateTime: att.eventDateTime,
				endTime: att.eventEndTime,
				meetLink: att.eventMeetLink,
				confirmedAt: att.confirmedAt,
				attended: att.attended,
				categories
			};
		})
	);

	return eventsWithCategories;
}

export interface SearchUsersParams {
	query?: string;
	email?: string;
	phone?: string;
	companyName?: string;
	productId?: string;
	role?: 'user' | 'admin';
	limit?: number;
	offset?: number;
}

export async function searchUsers(db: Database, params: SearchUsersParams) {
	const { query, email, phone, companyName, productId, role, limit = 50, offset = 0 } = params;

	const conditions = [];

	if (query) {
		const searchPattern = `%${query}%`;
		conditions.push(
			or(
				like(table.user.username, searchPattern),
				like(table.user.email, searchPattern),
				like(table.user.companyName, searchPattern),
				like(table.user.phone, searchPattern)
			)
		);
	}

	if (email) conditions.push(like(table.user.email, `%${email}%`));
	if (phone) {
		const cleanPhone = phone.replace(/\D/g, '');
		conditions.push(like(table.user.phone, `%${cleanPhone}%`));
	}
	if (companyName) conditions.push(like(table.user.companyName, `%${companyName}%`));
	if (productId) conditions.push(eq(table.user.productId, productId));
	if (role) conditions.push(eq(table.user.role, role));

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ total: count() })
		.from(table.user)
		.where(whereClause);

	const users = await db
		.select({
			id: table.user.id,
			email: table.user.email,
			phone: table.user.phone,
			username: table.user.username,
			companyName: table.user.companyName,
			productId: table.user.productId,
			productName: table.product.name,
			role: table.user.role,
			createdAt: table.user.createdAt
		})
		.from(table.user)
		.leftJoin(table.product, eq(table.user.productId, table.product.id))
		.where(whereClause)
		.orderBy(desc(table.user.createdAt))
		.limit(limit)
		.offset(offset);

	return { users, total: countResult?.total ?? 0 };
}
