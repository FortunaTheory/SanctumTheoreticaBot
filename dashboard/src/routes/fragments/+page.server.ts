import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { createFragment, loadCatalog, parseCreateFragment } from '$lib/server/content';

function requireUser(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	return user;
}

export const load: PageServerLoad = async ({ cookies }) => {
	requireUser(cookies);
	return { fragments: (await loadCatalog()).fragments };
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		const form = await request.formData();
		const values = { title: String(form.get('title') ?? ''), text: String(form.get('text') ?? '') };
		try {
			await createFragment(parseCreateFragment(values), user);
			return { success: true };
		} catch (error) {
			if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message ?? 'Ungültige Eingabe.', values });
			console.error('Fragment could not be created:', error);
			return fail(500, { error: 'Das Fragment konnte nicht gespeichert werden.', values });
		}
	}
};