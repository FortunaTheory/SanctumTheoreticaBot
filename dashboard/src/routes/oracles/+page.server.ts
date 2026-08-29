import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { createOracle, loadCatalog, parseCreateOracle } from '$lib/server/content';

function requireUser(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	return user;
}

export const load: PageServerLoad = async ({ cookies }) => {
	requireUser(cookies);
	return { oracles: (await loadCatalog()).oracles };
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		const form = await request.formData();
		try {
			await createOracle(parseCreateOracle({ aspect: form.get('aspect'), text: form.get('text') }), user);
			return { success: true };
		} catch (error) {
			if (error instanceof ZodError) {
				return fail(400, { error: error.issues[0]?.message ?? 'Ungültige Eingabe.', values: { aspect: String(form.get('aspect') ?? 'archive'), text: String(form.get('text') ?? '') } });
			}
			console.error('Oracle could not be created:', error);
			return fail(500, { error: 'Das Orakel konnte nicht gespeichert werden.', values: { aspect: String(form.get('aspect') ?? 'archive'), text: String(form.get('text') ?? '') } });
		}
	}
};