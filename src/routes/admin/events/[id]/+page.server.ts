import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as events from '$lib/server/events';
import * as categories from '$lib/server/categories';
import * as users from '$lib/server/users';
import * as products from '$lib/server/products';
import { createUser, getUserByEmail, getUserByPhone } from '$lib/server/auth';

function normalizeBrazilianPhone(phone: string): string {
	let digits = phone.replace(/\D/g, '');
	if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
		digits = digits.slice(2);
	}
	return digits;
}

function isValidBrazilianPhone(phone: string): boolean {
	const digits = normalizeBrazilianPhone(phone);
	return digits.length === 10 || digits.length === 11;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const event = await events.getEventById(locals.db, params.id);

	if (!event) {
		error(404, 'Evento não encontrado');
	}

	const [attendees, eventCategories, allCategories, allProducts] = await Promise.all([
		events.getEventAttendees(locals.db, event.id),
		events.getEventCategories(locals.db, event.id),
		categories.getActiveCategories(locals.db),
		products.getActiveProducts(locals.db)
	]);
	const attendeesCount = attendees.length;

	// Get all users for manual enrollment
	const allUsers = await users.getAllUsers(locals.db);
	const attendeeUserIds = new Set(attendees.map(a => a.user.id));
	const availableUsers = allUsers.filter(user => !attendeeUserIds.has(user.id));

	return {
		event,
		categories: eventCategories,
		allCategories,
		attendees,
		attendeesCount,
		availableUsers,
		products: allProducts
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name');
		const date = formData.get('date');
		const time = formData.get('time');
		const endTime = formData.get('endTime');
		const meetLink = formData.get('meetLink');
		const expectedAttendees = formData.get('expectedAttendees');
		const categoryIds = formData.getAll('categoryIds');
		const description = formData.get('description');

		if (
			typeof name !== 'string' ||
			typeof date !== 'string' ||
			typeof time !== 'string' ||
			typeof endTime !== 'string' ||
			typeof meetLink !== 'string' ||
			typeof expectedAttendees !== 'string'
		) {
			return fail(400, { error: 'Dados inválidos' });
		}

		if (!name || !date || !time || !endTime || !meetLink) {
			return fail(400, { error: 'Nome, data, horários e link do meet são obrigatórios' });
		}

		// Parse date and time and adjust for Brazil timezone (UTC-3)
		// The server runs in UTC, so we need to add 3 hours to store the correct time
		const [year, month, day] = date.split('-').map(Number);
		const [hours, minutes] = time.split(':').map(Number);
		const [endHours, endMinutes] = endTime.split(':').map(Number);

		// Create dates in UTC that represent the intended Brazil time
		const dateTime = new Date(Date.UTC(year, month - 1, day, hours + 3, minutes));
		const endDateTime = new Date(Date.UTC(year, month - 1, day, endHours + 3, endMinutes));

		if (isNaN(dateTime.getTime()) || isNaN(endDateTime.getTime())) {
			return fail(400, { error: 'Data/hora inválida' });
		}

		if (endDateTime <= dateTime) {
			return fail(400, { error: 'A hora de término deve ser posterior à hora de início' });
		}

		const expected = parseInt(expectedAttendees) || 0;
		const validCategoryIds = categoryIds.filter(
			(id): id is string => typeof id === 'string' && id.length > 0
		);

		try {
			await events.updateEvent(
				locals.db,
				params.id,
				{
					name,
					description: typeof description === 'string' ? description : undefined,
					dateTime,
					endTime: endDateTime,
					meetLink,
					expectedAttendees: expected
				},
				validCategoryIds
			);

			return { success: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar evento' });
		}
	},

	toggle: async ({ params, locals }) => {
		const event = await events.getEventById(locals.db, params.id);
		if (!event) {
			return fail(404, { error: 'Evento não encontrado' });
		}

		try {
			await events.updateEvent(locals.db, params.id, { isActive: !event.isActive });
			return { success: true, toggled: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar status' });
		}
	},

	enroll: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const userId = formData.get('userId');

		if (typeof userId !== 'string' || !userId) {
			return fail(400, { error: 'Usuário inválido' });
		}

		try {
			await events.confirmAttendance(locals.db, params.id, userId);
			return { success: true, enrolled: true };
		} catch {
			return fail(500, { error: 'Erro ao inscrever usuário' });
		}
	},

	createAndEnroll: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const companyName = formData.get('companyName');
		const phone = formData.get('phone');
		const positionId = formData.get('positionId');
		const email = formData.get('email');
		const password = formData.get('password');
		const confirmPassword = formData.get('confirmPassword');

		if (
			typeof username !== 'string' ||
			typeof companyName !== 'string' ||
			typeof phone !== 'string' ||
			typeof email !== 'string' ||
			typeof password !== 'string' ||
			typeof confirmPassword !== 'string'
		) {
			return fail(400, { error: 'Dados inválidos' });
		}

		const cleanUsername = username.trim();
		const cleanCompanyName = companyName.trim();
		const cleanEmail = email.trim();

		if (
			!cleanUsername ||
			!cleanCompanyName ||
			!phone.trim() ||
			!cleanEmail ||
			!password ||
			!confirmPassword
		) {
			return fail(400, { error: 'Preencha todos os campos obrigatórios' });
		}

		if (cleanUsername.length < 2 || cleanUsername.length > 50) {
			return fail(400, { error: 'Nome deve ter entre 2 e 50 caracteres' });
		}

		if (cleanCompanyName.length < 2 || cleanCompanyName.length > 100) {
			return fail(400, { error: 'Nome da empresa deve ter entre 2 e 100 caracteres' });
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 255) {
			return fail(400, { error: 'Email inválido' });
		}

		if (!isValidBrazilianPhone(phone)) {
			return fail(400, { error: 'Telefone inválido. Use DDD + número, com ou sem +55' });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Senha deve ter no mínimo 8 caracteres' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'As senhas não coincidem' });
		}

		const cleanPhone = normalizeBrazilianPhone(phone);

		if (await getUserByEmail(locals.db, cleanEmail)) {
			return fail(400, { error: 'Este email já está cadastrado' });
		}

		if (await getUserByPhone(locals.db, cleanPhone)) {
			return fail(400, { error: 'Este telefone já está cadastrado' });
		}

		let validPositionId: string | undefined;
		if (typeof positionId === 'string' && positionId) {
			const position = await products.getProductById(locals.db, positionId);
			if (!position || !position.isActive) {
				return fail(400, { error: 'Cargo inválido' });
			}
			validPositionId = positionId;
		}

		try {
			const userId = await createUser(
				locals.db,
				cleanEmail,
				cleanUsername,
				cleanCompanyName,
				password,
				'user',
				validPositionId,
				cleanPhone
			);

			await events.confirmAttendance(locals.db, params.id, userId);
			return { success: true, enrolled: true, createdAndEnrolled: true };
		} catch (error) {
			if (error instanceof Error && error.message.includes('UNIQUE')) {
				return fail(400, { error: 'Email ou telefone já está cadastrado' });
			}
			return fail(500, { error: 'Erro ao cadastrar e inscrever usuário' });
		}
	},

	unenroll: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const userId = formData.get('userId');

		if (typeof userId !== 'string' || !userId) {
			return fail(400, { error: 'Usuário inválido' });
		}

		try {
			await events.removeAttendance(locals.db, params.id, userId);
			return { success: true, unenrolled: true };
		} catch {
			return fail(500, { error: 'Erro ao remover participante' });
		}
	}
};
