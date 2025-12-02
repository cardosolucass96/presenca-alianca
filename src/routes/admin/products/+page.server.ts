import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as products from '$lib/server/products';

export const load: PageServerLoad = async ({ locals }) => {
	const allProducts = await products.getAllProducts(locals.db, true);

	return {
		products: allProducts
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString();

		if (!name || name.trim().length < 2) {
			return fail(400, { error: 'Nome do cargo deve ter pelo menos 2 caracteres' });
		}

		try {
			const newProduct = await products.createProduct(locals.db, name);
			return { success: true, product: newProduct };
		} catch {
			return fail(500, { error: 'Erro ao criar cargo' });
		}
	},

	update: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const name = formData.get('name')?.toString();

		if (!id) {
			return fail(400, { error: 'ID do cargo é obrigatório' });
		}

		if (!name || name.trim().length < 2) {
			return fail(400, { error: 'Nome do cargo deve ter pelo menos 2 caracteres' });
		}

		try {
			const updated = await products.updateProduct(locals.db, id, name);
			if (!updated) {
				return fail(404, { error: 'Cargo não encontrado' });
			}
			return { success: true, updated: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar cargo' });
		}
	},

	toggle: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID do cargo é obrigatório' });
		}

		try {
			const updated = await products.toggleProductActive(locals.db, id);
			if (!updated) {
				return fail(404, { error: 'Cargo não encontrado' });
			}
			return { success: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar cargo' });
		}
	},

	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID do cargo é obrigatório' });
		}

		try {
			const deleted = await products.deleteProduct(locals.db, id);
			if (!deleted) {
				return fail(404, { error: 'Cargo não encontrado' });
			}
			return { success: true, deleted: true };
		} catch {
			return fail(500, { error: 'Erro ao excluir cargo. Verifique se não há usuários vinculados.' });
		}
	}
};
