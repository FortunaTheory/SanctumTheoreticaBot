import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { createOracle, deleteOracle, loadCatalog, parseCreateOracle, updateOracle } from '$lib/server/content';
import { uploadImage } from '$lib/server/storage';

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
			const image = form.get('image');
			const imageKey = image instanceof File && image.size > 0 ? await uploadImage(image, 'oracle') : undefined;
			await createOracle(parseCreateOracle({ aspect: form.get('aspect'), text: form.get('text') }), user, imageKey);
			return { success: true };
		} catch (error) {
			if (error instanceof ZodError) {
				return fail(400, { error: error.issues[0]?.message ?? 'Ungültige Eingabe.', values: { aspect: String(form.get('aspect') ?? 'archive'), text: String(form.get('text') ?? '') } });
			}
			console.error('Oracle could not be created:', error);
			return fail(500, { error: 'Das Orakel konnte nicht gespeichert werden.', values: { aspect: String(form.get('aspect') ?? 'archive'), text: String(form.get('text') ?? '') } });
		}
	},
	update: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		const form = await request.formData();
		const values = { aspect: String(form.get('aspect') ?? 'archive'), text: String(form.get('text') ?? '') };
		try {
			const image = form.get('image');
			const imageKey = image instanceof File && image.size > 0 ? await uploadImage(image, 'oracle') : undefined;
			await updateOracle(String(form.get('id') ?? ''), parseCreateOracle(values), user, imageKey);
			return { success: true };
		} catch (error) {
			if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message ?? 'Ungültige Eingabe.', values });
			console.error('Oracle could not be updated:', error);
			return fail(500, { error: 'Das Orakel konnte nicht aktualisiert werden.', values });
		}
	},
	delete: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		try {
			await deleteOracle(String((await request.formData()).get('id') ?? ''), user);
			return { deleted: true };
		} catch (error) {
			console.error('Oracle could not be deleted:', error);
			return fail(400, { error: 'Das Orakel konnte nicht gelöscht werden.' });
		}
	}
};