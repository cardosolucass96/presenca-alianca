import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as apiKeys from '$lib/server/apiKeys';
import { createUser, getUserByEmail, getUserByPhone } from '$lib/server/auth';
import * as products from '$lib/server/products';
import { searchUsers } from '$lib/server/users';

// GET /api/users - List users with filters
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
	const email = url.searchParams.get('email') || undefined;
	const phone = url.searchParams.get('phone') || undefined;
	const companyName = url.searchParams.get('companyName') || undefined;
	const productId = url.searchParams.get('productId') || undefined;
	const role = url.searchParams.get('role') as 'user' | 'admin' | undefined;
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	try {
		const result = await searchUsers(locals.db, {
			query,
			email,
			phone,
			companyName,
			productId,
			role: role === 'user' || role === 'admin' ? role : undefined,
			limit: Math.min(limit, 100),
			offset
		});

		return json({
			success: true,
			data: result.users,
			total: result.total,
			limit,
			offset
		});
	} catch (e) {
		console.error('Error fetching users via API:', e);
		return json(
			{ error: 'Erro interno ao buscar usuários' },
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

	const token = authHeader.slice(7); // Remove "Bearer "
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

	const { email, phone, username, companyName, password, productId } = body as Record<string, unknown>;

	// Validate required fields
	const errors: string[] = [];

	if (typeof email !== 'string' || !email.trim()) {
		errors.push('Email é obrigatório');
	} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		errors.push('Email inválido');
	}

	// Validate phone if provided
	let cleanPhone: string | undefined;
	if (phone !== undefined && phone !== null && phone !== '') {
		if (typeof phone !== 'string') {
			errors.push('Telefone deve ser uma string');
		} else {
			cleanPhone = phone.replace(/\D/g, '');
			if (cleanPhone.length < 10 || cleanPhone.length > 13) {
				errors.push('Telefone deve ter entre 10 e 13 dígitos');
			}
		}
	}

	if (typeof username !== 'string' || !username.trim()) {
		errors.push('Nome é obrigatório');
	} else if (username.trim().length < 2) {
		errors.push('Nome deve ter pelo menos 2 caracteres');
	}

	if (typeof companyName !== 'string' || !companyName.trim()) {
		errors.push('Empresa é obrigatória');
	}

	if (typeof password !== 'string' || !password) {
		errors.push('Senha é obrigatória');
	} else if (password.length < 6) {
		errors.push('Senha deve ter pelo menos 6 caracteres');
	}

	// Validate productId if provided
	if (productId !== undefined && productId !== null && productId !== '') {
		if (typeof productId !== 'string') {
			errors.push('productId deve ser uma string');
		} else {
			const product = await products.getProductById(locals.db, productId);
			if (!product) {
				errors.push('Produto não encontrado');
			} else if (!product.isActive) {
				errors.push('Produto está inativo');
			}
		}
	}

	if (errors.length > 0) {
		return json(
			{ error: 'Dados inválidos', details: errors },
			{ status: 400 }
		);
	}

	// Check if email already exists
	const existingUser = await getUserByEmail(locals.db, email as string);
	if (existingUser) {
		return json(
			{ error: 'Email já cadastrado' },
			{ status: 409 }
		);
	}

	// Check if phone already exists
	if (cleanPhone) {
		const existingPhone = await getUserByPhone(locals.db, cleanPhone);
		if (existingPhone) {
			return json(
				{ error: 'Telefone já cadastrado' },
				{ status: 409 }
			);
		}
	}

	// Create user
	try {
		const userId = await createUser(
			locals.db,
			(email as string).trim(),
			(username as string).trim(),
			(companyName as string).trim(),
			password as string,
			'user',
			typeof productId === 'string' && productId ? productId : undefined,
			cleanPhone
		);

		return json(
			{
				success: true,
				message: 'Usuário criado com sucesso',
				userId
			},
			{ status: 201 }
		);
	} catch (e) {
		console.error('Error creating user via API:', e);
		return json(
			{ error: 'Erro interno ao criar usuário' },
			{ status: 500 }
		);
	}
};
