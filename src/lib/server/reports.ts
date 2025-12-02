import { eq, desc, sql, and, gte, lte, count, asc } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export interface ReportFilters {
	fromDate?: Date;
	toDate?: Date;
	categoryId?: string;
	productId?: string;
}

export interface DetailedAttendance {
	userName: string;
	userEmail: string;
	userPhone: string | null;
	userCompany: string;
	userFunction: string | null;
	eventName: string;
	eventDate: Date;
	eventEndTime: Date;
	eventCategories: string;
	confirmedAt: Date;
}

export interface EventAttendanceData {
	eventId: string;
	eventName: string;
	eventDate: Date;
	expectedAttendees: number;
	actualAttendees: number;
	attendanceRate: number;
	categories: { id: string; name: string; color: string }[];
}

export interface UserAttendanceData {
	userId: string;
	username: string;
	email: string;
	companyName: string;
	productName: string | null;
	totalEvents: number;
	attendedEvents: number;
	attendanceRate: number;
	lastAttendance: Date | null;
}

export interface OverviewStats {
	totalEvents: number;
	totalUsers: number;
	totalAttendances: number;
	averageAttendanceRate: number;
	totalExpectedAttendees: number;
}

export interface AttendanceTrend {
	date: string;
	eventName: string;
	attendanceRate: number;
	attendees: number;
	expected: number;
}

export interface CategoryStats {
	categoryId: string;
	categoryName: string;
	categoryColor: string;
	totalEvents: number;
	totalAttendees: number;
	averageAttendanceRate: number;
}

export interface ProductStats {
	productId: string | null;
	productName: string | null;
	totalUsers: number;
	totalAttendances: number;
	averageAttendanceRate: number;
}

export async function getOverviewStats(db: Database, filters: ReportFilters = {}): Promise<OverviewStats> {
	const { fromDate, toDate, categoryId } = filters;

	const eventConditions = [];
	if (fromDate) eventConditions.push(gte(table.event.dateTime, fromDate));
	if (toDate) eventConditions.push(lte(table.event.dateTime, toDate));
	eventConditions.push(eq(table.event.isActive, true));

	let eventIds: string[] | null = null;
	if (categoryId) {
		const eventsWithCategory = await db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.where(eq(table.eventCategory.categoryId, categoryId));
		eventIds = eventsWithCategory.map(e => e.eventId);
	}

	const events = await db.select().from(table.event).where(and(...eventConditions));
	const filteredEvents = eventIds ? events.filter(e => eventIds!.includes(e.id)) : events;

	let totalAttendances = 0;
	let totalExpected = 0;

	for (const event of filteredEvents) {
		const [attendanceResult] = await db
			.select({ count: count() })
			.from(table.attendance)
			.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
			.where(and(
				eq(table.attendance.eventId, event.id),
				eq(table.user.role, 'user') // Exclui administradores
			));
		totalAttendances += attendanceResult?.count ?? 0;
		totalExpected += event.expectedAttendees;
	}

	// Conta apenas usuários não-admin
	const [usersResult] = await db
		.select({ count: count() })
		.from(table.user)
		.where(eq(table.user.role, 'user'));
	const averageRate = totalExpected > 0 ? (totalAttendances / totalExpected) * 100 : 0;

	return {
		totalEvents: filteredEvents.length,
		totalUsers: usersResult?.count ?? 0,
		totalAttendances,
		averageAttendanceRate: Math.round(averageRate * 10) / 10,
		totalExpectedAttendees: totalExpected
	};
}

export async function getEventsAttendanceData(db: Database, filters: ReportFilters = {}): Promise<EventAttendanceData[]> {
	const { fromDate, toDate, categoryId } = filters;

	const conditions = [eq(table.event.isActive, true)];
	if (fromDate) conditions.push(gte(table.event.dateTime, fromDate));
	if (toDate) conditions.push(lte(table.event.dateTime, toDate));

	let events = await db
		.select()
		.from(table.event)
		.where(and(...conditions))
		.orderBy(desc(table.event.dateTime));

	if (categoryId) {
		const eventsWithCategory = await db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.where(eq(table.eventCategory.categoryId, categoryId));
		const eventIds = new Set(eventsWithCategory.map(e => e.eventId));
		events = events.filter(e => eventIds.has(e.id));
	}

	const result: EventAttendanceData[] = [];

	for (const event of events) {
		const [attendanceResult] = await db
			.select({ count: count() })
			.from(table.attendance)
			.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
			.where(and(
				eq(table.attendance.eventId, event.id),
				eq(table.user.role, 'user') // Exclui administradores
			));

		const categories = await db
			.select({
				id: table.category.id,
				name: table.category.name,
				color: table.category.color
			})
			.from(table.eventCategory)
			.innerJoin(table.category, eq(table.eventCategory.categoryId, table.category.id))
			.where(eq(table.eventCategory.eventId, event.id));

		const actualAttendees = attendanceResult?.count ?? 0;
		const attendanceRate = event.expectedAttendees > 0
			? (actualAttendees / event.expectedAttendees) * 100
			: 0;

		result.push({
			eventId: event.id,
			eventName: event.name,
			eventDate: event.dateTime,
			expectedAttendees: event.expectedAttendees,
			actualAttendees,
			attendanceRate: Math.round(attendanceRate * 10) / 10,
			categories
		});
	}

	return result;
}

export async function getUsersAttendanceData(db: Database, filters: ReportFilters = {}): Promise<UserAttendanceData[]> {
	const { fromDate, toDate, categoryId, productId } = filters;

	const eventConditions = [eq(table.event.isActive, true)];
	if (fromDate) eventConditions.push(gte(table.event.dateTime, fromDate));
	if (toDate) eventConditions.push(lte(table.event.dateTime, toDate));

	let events = await db
		.select({ id: table.event.id })
		.from(table.event)
		.where(and(...eventConditions));

	if (categoryId) {
		const eventsWithCategory = await db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.where(eq(table.eventCategory.categoryId, categoryId));
		const eventIds = new Set(eventsWithCategory.map(e => e.eventId));
		events = events.filter(e => eventIds.has(e.id));
	}

	const eventIds = events.map(e => e.id);
	const totalEventsInPeriod = eventIds.length;

	const users = await db
		.select({
			id: table.user.id,
			username: table.user.username,
			email: table.user.email,
			companyName: table.user.companyName,
			productId: table.user.productId,
			productName: table.product.name
		})
		.from(table.user)
		.leftJoin(table.product, eq(table.user.productId, table.product.id))
		.where(eq(table.user.role, 'user'));

	const filteredUsers = productId ? users.filter(u => u.productId === productId) : users;

	const result: UserAttendanceData[] = [];

	for (const user of filteredUsers) {
		const attendances = await db
			.select({
				eventId: table.attendance.eventId,
				confirmedAt: table.attendance.confirmedAt
			})
			.from(table.attendance)
			.where(eq(table.attendance.userId, user.id));

		const filteredAttendances = eventIds.length > 0
			? attendances.filter(a => eventIds.includes(a.eventId))
			: attendances;

		const attendedEvents = filteredAttendances.length;
		const attendanceRate = totalEventsInPeriod > 0
			? (attendedEvents / totalEventsInPeriod) * 100
			: 0;

		const lastAttendance = filteredAttendances.length > 0
			? new Date(Math.max(...filteredAttendances.map(a => a.confirmedAt.getTime())))
			: null;

		result.push({
			userId: user.id,
			username: user.username,
			email: user.email,
			companyName: user.companyName,
			productName: user.productName,
			totalEvents: totalEventsInPeriod,
			attendedEvents,
			attendanceRate: Math.round(attendanceRate * 10) / 10,
			lastAttendance
		});
	}

	return result.sort((a, b) => b.attendanceRate - a.attendanceRate);
}

export async function getAttendanceTrends(db: Database, filters: ReportFilters = {}): Promise<AttendanceTrend[]> {
	const eventsData = await getEventsAttendanceData(db, filters);

	return eventsData
		.slice(0, 20)
		.reverse()
		.map(event => ({
			date: event.eventDate.toISOString().split('T')[0],
			eventName: event.eventName,
			attendanceRate: event.attendanceRate,
			attendees: event.actualAttendees,
			expected: event.expectedAttendees
		}));
}

export async function getCategoryStats(db: Database, filters: ReportFilters = {}): Promise<CategoryStats[]> {
	const { fromDate, toDate } = filters;

	const categories = await db
		.select()
		.from(table.category)
		.where(eq(table.category.isActive, true));

	const result: CategoryStats[] = [];

	for (const category of categories) {
		const eventConditions = [eq(table.event.isActive, true)];
		if (fromDate) eventConditions.push(gte(table.event.dateTime, fromDate));
		if (toDate) eventConditions.push(lte(table.event.dateTime, toDate));

		const eventsInCategory = await db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.innerJoin(table.event, eq(table.eventCategory.eventId, table.event.id))
			.where(and(
				eq(table.eventCategory.categoryId, category.id),
				...eventConditions
			));

		const eventIds = eventsInCategory.map(e => e.eventId);

		if (eventIds.length === 0) {
			result.push({
				categoryId: category.id,
				categoryName: category.name,
				categoryColor: category.color,
				totalEvents: 0,
				totalAttendees: 0,
				averageAttendanceRate: 0
			});
			continue;
		}

		let totalAttendees = 0;
		let totalExpected = 0;

		for (const eventId of eventIds) {
			const [event] = await db
				.select({ expectedAttendees: table.event.expectedAttendees })
				.from(table.event)
				.where(eq(table.event.id, eventId));

			const [attendanceResult] = await db
				.select({ count: count() })
				.from(table.attendance)
				.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
				.where(and(
					eq(table.attendance.eventId, eventId),
					eq(table.user.role, 'user') // Exclui administradores
				));

			totalAttendees += attendanceResult?.count ?? 0;
			totalExpected += event?.expectedAttendees ?? 0;
		}

		const averageRate = totalExpected > 0 ? (totalAttendees / totalExpected) * 100 : 0;

		result.push({
			categoryId: category.id,
			categoryName: category.name,
			categoryColor: category.color,
			totalEvents: eventIds.length,
			totalAttendees,
			averageAttendanceRate: Math.round(averageRate * 10) / 10
		});
	}

	return result.sort((a, b) => b.totalEvents - a.totalEvents);
}

export async function getProductStats(db: Database, filters: ReportFilters = {}): Promise<ProductStats[]> {
	const { fromDate, toDate, categoryId } = filters;

	const eventConditions = [eq(table.event.isActive, true)];
	if (fromDate) eventConditions.push(gte(table.event.dateTime, fromDate));
	if (toDate) eventConditions.push(lte(table.event.dateTime, toDate));

	let events = await db
		.select({ id: table.event.id, expectedAttendees: table.event.expectedAttendees })
		.from(table.event)
		.where(and(...eventConditions));

	if (categoryId) {
		const eventsWithCategory = await db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.where(eq(table.eventCategory.categoryId, categoryId));
		const eventIds = new Set(eventsWithCategory.map(e => e.eventId));
		events = events.filter(e => eventIds.has(e.id));
	}

	const eventIds = events.map(e => e.id);
	const products = await db.select().from(table.product);

	const result: ProductStats[] = [];

	for (const product of products) {
		const [usersResult] = await db
			.select({ count: count() })
			.from(table.user)
			.where(and(
				eq(table.user.productId, product.id),
				eq(table.user.role, 'user') // Exclui administradores
			));

		const attendances = await db
			.select({ eventId: table.attendance.eventId })
			.from(table.attendance)
			.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
			.where(and(
				eq(table.user.productId, product.id),
				eq(table.user.role, 'user') // Exclui administradores
			));

		const filteredAttendances = eventIds.length > 0
			? attendances.filter(a => eventIds.includes(a.eventId))
			: attendances;

		const totalAttendances = filteredAttendances.length;
		const totalExpected = events.reduce((sum) => sum + (usersResult?.count ?? 0), 0);
		const averageRate = totalExpected > 0 ? (totalAttendances / totalExpected) * 100 : 0;

		result.push({
			productId: product.id,
			productName: product.name,
			totalUsers: usersResult?.count ?? 0,
			totalAttendances,
			averageAttendanceRate: Math.round(averageRate * 10) / 10
		});
	}

	const [noProductUsers] = await db
		.select({ count: count() })
		.from(table.user)
		.where(and(
			sql`${table.user.productId} IS NULL`,
			eq(table.user.role, 'user') // Exclui administradores
		));

	const noProductAttendances = await db
		.select({ eventId: table.attendance.eventId })
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.where(and(
			sql`${table.user.productId} IS NULL`,
			eq(table.user.role, 'user') // Exclui administradores
		));

	const filteredNoProductAttendances = eventIds.length > 0
		? noProductAttendances.filter(a => eventIds.includes(a.eventId))
		: noProductAttendances;

	result.push({
		productId: null,
		productName: 'Sem cargo',
		totalUsers: noProductUsers?.count ?? 0,
		totalAttendances: filteredNoProductAttendances.length,
		averageAttendanceRate: 0
	});

	return result.sort((a, b) => b.totalUsers - a.totalUsers);
}

export async function getMonthlyTrends(db: Database, filters: ReportFilters = {}): Promise<{ month: string; events: number; attendees: number; rate: number }[]> {
	const { categoryId } = filters;

	const twelveMonthsAgo = new Date();
	twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

	const conditions = [
		eq(table.event.isActive, true),
		gte(table.event.dateTime, twelveMonthsAgo)
	];

	let events = await db
		.select()
		.from(table.event)
		.where(and(...conditions))
		.orderBy(table.event.dateTime);

	if (categoryId) {
		const eventsWithCategory = await db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.where(eq(table.eventCategory.categoryId, categoryId));
		const eventIds = new Set(eventsWithCategory.map(e => e.eventId));
		events = events.filter(e => eventIds.has(e.id));
	}

	const monthlyData = new Map<string, { events: number; attendees: number; expected: number }>();

	for (const event of events) {
		const monthKey = event.dateTime.toISOString().slice(0, 7);

		if (!monthlyData.has(monthKey)) {
			monthlyData.set(monthKey, { events: 0, attendees: 0, expected: 0 });
		}

		const data = monthlyData.get(monthKey)!;
		data.events++;
		data.expected += event.expectedAttendees;

		const [attendanceResult] = await db
			.select({ count: count() })
			.from(table.attendance)
			.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
			.where(and(
				eq(table.attendance.eventId, event.id),
				eq(table.user.role, 'user') // Exclui administradores
			));

		data.attendees += attendanceResult?.count ?? 0;
	}

	return Array.from(monthlyData.entries()).map(([month, data]) => ({
		month,
		events: data.events,
		attendees: data.attendees,
		rate: data.expected > 0 ? Math.round((data.attendees / data.expected) * 1000) / 10 : 0
	}));
}

export async function getDetailedAttendances(db: Database, filters: ReportFilters = {}): Promise<DetailedAttendance[]> {
	const { fromDate, toDate, categoryId, productId } = filters;

	const eventConditions = [eq(table.event.isActive, true)];
	if (fromDate) eventConditions.push(gte(table.event.dateTime, fromDate));
	if (toDate) eventConditions.push(lte(table.event.dateTime, toDate));

	let events = await db
		.select()
		.from(table.event)
		.where(and(...eventConditions))
		.orderBy(asc(table.event.dateTime));

	if (categoryId) {
		const eventsWithCategory = await db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.where(eq(table.eventCategory.categoryId, categoryId));
		const eventIds = new Set(eventsWithCategory.map(e => e.eventId));
		events = events.filter(e => eventIds.has(e.id));
	}

	const result: DetailedAttendance[] = [];

	for (const event of events) {
		// Get categories for this event
		const eventCategories = await db
			.select({ name: table.category.name })
			.from(table.eventCategory)
			.innerJoin(table.category, eq(table.eventCategory.categoryId, table.category.id))
			.where(eq(table.eventCategory.eventId, event.id));
		
		const categoriesStr = eventCategories.map(c => c.name).join(', ');

		// Get attendances for this event (excluding admins)
		const attendances = await db
			.select({
				userName: table.user.username,
				userEmail: table.user.email,
				userPhone: table.user.phone,
				userCompany: table.user.companyName,
				productId: table.user.productId,
				confirmedAt: table.attendance.confirmedAt
			})
			.from(table.attendance)
			.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
			.where(and(
				eq(table.attendance.eventId, event.id),
				eq(table.user.role, 'user')
			))
			.orderBy(asc(table.attendance.confirmedAt));

		for (const attendance of attendances) {
			// Filter by productId if specified
			if (productId && attendance.productId !== productId) {
				continue;
			}

			// Get product/function name
			let functionName: string | null = null;
			if (attendance.productId) {
				const [product] = await db
					.select({ name: table.product.name })
					.from(table.product)
					.where(eq(table.product.id, attendance.productId));
				functionName = product?.name ?? null;
			}

			result.push({
				userName: attendance.userName,
				userEmail: attendance.userEmail,
				userPhone: attendance.userPhone,
				userCompany: attendance.userCompany,
				userFunction: functionName,
				eventName: event.name,
				eventDate: event.dateTime,
				eventEndTime: event.endTime,
				eventCategories: categoriesStr,
				confirmedAt: attendance.confirmedAt
			});
		}
	}

	return result;
}
