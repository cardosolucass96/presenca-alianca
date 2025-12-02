import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import * as apiKeys from '$lib/server/apiKeys';

export const load: PageServerLoad = async ({ locals }) => {
	const allApiKeys = await apiKeys.getAllApiKeys(locals.db);

	return {
		apiKeys: allApiKeys
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name');

		if (typeof name !== 'string' || !name.trim()) {
			return fail(400, { error: 'Nome da chave é obrigatório' });
		}

		try {
			const { apiKey, plainKey } = await apiKeys.createApiKey(locals.db, name, locals.user!.id);
			return { success: true, newKey: plainKey, keyId: apiKey.id };
		} catch {
			return fail(500, { error: 'Erro ao criar chave de API' });
		}
	},

	toggle: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (typeof id !== 'string' || !id) {
			return fail(400, { error: 'ID da chave é obrigatório' });
		}

		try {
			await apiKeys.toggleApiKeyActive(locals.db, id);
			return { success: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar chave' });
		}
	},

	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (typeof id !== 'string' || !id) {
			return fail(400, { error: 'ID da chave é obrigatório' });
		}

		try {
			await apiKeys.deleteApiKey(locals.db, id);
			return { success: true, deleted: true };
		} catch {
			return fail(500, { error: 'Erro ao excluir chave' });
		}
	}
};
