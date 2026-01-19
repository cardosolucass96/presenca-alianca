import { eq, desc, sql, like, and, or, gte, lte, count } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';
import type { Database } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export function generateEventId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase64url(bytes);
}

export function generateSlug(name: string): string {
	const base = name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 30);
	
	const random = crypto.getRandomValues(new Uint8Array(4));
	const suffix = encodeBase64url(random).slice(0, 6).toLowerCase();
	
	return `${base}-${suffix}`;
}

export async function createEvent(
	db: Database,
	name: string,
	dateTime: Date,
	endTime: Date,
	meetLink: string,
	expectedAttendees: number,
	createdBy: string,
	categoryIds: string[] = [],
	description?: string
) {
	const eventId = generateEventId();
	const slug = generateSlug(name);

	await db.insert(table.event).values({
		id: eventId,
		slug,
		name,
		description,
		dateTime,
		endTime,
		meetLink,
		expectedAttendees,
		createdBy
	});

	if (categoryIds.length > 0) {
		await db.insert(table.eventCategory).values(
			categoryIds.map(categoryId => ({
				eventId,
				categoryId
			}))
		);
	}

	return { id: eventId, slug };
}

export async function getEventBySlug(db: Database, slug: string) {
	const [event] = await db
		.select()
		.from(table.event)
		.where(eq(table.event.slug, slug));
	return event ?? null;
}

export async function getEventById(db: Database, id: string) {
	const [event] = await db
		.select()
		.from(table.event)
		.where(eq(table.event.id, id));
	return event ?? null;
}

export async function getAllEvents(db: Database) {
	return await db
		.select()
		.from(table.event)
		.orderBy(desc(table.event.dateTime));
}

export async function getActiveEvents(db: Database) {
	return await db
		.select()
		.from(table.event)
		.where(eq(table.event.isActive, true))
		.orderBy(desc(table.event.dateTime));
}

export async function confirmAttendance(db: Database, eventId: string, userId: string) {
	const attendanceId = generateEventId();
	
	const [existing] = await db
		.select()
		.from(table.attendance)
		.where(sql`${table.attendance.eventId} = ${eventId} AND ${table.attendance.userId} = ${userId}`);
	
	if (existing) return existing;

	await db.insert(table.attendance).values({
		id: attendanceId,
		eventId,
		userId
	});

	return { id: attendanceId, eventId, userId };
}

export async function getEventAttendees(db: Database, eventId: string) {
	return await db
		.select({
			attendance: table.attendance,
			user: {
				id: table.user.id,
				username: table.user.username,
				email: table.user.email,
				phone: table.user.phone,
				companyName: table.user.companyName,
				positionId: table.user.positionId,
				role: table.user.role,
				createdAt: table.user.createdAt
			},
			productName: table.product.name
		})
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.leftJoin(table.product, eq(table.user.positionId, table.product.id))
		.where(and(
			eq(table.attendance.eventId, eventId),
			eq(table.user.role, 'user') // Exclui administradores
		));
}

export async function getEventAttendeesCount(db: Database, eventId: string) {
	const [result] = await db
		.select({ count: sql<number>`count(*)` })
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.where(and(
			eq(table.attendance.eventId, eventId),
			eq(table.user.role, 'user') // Exclui administradores
		));
	return result?.count ?? 0;
}

export async function isUserAttending(db: Database, eventId: string, userId: string) {
	const [existing] = await db
		.select()
		.from(table.attendance)
		.where(sql`${table.attendance.eventId} = ${eventId} AND ${table.attendance.userId} = ${userId}`);
	return !!existing;
}

export async function updateEvent(
	db: Database,
	id: string,
	data: Partial<{
		name: string;
		description: string;
		dateTime: Date;
		endTime: Date;
		meetLink: string;
		expectedAttendees: number;
		isActive: boolean;
	}>,
	categoryIds?: string[]
) {
	await db.update(table.event).set(data).where(eq(table.event.id, id));
	
	if (categoryIds !== undefined) {
		await db.delete(table.eventCategory).where(eq(table.eventCategory.eventId, id));
		
		if (categoryIds.length > 0) {
			await db.insert(table.eventCategory).values(
				categoryIds.map(categoryId => ({
					eventId: id,
					categoryId
				}))
			);
		}
	}
}

export async function getEventCategories(db: Database, eventId: string) {
	return await db
		.select({
			id: table.category.id,
			name: table.category.name,
			color: table.category.color
		})
		.from(table.eventCategory)
		.innerJoin(table.category, eq(table.eventCategory.categoryId, table.category.id))
		.where(eq(table.eventCategory.eventId, eventId));
}

export async function deleteEvent(db: Database, id: string) {
	await db.delete(table.eventCategory).where(eq(table.eventCategory.eventId, id));
	await db.delete(table.attendance).where(eq(table.attendance.eventId, id));
	await db.delete(table.event).where(eq(table.event.id, id));
}

export interface SearchEventsParams {
	query?: string;
	name?: string;
	slug?: string;
	categoryId?: string;
	isActive?: boolean;
	fromDate?: Date;
	toDate?: Date;
	limit?: number;
	offset?: number;
}

export async function searchEvents(db: Database, params: SearchEventsParams) {
	const { query, name, slug, categoryId, isActive, fromDate, toDate, limit = 50, offset = 0 } = params;

	const conditions = [];

	if (query) {
		const searchPattern = `%${query}%`;
		conditions.push(
			or(
				like(table.event.name, searchPattern),
				like(table.event.description, searchPattern),
				like(table.event.slug, searchPattern)
			)
		);
	}

	if (name) conditions.push(like(table.event.name, `%${name}%`));
	if (slug) conditions.push(like(table.event.slug, `%${slug}%`));
	if (isActive !== undefined) conditions.push(eq(table.event.isActive, isActive));
	if (fromDate) conditions.push(gte(table.event.dateTime, fromDate));
	if (toDate) conditions.push(lte(table.event.dateTime, toDate));

	if (categoryId) {
		const eventIdsWithCategory = db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.where(eq(table.eventCategory.categoryId, categoryId));
		
		conditions.push(sql`${table.event.id} IN (${eventIdsWithCategory})`);
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ total: count() })
		.from(table.event)
		.where(whereClause);

	const eventsResult = await db
		.select({
			id: table.event.id,
			slug: table.event.slug,
			name: table.event.name,
			description: table.event.description,
			dateTime: table.event.dateTime,
			endTime: table.event.endTime,
			meetLink: table.event.meetLink,
			expectedAttendees: table.event.expectedAttendees,
			isActive: table.event.isActive,
			createdAt: table.event.createdAt
		})
		.from(table.event)
		.where(whereClause)
		.orderBy(desc(table.event.dateTime))
		.limit(limit)
		.offset(offset);

	const eventsWithCategories = await Promise.all(
		eventsResult.map(async (event) => {
			const categories = await getEventCategories(db, event.id);
			const attendeesCount = await getEventAttendeesCount(db, event.id);
			return { ...event, categories, attendeesCount };
		})
	);

	return { events: eventsWithCategories, total: countResult?.total ?? 0 };
}
