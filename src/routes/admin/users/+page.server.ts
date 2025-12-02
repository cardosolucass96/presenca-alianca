import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import * as users from '$lib/server/users';
import * as products from '$lib/server/products';
import { createUser, getUserByPhone } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	const [allUsers, allProducts] = await Promise.all([
		users.getUsersWithProducts(locals.db),
		products.getAllProducts(locals.db)
	]);

	return {
		users: allUsers,
		products: allProducts
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const phone = formData.get('phone');
		const username = formData.get('username');
		const companyName = formData.get('companyName');
		const password = formData.get('password');
		const productId = formData.get('productId');
		const role = formData.get('role');

		if (
			typeof email !== 'string' ||
			typeof username !== 'string' ||
			typeof companyName !== 'string' ||
			typeof password !== 'string'
		) {
			return fail(400, { error: 'Dados inválidos' });
		}

		if (!email || !username || !companyName || !password) {
			return fail(400, { error: 'Todos os campos são obrigatórios' });
		}

		if (password.length < 6) {
			return fail(400, { error: 'A senha deve ter pelo menos 6 caracteres' });
		}

		// Validar telefone se fornecido
		let cleanPhone: string | undefined;
		if (typeof phone === 'string' && phone.trim()) {
			cleanPhone = phone.replace(/\D/g, '');
			if (cleanPhone.length < 10 || cleanPhone.length > 13) {
				return fail(400, { error: 'Telefone deve ter entre 10 e 13 dígitos' });
			}
			const existingPhone = await getUserByPhone(locals.db, cleanPhone);
			if (existingPhone) {
				return fail(400, { error: 'Este telefone já está cadastrado' });
			}
		}

		try {
			await createUser(
				locals.db,
				email,
				username,
				companyName,
				password,
				role === 'admin' ? 'admin' : 'user',
				typeof productId === 'string' && productId ? productId : undefined,
				cleanPhone
			);

			return { success: true };
		} catch (e) {
			// Check for unique constraint violation
			if (e instanceof Error && e.message.includes('UNIQUE')) {
				return fail(400, { error: 'Este email já está cadastrado' });
			}
			return fail(500, { error: 'Erro ao criar usuário' });
		}
	},

	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const userId = formData.get('userId');

		if (typeof userId !== 'string' || !userId) {
			return fail(400, { error: 'ID do usuário é obrigatório' });
		}

		try {
			await users.deleteUser(locals.db, userId);
			return { success: true, deleted: true };
		} catch {
			return fail(500, { error: 'Erro ao excluir usuário' });
		}
	}
};
