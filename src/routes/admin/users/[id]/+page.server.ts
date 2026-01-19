import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as users from '$lib/server/users';
import * as products from '$lib/server/products';
import { getUserByPhone } from '$lib/server/auth';
import { createPasswordResetToken } from '$lib/server/passwordReset';
import { sendPasswordResetLink } from '$lib/server/whatsapp';

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
		const positionId = formData.get('positionId');
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
				positionId: typeof positionId === 'string' && positionId ? positionId : null,
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
	},

	sendPasswordReset: async ({ params, locals, url, platform }) => {
		// Buscar usuário
		const result = await users.getUserWithProduct(locals.db, params.id);
		
		if (!result) {
			return fail(404, { error: 'Usuário não encontrado', resetError: true });
		}

		const user = result.user;

		// Criar token de reset
		const token = await createPasswordResetToken(locals.db, user.id);
		
		// Gerar link de reset
		const resetLink = `${url.origin}/reset-password/${token}`;
		
		let emailSent = false;
		let whatsappSent = false;
		const methods: string[] = [];

		// Enviar via WhatsApp se tiver telefone
		if (user.phone) {
			const whatsappResult = await sendPasswordResetLink(user.phone, user.username, resetLink);
			if (whatsappResult.success) {
				whatsappSent = true;
				methods.push('WhatsApp');
			}
		}

		// Enviar via Email se tiver email e a plataforma tiver suporte
		if (user.email && platform?.env?.RESEND_API_KEY) {
			try {
				const { Resend } = await import('resend');
				const resend = new Resend(platform.env.RESEND_API_KEY);

				await resend.emails.send({
					from: 'Presença Aliança <noreply@presenca-alianca.com>',
					to: user.email,
					subject: 'Redefinição de Senha - Presença Aliança',
					html: `
						<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
							<h2 style="color: #333;">Olá ${user.username},</h2>
							<p>Um administrador solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova senha:</p>
							<div style="margin: 30px 0; text-align: center;">
								<a href="${resetLink}" 
								   style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
									Redefinir Senha
								</a>
							</div>
							<p style="color: #666; font-size: 14px;">
								Este link expira em 1 hora.
							</p>
						</div>
					`
				});
				
				emailSent = true;
				methods.push('email');
			} catch (error) {
				console.error('Error sending email:', error);
			}
		}

		if (!emailSent && !whatsappSent) {
			return fail(500, { 
				error: 'Usuário não possui email ou telefone cadastrado', 
				resetError: true 
			});
		}

		const methodsText = methods.length > 1 
			? methods.join(' e ') 
			: methods[0] || 'os contatos cadastrados';

		return { 
			resetSuccess: true,
			resetMessage: `Link de redefinição enviado para ${methodsText}!`
		};
	}
};
