const EVOLUTION_API_URL = 'https://evolution-api.grupovorp.com';
const INSTANCE_NAME = 'vorpbot';
const API_KEY = '94902be9624521fd58cd50b220823a35';

interface SendTextResponse {
	key: {
		remoteJid: string;
		fromMe: boolean;
		id: string;
	};
	message: {
		extendedTextMessage?: {
			text: string;
		};
	};
	messageTimestamp: string;
	status: string;
}

export async function sendWhatsAppMessage(
	phone: string,
	message: string
): Promise<{ success: boolean; error?: string }> {
	// Limpa o telefone e adiciona código do país se necessário
	let cleanPhone = phone.replace(/\D/g, '');
	
	// Se não começar com 55, adiciona
	if (!cleanPhone.startsWith('55')) {
		cleanPhone = '55' + cleanPhone;
	}

	try {
		const response = await fetch(
			`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'apikey': API_KEY
				},
				body: JSON.stringify({
					number: cleanPhone,
					text: message
				})
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Evolution API error:', response.status, errorText);
			return { success: false, error: `Erro ao enviar mensagem: ${response.status}` };
		}

		const data: SendTextResponse = await response.json();
		console.log('WhatsApp message sent:', data.key?.id);
		
		return { success: true };
	} catch (error) {
		console.error('Error sending WhatsApp message:', error);
		return { success: false, error: 'Erro de conexão com API do WhatsApp' };
	}
}

export async function sendPasswordResetLink(
	phone: string,
	username: string,
	resetLink: string
): Promise<{ success: boolean; error?: string }> {
	const message = `Olá ${username}, clique aqui para criar uma nova senha: 🔗\n\n${resetLink}\n\nEsse link expira em 1 hora.`;
	
	return sendWhatsAppMessage(phone, message);
}
