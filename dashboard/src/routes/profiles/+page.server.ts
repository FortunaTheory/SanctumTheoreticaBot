import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { createProfileCard, deleteProfileCard, loadCatalog, parseCreateProfile, updateProfileCard } from '$lib/server/content';
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
			userId: String(form.get('userId') ?? ''), priority: String(form.get('priority') ?? '10'), author: String(form.get('author') ?? ''),
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
	},
	update: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		const form = await request.formData();
		const values = {
			userId: String(form.get('userId') ?? ''), priority: String(form.get('priority') ?? '10'), author: String(form.get('author') ?? ''),
			title: String(form.get('title') ?? ''), status: String(form.get('status') ?? ''), note: String(form.get('note') ?? ''),
			footer: String(form.get('footer') ?? ''), color: String(form.get('color') ?? ''), isDefault: form.get('isDefault') === 'on'
		};
		try {
			const image = form.get('image');
			const imageKey = image instanceof File && image.size > 0 ? await uploadImage(image, 'profile') : undefined;
			await updateProfileCard(String(form.get('id') ?? ''), parseCreateProfile(values), user, imageKey);
			return { success: true };
		} catch (error) {
			if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message ?? 'Ungültige Eingabe.', values });
			console.error('Profile card could not be updated:', error);
			return fail(500, { error: 'Die Profilkarte konnte nicht aktualisiert werden.', values });
		}
	},
	delete: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		try {
			await deleteProfileCard(String((await request.formData()).get('id') ?? ''), user);
			return { deleted: true };
		} catch (error) {
			console.error('Profile card could not be deleted:', error);
			return fail(400, { error: 'Die Profilkarte konnte nicht gelöscht werden.' });
		}
	}
};