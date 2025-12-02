import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import * as events from '$lib/server/events';
import * as categories from '$lib/server/categories';

export const load: PageServerLoad = async ({ locals }) => {
	const [allEvents, allCategories] = await Promise.all([
		events.getAllEvents(locals.db),
		categories.getActiveCategories(locals.db)
	]);
	
	// Get attendee count and categories for each event
	const eventsWithDetails = await Promise.all(
		allEvents.map(async (event) => {
			const [count, eventCategories] = await Promise.all([
				events.getEventAttendeesCount(locals.db, event.id),
				events.getEventCategories(locals.db, event.id)
			]);
			return { ...event, attendeesCount: count, categories: eventCategories };
		})
	);

	return {
		events: eventsWithDetails,
		categories: allCategories
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
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

		try {
			const validCategoryIds = categoryIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
			
			const result = await events.createEvent(
				locals.db,
				name,
				dateTime,
				endDateTime,
				meetLink,
				expected,
				locals.user!.id,
				validCategoryIds,
				typeof description === 'string' ? description : undefined
			);

			return { success: true, slug: result.slug };
		} catch {
			return fail(500, { error: 'Erro ao criar evento' });
		}
	},

	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const eventId = formData.get('eventId');

		if (typeof eventId !== 'string' || !eventId) {
			return fail(400, { error: 'ID do evento é obrigatório' });
		}

		try {
			await events.deleteEvent(locals.db, eventId);
			return { success: true, deleted: true };
		} catch {
			return fail(500, { error: 'Erro ao excluir evento' });
		}
	},

	toggle: async ({ request, locals }) => {
		const formData = await request.formData();
		const eventId = formData.get('eventId');
		const isActive = formData.get('isActive') === 'true';

		if (typeof eventId !== 'string' || !eventId) {
			return fail(400, { error: 'ID do evento é obrigatório' });
		}

		try {
			await events.updateEvent(locals.db, eventId, { isActive: !isActive });
			return { success: true };
		} catch {
			return fail(500, { error: 'Erro ao atualizar evento' });
		}
	}
};
