import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as apiKeys from '$lib/server/apiKeys';
import { getUserById, getUserEventsWithCategories } from '$lib/server/users';

// GET /api/users/[id]/events - Get all events a user has attended
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
			{ error: 'ID do usuário é obrigatório' },
			{ status: 400 }
		);
	}

	try {
		// Verificar se o usuário existe
		const user = await getUserById(locals.db, id);

		if (!user) {
			return json(
				{ error: 'Usuário não encontrado' },
				{ status: 404 }
			);
		}

		// Buscar eventos que o usuário participou
		const events = await getUserEventsWithCategories(locals.db, id);

		return json({
			success: true,
			data: {
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					companyName: user.companyName
				},
				events,
				total: events.length
			}
		});
	} catch (e) {
		console.error('Error fetching user events via API:', e);
		return json(
			{ error: 'Erro interno ao buscar eventos do usuário' },
			{ status: 500 }
		);
	}
};
