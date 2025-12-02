import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByPhone } from '$lib/server/auth';
import { createPasswordResetToken } from '$lib/server/passwordReset';
import { sendPasswordResetLink } from '$lib/server/whatsapp';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, url, locals }) => {
		const formData = await request.formData();
		const phone = formData.get('phone') as string;

		if (!phone) {
			return fail(400, { error: 'Telefone é obrigatório', phone });
		}

		const cleanPhone = phone.replace(/\D/g, '');
		if (cleanPhone.length < 10 || cleanPhone.length > 13) {
			return fail(400, { error: 'Telefone inválido', phone });
		}

		const user = await getUserByPhone(locals.db, cleanPhone);
		
		if (!user) {
			// Por segurança, não revelamos se o telefone existe ou não
			return { success: true, message: 'Se o telefone estiver cadastrado, você receberá um link no WhatsApp.' };
		}

		// Criar token de reset
		const token = await createPasswordResetToken(locals.db, user.id);
		
		// Gerar link de reset
		const resetLink = `${url.origin}/reset-password/${token}`;
		
		// Enviar via WhatsApp
		const result = await sendPasswordResetLink(cleanPhone, user.username, resetLink);
		
		if (!result.success) {
			return fail(500, { error: 'Erro ao enviar mensagem. Tente novamente.', phone });
		}

		return { success: true, message: 'Link de recuperação enviado para seu WhatsApp!' };
	}
};
