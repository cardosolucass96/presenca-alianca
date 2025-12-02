import type { PageServerLoad } from './$types';
import * as reports from '$lib/server/reports';
import * as categories from '$lib/server/categories';
import * as products from '$lib/server/products';

export const load: PageServerLoad = async ({ url, locals }) => {
	// Parse filters from URL
	const fromDateParam = url.searchParams.get('fromDate');
	const toDateParam = url.searchParams.get('toDate');
	const categoryId = url.searchParams.get('categoryId') || undefined;
	const productId = url.searchParams.get('productId') || undefined;

	const filters: reports.ReportFilters = {
		categoryId,
		productId
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

	// Load all report data in parallel
	const [
		overviewStats,
		eventsAttendance,
		usersAttendance,
		attendanceTrends,
		categoryStats,
		productStats,
		monthlyTrends,
		detailedAttendances,
		allCategories,
		allProducts
	] = await Promise.all([
		reports.getOverviewStats(locals.db, filters),
		reports.getEventsAttendanceData(locals.db, filters),
		reports.getUsersAttendanceData(locals.db, filters),
		reports.getAttendanceTrends(locals.db, filters),
		reports.getCategoryStats(locals.db, filters),
		reports.getProductStats(locals.db, filters),
		reports.getMonthlyTrends(locals.db, filters),
		reports.getDetailedAttendances(locals.db, filters),
		categories.getActiveCategories(locals.db),
		products.getActiveProducts(locals.db)
	]);

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
			productId: productId || ''
		}
	};
};
