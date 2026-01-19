import { eq, desc, sql, and, gte, lte, count, asc, inArray } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export interface ReportFilters {
	fromDate?: Date;
	toDate?: Date;
	categoryId?: string;
	positionId?: string;
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
	positionId: string | null;
	productName: string | null;
	totalUsers: number;
	totalAttendances: number;
	averageAttendanceRate: number;
}

// Helper function to get filtered event IDs
async function getFilteredEventIds(db: Database, filters: ReportFilters): Promise<string[]> {
	const { fromDate, toDate, categoryId } = filters;

	const conditions = [eq(table.event.isActive, true)];
	if (fromDate) conditions.push(gte(table.event.dateTime, fromDate));
	if (toDate) conditions.push(lte(table.event.dateTime, toDate));

	let events = await db
		.select({ id: table.event.id })
		.from(table.event)
		.where(and(...conditions));

	if (categoryId) {
		const eventsWithCategory = await db
			.select({ eventId: table.eventCategory.eventId })
			.from(table.eventCategory)
			.where(eq(table.eventCategory.categoryId, categoryId));
		const categoryEventIds = new Set(eventsWithCategory.map(e => e.eventId));
		events = events.filter(e => categoryEventIds.has(e.id));
	}

	return events.map(e => e.id);
}

export async function getOverviewStats(db: Database, filters: ReportFilters = {}): Promise<OverviewStats> {
	const eventIds = await getFilteredEventIds(db, filters);

	if (eventIds.length === 0) {
		const [usersResult] = await db
			.select({ count: count() })
			.from(table.user)
			.where(eq(table.user.role, 'user'));

		return {
			totalEvents: 0,
			totalUsers: usersResult?.count ?? 0,
			totalAttendances: 0,
			averageAttendanceRate: 0,
			totalExpectedAttendees: 0
		};
	}

	// Get total expected attendees in one query
	const [expectedResult] = await db
		.select({ total: sql<number>`COALESCE(SUM(${table.event.expectedAttendees}), 0)` })
		.from(table.event)
		.where(inArray(table.event.id, eventIds));

	// Get total attendances in one query (excluding admins)
	const [attendanceResult] = await db
		.select({ count: count() })
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.where(and(
			inArray(table.attendance.eventId, eventIds),
			eq(table.user.role, 'user')
		));

	// Count users (excluding admins)
	const [usersResult] = await db
		.select({ count: count() })
		.from(table.user)
		.where(eq(table.user.role, 'user'));

	const totalExpected = Number(expectedResult?.total ?? 0);
	const totalAttendances = attendanceResult?.count ?? 0;
	const averageRate = totalExpected > 0 ? (totalAttendances / totalExpected) * 100 : 0;

	return {
		totalEvents: eventIds.length,
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

	if (events.length === 0) {
		return [];
	}

	const eventIds = events.map(e => e.id);

	// Get all attendance counts in one query
	const attendanceCounts = await db
		.select({
			eventId: table.attendance.eventId,
			count: count()
		})
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.where(and(
			inArray(table.attendance.eventId, eventIds),
			eq(table.user.role, 'user')
		))
		.groupBy(table.attendance.eventId);

	const attendanceMap = new Map(attendanceCounts.map(a => [a.eventId, a.count]));

	// Get all categories for all events in one query
	const allCategories = await db
		.select({
			eventId: table.eventCategory.eventId,
			id: table.category.id,
			name: table.category.name,
			color: table.category.color
		})
		.from(table.eventCategory)
		.innerJoin(table.category, eq(table.eventCategory.categoryId, table.category.id))
		.where(inArray(table.eventCategory.eventId, eventIds));

	const categoriesMap = new Map<string, { id: string; name: string; color: string }[]>();
	for (const cat of allCategories) {
		if (!categoriesMap.has(cat.eventId)) {
			categoriesMap.set(cat.eventId, []);
		}
		categoriesMap.get(cat.eventId)!.push({ id: cat.id, name: cat.name, color: cat.color });
	}

	return events.map(event => {
		const actualAttendees = attendanceMap.get(event.id) ?? 0;
		const attendanceRate = event.expectedAttendees > 0
			? (actualAttendees / event.expectedAttendees) * 100
			: 0;

		return {
			eventId: event.id,
			eventName: event.name,
			eventDate: event.dateTime,
			expectedAttendees: event.expectedAttendees,
			actualAttendees,
			attendanceRate: Math.round(attendanceRate * 10) / 10,
			categories: categoriesMap.get(event.id) ?? []
		};
	});
}

export async function getUsersAttendanceData(db: Database, filters: ReportFilters = {}): Promise<UserAttendanceData[]> {
	const { positionId } = filters;
	const eventIds = await getFilteredEventIds(db, filters);
	const totalEventsInPeriod = eventIds.length;

	// Get all users with their products
	const userConditions = [eq(table.user.role, 'user')];
	if (positionId) {
		userConditions.push(eq(table.user.positionId, positionId));
	}

	const users = await db
		.select({
			id: table.user.id,
			username: table.user.username,
			email: table.user.email,
			companyName: table.user.companyName,
			positionId: table.user.positionId,
			productName: table.product.name
		})
		.from(table.user)
		.leftJoin(table.product, eq(table.user.positionId, table.product.id))
		.where(and(...userConditions));

	if (users.length === 0) {
		return [];
	}

	const userIdsSet = new Set(users.map(u => u.id));
	const eventIdsSet = new Set(eventIds);

	// Get all attendances and filter in JavaScript to avoid too many SQL parameters
	// D1 has a limit on query parameters, so we fetch all and filter client-side
	const allAttendances = await db
		.select({
			userId: table.attendance.userId,
			eventId: table.attendance.eventId,
			confirmedAt: table.attendance.confirmedAt
		})
		.from(table.attendance);

	// Filter attendances by user IDs and event IDs
	const filteredAttendances = allAttendances.filter(att => 
		userIdsSet.has(att.userId) && 
		(eventIds.length === 0 || eventIdsSet.has(att.eventId))
	);

	// Group attendances by user
	const userAttendanceMap = new Map<string, Date[]>();
	for (const att of filteredAttendances) {
		if (!userAttendanceMap.has(att.userId)) {
			userAttendanceMap.set(att.userId, []);
		}
		userAttendanceMap.get(att.userId)!.push(att.confirmedAt);
	}

	return users.map(user => {
		const attendances = userAttendanceMap.get(user.id) ?? [];
		const attendedEvents = attendances.length;
		const attendanceRate = totalEventsInPeriod > 0
			? (attendedEvents / totalEventsInPeriod) * 100
			: 0;

		const lastAttendance = attendances.length > 0
			? new Date(Math.max(...attendances.map(a => a.getTime())))
			: null;

		return {
			userId: user.id,
			username: user.username,
			email: user.email,
			companyName: user.companyName,
			productName: user.productName,
			totalEvents: totalEventsInPeriod,
			attendedEvents,
			attendanceRate: Math.round(attendanceRate * 10) / 10,
			lastAttendance
		};
	}).sort((a, b) => b.attendanceRate - a.attendanceRate);
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

	if (categories.length === 0) {
		return [];
	}

	// Build event conditions
	const eventConditions = [eq(table.event.isActive, true)];
	if (fromDate) eventConditions.push(gte(table.event.dateTime, fromDate));
	if (toDate) eventConditions.push(lte(table.event.dateTime, toDate));

	// Get all events with their expected attendees
	const events = await db
		.select({
			id: table.event.id,
			expectedAttendees: table.event.expectedAttendees
		})
		.from(table.event)
		.where(and(...eventConditions));

	const eventMap = new Map(events.map(e => [e.id, e.expectedAttendees]));
	const eventIds = events.map(e => e.id);

	if (eventIds.length === 0) {
		return categories.map(category => ({
			categoryId: category.id,
			categoryName: category.name,
			categoryColor: category.color,
			totalEvents: 0,
			totalAttendees: 0,
			averageAttendanceRate: 0
		}));
	}

	// Get all event-category relationships
	const eventCategories = await db
		.select({
			eventId: table.eventCategory.eventId,
			categoryId: table.eventCategory.categoryId
		})
		.from(table.eventCategory)
		.where(inArray(table.eventCategory.eventId, eventIds));

	// Get all attendances for these events
	const attendanceCounts = await db
		.select({
			eventId: table.attendance.eventId,
			count: count()
		})
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.where(and(
			inArray(table.attendance.eventId, eventIds),
			eq(table.user.role, 'user')
		))
		.groupBy(table.attendance.eventId);

	const attendanceMap = new Map(attendanceCounts.map(a => [a.eventId, a.count]));

	// Calculate stats per category
	const categoryStats = new Map<string, { events: Set<string>; attendees: number; expected: number }>();
	
	for (const category of categories) {
		categoryStats.set(category.id, { events: new Set(), attendees: 0, expected: 0 });
	}

	for (const ec of eventCategories) {
		const stats = categoryStats.get(ec.categoryId);
		if (stats && eventMap.has(ec.eventId)) {
			stats.events.add(ec.eventId);
			stats.attendees += attendanceMap.get(ec.eventId) ?? 0;
			stats.expected += eventMap.get(ec.eventId) ?? 0;
		}
	}

	return categories.map(category => {
		const stats = categoryStats.get(category.id)!;
		const averageRate = stats.expected > 0 ? (stats.attendees / stats.expected) * 100 : 0;

		return {
			categoryId: category.id,
			categoryName: category.name,
			categoryColor: category.color,
			totalEvents: stats.events.size,
			totalAttendees: stats.attendees,
			averageAttendanceRate: Math.round(averageRate * 10) / 10
		};
	}).sort((a, b) => b.totalEvents - a.totalEvents);
}

export async function getProductStats(db: Database, filters: ReportFilters = {}): Promise<ProductStats[]> {
	const eventIds = await getFilteredEventIds(db, filters);
	
	// Get all products
	const products = await db.select().from(table.product);

	// Get user counts per product
	const userCounts = await db
		.select({
			positionId: table.user.positionId,
			count: count()
		})
		.from(table.user)
		.where(eq(table.user.role, 'user'))
		.groupBy(table.user.positionId);

	const userCountMap = new Map(userCounts.map(u => [u.positionId, u.count]));

	// Get attendance counts per position
	const attendanceConditions = [eq(table.user.role, 'user')];
	if (eventIds.length > 0) {
		attendanceConditions.push(inArray(table.attendance.eventId, eventIds));
	}

	const attendanceCounts = await db
		.select({
			positionId: table.user.positionId,
			count: count()
		})
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.where(and(...attendanceConditions))
		.groupBy(table.user.positionId);

	const attendanceMap = new Map(attendanceCounts.map(a => [a.positionId, a.count]));

	const result: ProductStats[] = products.map(product => {
		const totalUsers = userCountMap.get(product.id) ?? 0;
		const totalAttendances = attendanceMap.get(product.id) ?? 0;
		const totalExpected = eventIds.length * totalUsers;
		const averageRate = totalExpected > 0 ? (totalAttendances / totalExpected) * 100 : 0;

		return {
			positionId: product.id,
			productName: product.name,
			totalUsers,
			totalAttendances,
			averageAttendanceRate: Math.round(averageRate * 10) / 10
		};
	});

	// Add users without position
	const noPositionUsers = userCountMap.get(null) ?? 0;
	const noPositionAttendances = attendanceMap.get(null) ?? 0;

	result.push({
		positionId: null,
		productName: 'Sem cargo',
		totalUsers: noPositionUsers,
		totalAttendances: noPositionAttendances,
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
		.select({
			id: table.event.id,
			dateTime: table.event.dateTime,
			expectedAttendees: table.event.expectedAttendees
		})
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

	if (events.length === 0) {
		return [];
	}

	const eventIds = events.map(e => e.id);

	// Get all attendance counts in one query
	const attendanceCounts = await db
		.select({
			eventId: table.attendance.eventId,
			count: count()
		})
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.where(and(
			inArray(table.attendance.eventId, eventIds),
			eq(table.user.role, 'user')
		))
		.groupBy(table.attendance.eventId);

	const attendanceMap = new Map(attendanceCounts.map(a => [a.eventId, a.count]));

	// Aggregate by month
	const monthlyData = new Map<string, { events: number; attendees: number; expected: number }>();

	for (const event of events) {
		const monthKey = event.dateTime.toISOString().slice(0, 7);

		if (!monthlyData.has(monthKey)) {
			monthlyData.set(monthKey, { events: 0, attendees: 0, expected: 0 });
		}

		const data = monthlyData.get(monthKey)!;
		data.events++;
		data.expected += event.expectedAttendees;
		data.attendees += attendanceMap.get(event.id) ?? 0;
	}

	return Array.from(monthlyData.entries()).map(([month, data]) => ({
		month,
		events: data.events,
		attendees: data.attendees,
		rate: data.expected > 0 ? Math.round((data.attendees / data.expected) * 1000) / 10 : 0
	}));
}

export async function getDetailedAttendances(db: Database, filters: ReportFilters = {}): Promise<DetailedAttendance[]> {
	const { fromDate, toDate, categoryId, positionId } = filters;

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

	if (events.length === 0) {
		return [];
	}

	const eventIds = events.map(e => e.id);
	const eventMap = new Map(events.map(e => [e.id, e]));

	// Get all categories for all events in one query
	const allEventCategories = await db
		.select({
			eventId: table.eventCategory.eventId,
			name: table.category.name
		})
		.from(table.eventCategory)
		.innerJoin(table.category, eq(table.eventCategory.categoryId, table.category.id))
		.where(inArray(table.eventCategory.eventId, eventIds));

	const categoriesMap = new Map<string, string[]>();
	for (const cat of allEventCategories) {
		if (!categoriesMap.has(cat.eventId)) {
			categoriesMap.set(cat.eventId, []);
		}
		categoriesMap.get(cat.eventId)!.push(cat.name);
	}

	// Get all attendances with user and product info in one query
	const attendanceConditions = [
		inArray(table.attendance.eventId, eventIds),
		eq(table.user.role, 'user')
	];
	if (positionId) {
		attendanceConditions.push(eq(table.user.positionId, positionId));
	}

	const attendances = await db
		.select({
			eventId: table.attendance.eventId,
			userName: table.user.username,
			userEmail: table.user.email,
			userPhone: table.user.phone,
			userCompany: table.user.companyName,
			positionId: table.user.positionId,
			productName: table.product.name,
			confirmedAt: table.attendance.confirmedAt
		})
		.from(table.attendance)
		.innerJoin(table.user, eq(table.attendance.userId, table.user.id))
		.leftJoin(table.product, eq(table.user.positionId, table.product.id))
		.where(and(...attendanceConditions))
		.orderBy(asc(table.attendance.confirmedAt));

	return attendances.map(att => {
		const event = eventMap.get(att.eventId)!;
		return {
			userName: att.userName,
			userEmail: att.userEmail,
			userPhone: att.userPhone,
			userCompany: att.userCompany,
			userFunction: att.productName,
			eventName: event.name,
			eventDate: event.dateTime,
			eventEndTime: event.endTime,
			eventCategories: (categoriesMap.get(att.eventId) ?? []).join(', '),
			confirmedAt: att.confirmedAt
		};
	});
}
