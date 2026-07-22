import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as events from '$lib/server/events';

type PublicEventCategory = {
	id: string;
	name: string;
	color: string;
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const event = await events.getEventBySlug(locals.db, params.slug);

	if (!event) {
		error(404, 'Evento não encontrado');
	}

	if (!event.isActive) {
		error(404, 'Este evento não está mais disponível');
	}

	const eventCategories = (await events.getEventCategories(
		locals.db,
		event.id
	)) as unknown as PublicEventCategory[];

	let isAttending = false;
	if (locals.user) {
		isAttending = await events.isUserAttending(locals.db, event.id, locals.user.id);
	}

	return {
		event,
		categories: eventCategories,
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

		const isAlreadyAttending = await events.isUserAttending(locals.db, event.id, locals.user.id);

		if (event.registrationsClosed && !isAlreadyAttending) {
			return fail(403, { error: 'As inscrições deste evento estão encerradas.' });
		}

		await events.confirmAttendance(locals.db, event.id, locals.user.id);

		return { success: true, meetLink: event.meetLink };
	}
};
