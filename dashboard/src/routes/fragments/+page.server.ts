import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { createFragment, deleteFragment, loadCatalog, parseCreateFragment, updateFragment } from '$lib/server/content';
import { uploadImage } from '$lib/server/storage';

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
			const image = form.get('image');
			const imageKey = image instanceof File && image.size > 0 ? await uploadImage(image, 'fragment') : undefined;
			await createFragment(parseCreateFragment(values), user, imageKey);
			return { success: true };
		} catch (error) {
			if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message ?? 'Ungültige Eingabe.', values });
			console.error('Fragment could not be created:', error);
			return fail(500, { error: 'Das Fragment konnte nicht gespeichert werden.', values });
		}
	},
	update: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		const form = await request.formData();
		const values = { title: String(form.get('title') ?? ''), text: String(form.get('text') ?? '') };
		try {
			const image = form.get('image');
			const imageKey = image instanceof File && image.size > 0 ? await uploadImage(image, 'fragment') : undefined;
			await updateFragment(String(form.get('id') ?? ''), parseCreateFragment(values), user, imageKey);
			return { success: true };
		} catch (error) {
			if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message ?? 'Ungültige Eingabe.', values });
			console.error('Fragment could not be updated:', error);
			return fail(500, { error: 'Das Fragment konnte nicht aktualisiert werden.', values });
		}
	},
	delete: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		try {
			await deleteFragment(String((await request.formData()).get('id') ?? ''), user);
			return { deleted: true };
		} catch (error) {
			console.error('Fragment could not be deleted:', error);
			return fail(400, { error: 'Das Fragment konnte nicht gelöscht werden.' });
		}
	}
};