import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as events from '$lib/server/events';
import * as categories from '$lib/server/categories';

export const load: PageServerLoad = async ({ params, locals }) => {
	const event = await events.getEventById(locals.db, params.id);
	
	if (!event) {
		error(404, 'Evento não encontrado');
	}

	const [attendees, eventCategories, allCategories] = await Promise.all([
		events.getEventAttendees(locals.db, event.id),
		events.getEventCategories(locals.db, event.id),
		categories.getActiveCategories(locals.db)
	]);
	const attendeesCount = attendees.length;

	return {
		event,
		categories: eventCategories,
		allCategories,
		attendees,
		attendeesCount
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
		const validCategoryIds = categoryIds.filter((id): id is string => typeof id === 'string' && id.length > 0);

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
	}
};
