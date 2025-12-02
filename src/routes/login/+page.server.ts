import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Redireciona para a home que agora tem o login
export const load: PageServerLoad = async ({ url }) => {
	const redirectTo = url.searchParams.get('redirect');
	if (redirectTo) {
		redirect(302, `/?redirect=${encodeURIComponent(redirectTo)}`);
	}
	redirect(302, '/');
};
