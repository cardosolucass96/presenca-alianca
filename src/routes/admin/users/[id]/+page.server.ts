import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as users from '$lib/server/users';
import * as products from '$lib/server/products';
import { getUserByPhone } from '$lib/server/auth';

export const load: PageServerLoad = async ({ params, locals }) => {
	const result = await users.getUserWithProduct(locals.db, params.id);
	
	if (!result) {
		error(404, 'Usuário não encontrado');
	}

	const [allProducts, attendances] = await Promise.all([
		products.getAllProducts(locals.db),
		users.getUserAttendances(locals.db, params.id)
	]);

	return {
		user: result.user,
		productName: result.productName,
		products: allProducts,
		attendances
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const phone = formData.get('phone');
		const username = formData.get('username');
		const companyName = formData.get('companyName');
		const productId = formData.get('productId');
		const role = formData.get('role');

		if (
			typeof email !== 'string' ||
			typeof username !== 'string' ||
			typeof companyName !== 'string'
		) {
			return fail(400, { error: 'Dados inválidos' });
		}

		if (!email || !username || !companyName) {
			return fail(400, { error: 'Nome, email e empresa são obrigatórios' });
		}

		// Validar telefone se fornecido
		let cleanPhone: string | null = null;
		if (typeof phone === 'string' && phone.trim()) {
			cleanPhone = phone.replace(/\D/g, '');
			if (cleanPhone.length < 10 || cleanPhone.length > 13) {
				return fail(400, { error: 'Telefone deve ter entre 10 e 13 dígitos' });
			}
			const existingPhone = await getUserByPhone(locals.db, cleanPhone);
			if (existingPhone && existingPhone.id !== params.id) {
				return fail(400, { error: 'Este telefone já está em uso por outro usuário' });
			}
		}

		try {
			await users.updateUser(locals.db, params.id, {
				email,
				phone: cleanPhone,
				username,
				companyName,
				productId: typeof productId === 'string' && productId ? productId : null,
				role: role === 'admin' ? 'admin' : 'user'
			});

			return { success: true };
		} catch (e) {
			if (e instanceof Error && e.message.includes('UNIQUE')) {
				return fail(400, { error: 'Este email já está em uso por outro usuário' });
			}
			return fail(500, { error: 'Erro ao atualizar usuário' });
		}
	},

	updatePassword: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const newPassword = formData.get('newPassword');
		const confirmPassword = formData.get('confirmPassword');

		if (typeof newPassword !== 'string' || typeof confirmPassword !== 'string') {
			return fail(400, { error: 'Dados inválidos', passwordError: true });
		}

		if (!newPassword || newPassword.length < 6) {
			return fail(400, { error: 'A senha deve ter pelo menos 6 caracteres', passwordError: true });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'As senhas não conferem', passwordError: true });
		}

		try {
			await users.updateUserPassword(locals.db, params.id, newPassword);
			return { passwordSuccess: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar senha', passwordError: true });
		}
	}
};
