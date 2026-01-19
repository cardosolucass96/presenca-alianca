import type { PageServerLoad } from './$types';
import * as reports from '$lib/server/reports';
import * as categories from '$lib/server/categories';
import * as products from '$lib/server/products';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	try {
		// Parse filters from URL
		const fromDateParam = url.searchParams.get('fromDate');
		const toDateParam = url.searchParams.get('toDate');
		const categoryId = url.searchParams.get('categoryId') || undefined;
		const positionId = url.searchParams.get('positionId') || undefined;

		const filters: reports.ReportFilters = {
			categoryId,
			positionId
		};

		// Parse dates with Brazil timezone offset (UTC-3)
		// Server runs in UTC, so we add 3 hours to get correct Brazil time
		if (fromDateParam) {
			const [year, month, day] = fromDateParam.split('-').map(Number);
			filters.fromDate = new Date(Date.UTC(year, month - 1, day, 3, 0, 0));
		}
		if (toDateParam) {
			const [year, month, day] = toDateParam.split('-').map(Number);
			// End of day for toDate filter (23:59:59 Brazil = 02:59:59 next day UTC)
			filters.toDate = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59));
		}

		// Load data sequentially to avoid exceeding Cloudflare Workers resource limits
		// First batch: essential stats
		const [allCategories, allProducts] = await Promise.all([
			categories.getActiveCategories(locals.db),
			products.getActiveProducts(locals.db)
		]);

		const overviewStats = await reports.getOverviewStats(locals.db, filters);
		const eventsAttendance = await reports.getEventsAttendanceData(locals.db, filters);
		
		// attendanceTrends uses eventsAttendance internally, so we call it after
		const attendanceTrends = await reports.getAttendanceTrends(locals.db, filters);
		
		// Second batch: other stats
		const [categoryStats, productStats, monthlyTrends] = await Promise.all([
			reports.getCategoryStats(locals.db, filters),
			reports.getProductStats(locals.db, filters),
			reports.getMonthlyTrends(locals.db, filters)
		]);

		// These can be heavy, load separately
		const usersAttendance = await reports.getUsersAttendanceData(locals.db, filters);
		const detailedAttendances = await reports.getDetailedAttendances(locals.db, filters);

		return {
			overviewStats,
			eventsAttendance,
			usersAttendance,
			attendanceTrends,
			categoryStats,
			productStats,
			monthlyTrends,
			detailedAttendances,
			categories: allCategories,
			products: allProducts,
			filters: {
				fromDate: fromDateParam,
				toDate: toDateParam,
				categoryId: categoryId || '',
				positionId: positionId || ''
			}
		};
	} catch (e) {
		console.error('Reports page error:', e);
		throw error(500, { message: e instanceof Error ? e.message : 'Erro ao carregar relatórios' });
	}
};
