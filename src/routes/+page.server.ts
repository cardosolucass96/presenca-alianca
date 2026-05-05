import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as auth from '$lib/server/auth';
import { cleanPhone, isValidBrazilianPhone } from '$lib/utils';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		// Usuário logado: redireciona para área apropriada
		if (locals.user.role === 'admin') {
			redirect(302, '/admin');
		}
		const redirectTo = url.searchParams.get('redirect');
		if (redirectTo && redirectTo.startsWith('/')) {
			redirect(302, redirectTo);
		}
	}
	return {
		user: locals.user,
		redirectTo: url.searchParams.get('redirect') || '/',
		resetSuccess: url.searchParams.get('reset') === 'success'
	};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const login = formData.get('login');
		const password = formData.get('password');
		const redirectTo = formData.get('redirectTo');

		// Validação de tipos
		if (typeof login !== 'string' || typeof password !== 'string') {
			return fail(400, { error: 'Dados inválidos' });
		}

		const normalizedLogin = login.trim();

		if (!normalizedLogin || !password) {
			return fail(400, { error: 'Email/telefone e senha são obrigatórios' });
		}

		const isEmailLogin = normalizedLogin.includes('@');
		const phoneDigits = cleanPhone(normalizedLogin);
		const looksLikePhoneLogin = !isEmailLogin && phoneDigits.length > 0;

		if (looksLikePhoneLogin && !isValidBrazilianPhone(normalizedLogin)) {
			return fail(400, {
				error: 'Telefone inválido. Se seu telefone não estiver cadastrado, tente entrar com seu email.'
			});
		}

		// Buscar usuário por email ou telefone
		const user = await auth.getUserByEmailOrPhone(event.locals.db, normalizedLogin);
		if (!user) {
			if (looksLikePhoneLogin) {
				return fail(400, {
					error: 'Não encontramos esse telefone no cadastro. Tente entrar com seu email.'
				});
			}

			return fail(400, { error: 'Credenciais incorretas' });
		}

		const validPassword = await auth.verifyPassword(user.passwordHash, password);
		if (!validPassword) {
			return fail(400, { error: 'Credenciais incorretas' });
		}

		const token = auth.generateSessionToken();
		const session = await auth.createSession(event.locals.db, token, user.id);

		auth.setSessionTokenCookie(event, token, session.expiresAt);

		// Se admin e não há redirect específico, vai para /admin
		let finalRedirect = '/';
		if (typeof redirectTo === 'string' && redirectTo.startsWith('/') && redirectTo !== '/') {
			finalRedirect = redirectTo;
		} else if (user.role === 'admin') {
			finalRedirect = '/admin';
		}
		
		redirect(302, finalRedirect);
	}
};
