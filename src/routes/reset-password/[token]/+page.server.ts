import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserForReset, resetPassword } from '$lib/server/passwordReset';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { token } = params;
	
	const user = await getUserForReset(locals.db, token);
	
	if (!user) {
		error(404, 'Link inválido ou expirado');
	}

	return {
		username: user.username
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { token } = params;
		const formData = await request.formData();
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!password || password.length < 6) {
			return fail(400, { error: 'A senha deve ter pelo menos 6 caracteres' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'As senhas não coincidem' });
		}

		const result = await resetPassword(locals.db, token, password);

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		redirect(303, '/login?reset=success');
	}
};
