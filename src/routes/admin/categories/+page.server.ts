import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as categories from '$lib/server/categories';

export const load: PageServerLoad = async ({ locals }) => {
	const allCategories = await categories.getAllCategories(locals.db, true);

	return {
		categories: allCategories
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const color = formData.get('color')?.toString() || '#6366f1';

		if (!name || name.trim().length < 2) {
			return fail(400, { error: 'Nome da categoria deve ter pelo menos 2 caracteres' });
		}

		try {
			const newCategory = await categories.createCategory(locals.db, name, color);
			return { success: true, category: newCategory };
		} catch {
			return fail(500, { error: 'Erro ao criar categoria' });
		}
	},

	update: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const name = formData.get('name')?.toString();
		const color = formData.get('color')?.toString();

		if (!id) {
			return fail(400, { error: 'ID da categoria é obrigatório' });
		}

		if (!name || name.trim().length < 2) {
			return fail(400, { error: 'Nome da categoria deve ter pelo menos 2 caracteres' });
		}

		try {
			const updated = await categories.updateCategory(locals.db, id, { name, color });
			if (!updated) {
				return fail(404, { error: 'Categoria não encontrada' });
			}
			return { success: true, updated: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar categoria' });
		}
	},

	toggle: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID da categoria é obrigatório' });
		}

		try {
			const updated = await categories.toggleCategoryActive(locals.db, id);
			if (!updated) {
				return fail(404, { error: 'Categoria não encontrada' });
			}
			return { success: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar categoria' });
		}
	},

	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID da categoria é obrigatório' });
		}

		try {
			const deleted = await categories.deleteCategory(locals.db, id);
			if (!deleted) {
				return fail(404, { error: 'Categoria não encontrada' });
			}
			return { success: true, deleted: true };
		} catch {
			return fail(500, { error: 'Erro ao excluir categoria. Verifique se não há eventos vinculados.' });
		}
	}
};
