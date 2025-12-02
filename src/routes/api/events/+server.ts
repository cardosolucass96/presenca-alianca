import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as apiKeys from '$lib/server/apiKeys';
import * as events from '$lib/server/events';
import * as categories from '$lib/server/categories';

// GET /api/events - List events with filters
export const GET: RequestHandler = async ({ request, url, locals }) => {
	// Validate Bearer token
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return json(
			{ error: 'Token de autorização não fornecido' },
			{ status: 401 }
		);
	}

	const token = authHeader.slice(7);
	const apiKey = await apiKeys.validateApiKey(locals.db, token);
	
	if (!apiKey) {
		return json(
			{ error: 'Token de autorização inválido ou inativo' },
			{ status: 401 }
		);
	}

	// Get query parameters
	const query = url.searchParams.get('q') || undefined;
	const name = url.searchParams.get('name') || undefined;
	const slug = url.searchParams.get('slug') || undefined;
	const categoryId = url.searchParams.get('categoryId') || undefined;
	const isActive = url.searchParams.get('isActive');
	const fromDate = url.searchParams.get('fromDate') || undefined;
	const toDate = url.searchParams.get('toDate') || undefined;
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	// Parse dates with Brazil timezone offset (UTC-3)
	// Server runs in UTC, so we add 3 hours to get correct Brazil time
	let parsedFromDate: Date | undefined;
	let parsedToDate: Date | undefined;
	
	if (fromDate) {
		if (fromDate.includes('T')) {
			// Full ISO datetime - use as-is (already in UTC)
			parsedFromDate = new Date(fromDate);
		} else {
			// Date only - parse as Brazil time start of day
			const [year, month, day] = fromDate.split('-').map(Number);
			parsedFromDate = new Date(Date.UTC(year, month - 1, day, 3, 0, 0));
		}
	}
	
	if (toDate) {
		if (toDate.includes('T')) {
			// Full ISO datetime - use as-is (already in UTC)
			parsedToDate = new Date(toDate);
		} else {
			// Date only - parse as Brazil time end of day (23:59:59 = 02:59:59 next day UTC)
			const [year, month, day] = toDate.split('-').map(Number);
			parsedToDate = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59));
		}
	}

	try {
		const result = await events.searchEvents(locals.db, {
			query,
			name,
			slug,
			categoryId,
			isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
			fromDate: parsedFromDate,
			toDate: parsedToDate,
			limit: Math.min(limit, 100),
			offset
		});

		return json({
			success: true,
			data: result.events,
			total: result.total,
			limit,
			offset
		});
	} catch (e) {
		console.error('Error fetching events via API:', e);
		return json(
			{ error: 'Erro interno ao buscar eventos' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	// Validate Bearer token
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return json(
			{ error: 'Token de autorização não fornecido' },
			{ status: 401 }
		);
	}

	const token = authHeader.slice(7);
	const apiKey = await apiKeys.validateApiKey(locals.db, token);
	
	if (!apiKey) {
		return json(
			{ error: 'Token de autorização inválido ou inativo' },
			{ status: 401 }
		);
	}

	// Parse and validate body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(
			{ error: 'Corpo da requisição deve ser um JSON válido' },
			{ status: 400 }
		);
	}

	if (typeof body !== 'object' || body === null) {
		return json(
			{ error: 'Corpo da requisição inválido' },
			{ status: 400 }
		);
	}

	const { name, description, dateTime, endTime, meetLink, expectedAttendees, categoryIds } = body as Record<string, unknown>;

	// Validate required fields
	const errors: string[] = [];

	if (typeof name !== 'string' || !name.trim()) {
		errors.push('Nome do evento é obrigatório');
	} else if (name.trim().length < 3) {
		errors.push('Nome do evento deve ter pelo menos 3 caracteres');
	}

	if (typeof dateTime !== 'string' || !dateTime) {
		errors.push('Data/hora de início é obrigatória');
	}

	if (typeof endTime !== 'string' || !endTime) {
		errors.push('Data/hora de término é obrigatória');
	}

	if (typeof meetLink !== 'string' || !meetLink.trim()) {
		errors.push('Link do Meet é obrigatório');
	}

	// Validate dates
	let startDate: Date | null = null;
	let endDate: Date | null = null;

	if (typeof dateTime === 'string') {
		startDate = new Date(dateTime);
		if (isNaN(startDate.getTime())) {
			errors.push('Data/hora de início inválida');
		}
	}

	if (typeof endTime === 'string') {
		endDate = new Date(endTime);
		if (isNaN(endDate.getTime())) {
			errors.push('Data/hora de término inválida');
		}
	}

	if (startDate && endDate && endDate <= startDate) {
		errors.push('Data/hora de término deve ser após o início');
	}

	// Validate expectedAttendees
	let attendeesCount = 0;
	if (expectedAttendees !== undefined && expectedAttendees !== null) {
		if (typeof expectedAttendees !== 'number' || expectedAttendees < 0) {
			errors.push('Número de participantes esperados deve ser um número positivo');
		} else {
			attendeesCount = Math.floor(expectedAttendees);
		}
	}

	// Validate categoryIds if provided
	const validCategoryIds: string[] = [];
	if (categoryIds !== undefined && categoryIds !== null) {
		if (!Array.isArray(categoryIds)) {
			errors.push('categoryIds deve ser um array');
		} else {
			for (const catId of categoryIds) {
				if (typeof catId !== 'string') {
					errors.push('Cada categoryId deve ser uma string');
					break;
				}
				const cat = await categories.getCategoryById(locals.db, catId);
				if (!cat) {
					errors.push(`Categoria não encontrada: ${catId}`);
				} else if (!cat.isActive) {
					errors.push(`Categoria inativa: ${cat.name}`);
				} else {
					validCategoryIds.push(catId);
				}
			}
		}
	}

	if (errors.length > 0) {
		return json(
			{ error: 'Dados inválidos', details: errors },
			{ status: 400 }
		);
	}

	// Create event
	try {
		const result = await events.createEvent(
			locals.db,
			(name as string).trim(),
			startDate!,
			endDate!,
			(meetLink as string).trim(),
			attendeesCount,
			apiKey.createdBy, // O criador da API key é o criador do evento
			validCategoryIds,
			typeof description === 'string' ? description.trim() : undefined
		);

		return json(
			{
				success: true,
				message: 'Evento criado com sucesso',
				eventId: result.id,
				slug: result.slug
			},
			{ status: 201 }
		);
	} catch (e) {
		console.error('Error creating event via API:', e);
		return json(
			{ error: 'Erro interno ao criar evento' },
			{ status: 500 }
		);
	}
};
