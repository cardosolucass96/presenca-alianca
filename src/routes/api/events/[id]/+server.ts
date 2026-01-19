import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as apiKeys from '$lib/server/apiKeys';
import * as events from '$lib/server/events';

// GET /api/events/[id] - Get event details with attendees
export const GET: RequestHandler = async ({ request, params, locals }) => {
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

	const { id } = params;

	if (!id) {
		return json(
			{ error: 'ID do evento é obrigatório' },
			{ status: 400 }
		);
	}

	try {
		// Buscar evento
		const event = await events.getEventById(locals.db, id);

		if (!event) {
			return json(
				{ error: 'Evento não encontrado' },
				{ status: 404 }
			);
		}

		// Buscar categorias do evento
		const categories = await events.getEventCategories(locals.db, id);

		// Buscar participantes
		const attendees = await events.getEventAttendees(locals.db, id);

		// Contar participantes confirmados
		const attendeesCount = await events.getEventAttendeesCount(locals.db, id);

		return json({
			success: true,
			data: {
				id: event.id,
				slug: event.slug,
				name: event.name,
				description: event.description,
				dateTime: event.dateTime,
				endTime: event.endTime,
				meetLink: event.meetLink,
				expectedAttendees: event.expectedAttendees,
				isActive: event.isActive,
				createdAt: event.createdAt,
				categories,
				attendeesCount,
				attendees: attendees.map(a => ({
					id: a.user.id,
					username: a.user.username,
					email: a.user.email,
					phone: a.user.phone,
					companyName: a.user.companyName,
					positionId: a.user.positionId,
					productName: 'productName' in a ? a.productName : null,
					role: a.user.role,
					createdAt: a.user.createdAt,
					confirmedAt: a.attendance.confirmedAt,
					attended: a.attendance.attended
				}))
			}
		});
	} catch (e) {
		console.error('Error fetching event via API:', e);
		return json(
			{ error: 'Erro interno ao buscar evento' },
			{ status: 500 }
		);
	}
};
