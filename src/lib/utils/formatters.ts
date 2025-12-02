/**
 * Utilitários de formatação compartilhados
 */

/**
 * Formata uma data para exibição
 * @param date - Data em formato string ISO ou objeto Date
 * @param options - Opções de formatação
 */
export function formatDate(
	date: string | Date | null | undefined,
	options: {
		includeTime?: boolean;
		includeSeconds?: boolean;
		relative?: boolean;
	} = {}
): string {
	if (!date) return '-';

	const d = typeof date === 'string' ? new Date(date) : date;

	if (isNaN(d.getTime())) return '-';

	if (options.relative) {
		return formatRelativeDate(d);
	}

	const dateStr = d.toLocaleDateString('pt-BR');

	if (options.includeTime) {
		const timeOptions: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
			...(options.includeSeconds && { second: '2-digit' })
		};
		const timeStr = d.toLocaleTimeString('pt-BR', timeOptions);
		return `${dateStr} às ${timeStr}`;
	}

	return dateStr;
}

/**
 * Formata uma data de forma relativa (ex: "há 2 dias")
 */
export function formatRelativeDate(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return 'agora mesmo';
	if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
	if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
	if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;

	return formatDate(date);
}

/**
 * Formata um número de telefone brasileiro
 * @param phone - Telefone com ou sem formatação
 */
export function formatPhone(phone: string | null | undefined): string {
	if (!phone) return '-';

	// Remove tudo que não é número
	const digits = phone.replace(/\D/g, '');

	if (digits.length === 11) {
		// Celular: (11) 99999-9999
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
	}

	if (digits.length === 10) {
		// Fixo: (11) 9999-9999
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	}

	// Retorna como está se não reconhecer o formato
	return phone;
}

/**
 * Remove formatação de telefone (mantém só números)
 */
export function cleanPhone(phone: string): string {
	return phone.replace(/\D/g, '');
}

/**
 * Formata um valor em moeda brasileira
 * @param value - Valor numérico
 */
export function formatCurrency(value: number | null | undefined): string {
	if (value === null || value === undefined) return '-';

	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	}).format(value);
}

/**
 * Formata um CPF
 * @param cpf - CPF com ou sem formatação
 */
export function formatCPF(cpf: string | null | undefined): string {
	if (!cpf) return '-';

	const digits = cpf.replace(/\D/g, '');

	if (digits.length !== 11) return cpf;

	return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Trunca texto com ellipsis
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + '...';
}
