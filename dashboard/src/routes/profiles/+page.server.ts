import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { createProfileCard, loadCatalog, parseCreateProfile } from '$lib/server/content';
import { uploadImage } from '$lib/server/storage';

function requireUser(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	return user;
}

export const load: PageServerLoad = async ({ cookies }) => {
	requireUser(cookies);
	return { profiles: (await loadCatalog()).profiles };
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		const form = await request.formData();
		const values = {
			roleId: String(form.get('roleId') ?? ''), priority: String(form.get('priority') ?? '10'), author: String(form.get('author') ?? ''),
			title: String(form.get('title') ?? ''), status: String(form.get('status') ?? ''), note: String(form.get('note') ?? ''),
			footer: String(form.get('footer') ?? ''), color: String(form.get('color') ?? ''), isDefault: form.get('isDefault') === 'on'
		};
		try {
			const image = form.get('image');
			const imageKey = image instanceof File && image.size > 0 ? await uploadImage(image, 'profile') : undefined;
			await createProfileCard(parseCreateProfile(values), user, imageKey);
			return { success: true };
		} catch (error) {
			if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message ?? 'Ungültige Eingabe.', values });
			console.error('Profile card could not be created:', error);
			return fail(500, { error: 'Die Profilkarte konnte nicht gespeichert werden.', values });
		}
	}
};