import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as auth from '$lib/server/auth';
import * as products from '$lib/server/products';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const redirectTo = url.searchParams.get('redirect') || '/';
		redirect(302, redirectTo);
	}
	
	const allProducts = await products.getAllProducts(locals.db);
	
	return {
		redirectTo: url.searchParams.get('redirect') || '/',
		products: allProducts
	};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const companyName = formData.get('companyName');
		const phone = formData.get('phone');
		const positionId = formData.get('positionId');
		const email = formData.get('email');
		const password = formData.get('password');
		const confirmPassword = formData.get('confirmPassword');
		const redirectTo = formData.get('redirectTo');

		// Validação de tipos
		if (
			typeof username !== 'string' ||
			typeof companyName !== 'string' ||
			typeof phone !== 'string' ||
			typeof email !== 'string' ||
			typeof password !== 'string' ||
			typeof confirmPassword !== 'string'
		) {
			return fail(400, { error: 'Dados inválidos' });
		}

		if (!username || !companyName || !phone || !email || !password) {
			return fail(400, { error: 'Todos os campos são obrigatórios' });
		}

		// Validação de username
		if (username.length < 2 || username.length > 50) {
			return fail(400, { error: 'Nome deve ter entre 2 e 50 caracteres' });
		}

		// Validação de empresa
		if (companyName.length < 2 || companyName.length > 100) {
			return fail(400, { error: 'Nome da empresa deve ter entre 2 e 100 caracteres' });
		}

		// Validação de telefone
		const phoneDigits = phone.replace(/\D/g, '');
		if (phoneDigits.length < 10 || phoneDigits.length > 11) {
			return fail(400, { error: 'Telefone inválido. Use o formato (DD) 9XXXX-XXXX' });
		}

		// Validação de email
		if (!email.includes('@') || email.length > 255) {
			return fail(400, { error: 'Email inválido' });
		}

		// Validação de senha forte
		if (password.length < 8) {
			return fail(400, { error: 'Senha deve ter no mínimo 8 caracteres' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'As senhas não coincidem' });
		}

		const existingUser = await auth.getUserByEmail(event.locals.db, email);
		if (existingUser) {
			return fail(400, { error: 'Email já está em uso' });
		}

		try {
			const userId = await auth.createUser(
				event.locals.db,
				email, 
				username, 
				companyName, 
				password,
				'user',
				typeof positionId === 'string' && positionId ? positionId : undefined,
				phone
			);
			const token = auth.generateSessionToken();
			const session = await auth.createSession(event.locals.db, token, userId);

			auth.setSessionTokenCookie(event, token, session.expiresAt);
		} catch {
			return fail(500, { error: 'Erro ao criar conta. Tente novamente.' });
		}

		const finalRedirect = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/';
		redirect(302, finalRedirect);
	}
};
