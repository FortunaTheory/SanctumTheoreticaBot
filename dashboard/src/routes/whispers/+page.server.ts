import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { uploadImage } from '$lib/server/storage';
import { createWhisper, createWhisperTarget, deleteWhisper, deleteWhisperTarget, loadWhisperCatalog, parseWhisperInput, parseWhisperTarget, updateWhisper, updateWhisperTarget } from '$lib/server/whispers';

function requireUser(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	return user;
}

function message(form: FormData) { return String(form.get('text') ?? ''); }

export const load: PageServerLoad = async ({ cookies }) => {
	requireUser(cookies);
	return loadWhisperCatalog();
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const user = requireUser(cookies); const form = await request.formData(); const image = form.get('image');
		try { const imageKey = image instanceof File && image.size > 0 ? await uploadImage(image, 'whisper') : undefined; await createWhisper(parseWhisperInput({ text: message(form), hasImage: Boolean(imageKey) }), imageKey, user); return { success: true }; }
		catch (error) { if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message }); console.error('Whisper creation failed:', error); return fail(500, { error: 'Der Whisper konnte nicht gespeichert werden.' }); }
	},
	update: async ({ request, cookies }) => {
		const user = requireUser(cookies); const form = await request.formData(); const image = form.get('image');
		try { const imageKey = image instanceof File && image.size > 0 ? await uploadImage(image, 'whisper') : undefined; await updateWhisper(String(form.get('id') ?? ''), parseWhisperInput({ text: message(form), hasImage: Boolean(imageKey) || form.get('hasImage') === 'true' }), imageKey, user); return { success: true }; }
		catch (error) { if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message }); console.error('Whisper update failed:', error); return fail(500, { error: 'Der Whisper konnte nicht aktualisiert werden.' }); }
	},
	delete: async ({ request, cookies }) => { const user = requireUser(cookies); try { await deleteWhisper(String((await request.formData()).get('id') ?? ''), user); return { success: true }; } catch (error) { console.error('Whisper deletion failed:', error); return fail(400, { error: 'Der Whisper konnte nicht gelöscht werden.' }); } },
	addTarget: async ({ request, cookies }) => { const user = requireUser(cookies); const form = await request.formData(); try { await createWhisperTarget(parseWhisperTarget({ userId: String(form.get('userId') ?? '') }), user); return { success: true }; } catch (error) { if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message }); console.error('Target creation failed:', error); return fail(400, { error: 'Die Zielperson konnte nicht gespeichert werden.' }); } },
	updateTarget: async ({ request, cookies }) => { const user = requireUser(cookies); const form = await request.formData(); try { await updateWhisperTarget(String(form.get('id') ?? ''), parseWhisperTarget({ userId: String(form.get('userId') ?? '') }), user); return { success: true }; } catch (error) { if (error instanceof ZodError) return fail(400, { error: error.issues[0]?.message }); console.error('Target update failed:', error); return fail(400, { error: 'Die Zielperson konnte nicht aktualisiert werden.' }); } },
	deleteTarget: async ({ request, cookies }) => { const user = requireUser(cookies); try { await deleteWhisperTarget(String((await request.formData()).get('id') ?? ''), user); return { success: true }; } catch (error) { console.error('Target deletion failed:', error); return fail(400, { error: 'Die Zielperson konnte nicht gelöscht werden.' }); } }
};