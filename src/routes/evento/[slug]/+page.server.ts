import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as events from '$lib/server/events';

export const load: PageServerLoad = async ({ params, locals }) => {
	const event = await events.getEventBySlug(locals.db, params.slug);

	if (!event) {
		error(404, 'Evento não encontrado');
	}

	if (!event.isActive) {
		error(404, 'Este evento não está mais disponível');
	}

	const [attendeesCount, eventCategories] = await Promise.all([
		events.getEventAttendeesCount(locals.db, event.id),
		events.getEventCategories(locals.db, event.id)
	]);
	
	let isAttending = false;
	if (locals.user) {
		isAttending = await events.isUserAttending(locals.db, event.id, locals.user.id);
	}

	return {
		event,
		categories: eventCategories,
		attendeesCount,
		isAttending,
		user: locals.user
	};
};

export const actions: Actions = {
	confirm: async ({ params, locals }) => {
		if (!locals.user) {
			redirect(302, `/login?redirect=/evento/${params.slug}`);
		}

		const event = await events.getEventBySlug(locals.db, params.slug);
		if (!event || !event.isActive) {
			error(404, 'Evento não encontrado');
		}

		await events.confirmAttendance(locals.db, event.id, locals.user.id);

		return { success: true, meetLink: event.meetLink };
	}
};
