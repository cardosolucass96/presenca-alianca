import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserByEmailOrPhone } from '$lib/server/auth';
import { createPasswordResetToken } from '$lib/server/passwordReset';
import { sendPasswordResetLink } from '$lib/server/whatsapp';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, url, locals, platform }) => {
		const formData = await request.formData();
		const identifier = formData.get('identifier') as string;

		if (!identifier) {
			return fail(400, { error: 'Email ou telefone é obrigatório', identifier });
		}

		// Busca usuário por email ou telefone
		const user = await getUserByEmailOrPhone(locals.db, identifier);
		
		if (!user) {
			// Por segurança, não revelamos se o email/telefone existe ou não
			return { 
				success: true, 
				message: 'Se o email ou telefone estiver cadastrado, você receberá um link de recuperação.',
				identifier
			};
		}

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
					subject: 'Recuperação de Senha - Presença Aliança',
					html: `
						<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
							<h2 style="color: #333;">Olá ${user.username},</h2>
							<p>Você solicitou a recuperação de senha. Clique no botão abaixo para criar uma nova senha:</p>
							<div style="margin: 30px 0; text-align: center;">
								<a href="${resetLink}" 
								   style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
									Recuperar Senha
								</a>
							</div>
							<p style="color: #666; font-size: 14px;">
								Este link expira em 1 hora.
							</p>
							<p style="color: #666; font-size: 14px;">
								Se você não solicitou esta recuperação, ignore este email.
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
				error: 'Erro ao enviar link de recuperação. Tente novamente.', 
				identifier 
			});
		}

		const methodsText = methods.length > 1 
			? methods.join(' e ') 
			: methods[0] || 'seus contatos cadastrados';

		return { 
			success: true, 
			message: `Link de recuperação enviado para ${methodsText}!`,
			identifier
		};
	}
};
