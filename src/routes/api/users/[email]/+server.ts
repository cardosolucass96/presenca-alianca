import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as apiKeys from '$lib/server/apiKeys';
import { getUserByEmail } from '$lib/server/auth';
import { getUserEventsWithCategories } from '$lib/server/users';

// GET /api/users/[email] - Get user details with all events they attended
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

	const { email } = params;

	if (!email) {
		return json(
			{ error: 'Email do usuário é obrigatório' },
			{ status: 400 }
		);
	}

	// Decode email (pode vir URL encoded)
	const decodedEmail = decodeURIComponent(email).toLowerCase();

	try {
		// Buscar usuário pelo email
		const user = await getUserByEmail(locals.db, decodedEmail);

		if (!user) {
			return json(
				{ error: 'Usuário não encontrado' },
				{ status: 404 }
			);
		}

		// Buscar eventos que o usuário participou
		const events = await getUserEventsWithCategories(locals.db, user.id);

		return json({
			success: true,
			data: {
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					phone: user.phone,
					companyName: user.companyName,
					productId: user.productId,
					role: user.role,
					createdAt: user.createdAt
				},
				events,
				totalEvents: events.length
			}
		});
	} catch (e) {
		console.error('Error fetching user by email via API:', e);
		return json(
			{ error: 'Erro interno ao buscar usuário' },
			{ status: 500 }
		);
	}
};
