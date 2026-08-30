import { error, fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { ensureCuratorCard, parseCuratorCard, sendCuratorCard, updateCuratorCard } from '$lib/server/curator-card';
import { getDashboardUser } from '$lib/server/auth';
import { isDashboardOwner } from '$lib/server/admin-config';

function requireOwner(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	if (!isDashboardOwner(user.id)) throw error(403, 'Diese Akte ist nur für die Archivleitung zugänglich.');
	return user;
}

function formValues(form: FormData) {
	return { title: String(form.get('title') ?? ''), status: String(form.get('status') ?? ''), note: String(form.get('note') ?? ''), footer: String(form.get('footer') ?? ''), author: String(form.get('author') ?? ''), color: String(form.get('color') ?? ''), guildId: String(form.get('guildId') ?? ''), channelId: String(form.get('channelId') ?? '') };
}

export const load: PageServerLoad = async ({ cookies }) => {
	requireOwner(cookies);
	return { card: await ensureCuratorCard() };
};

export const actions: Actions = {
	save: async ({ request, cookies }) => {
		const user = requireOwner(cookies); const form = await request.formData(); const values = formValues(form);
		try { const image = form.get('image'); await updateCuratorCard(parseCuratorCard(values), user, image instanceof File && image.size > 0 ? image : undefined); return { success: true }; }
		catch (caught) { if (caught instanceof ZodError) return fail(400, { error: caught.issues[0]?.message ?? 'Die Karte ist ungültig.', values }); console.error('Curator card update failed:', caught); return fail(500, { error: 'Die Kuratorin-Karte konnte nicht gespeichert werden.', values }); }
	},
	send: async ({ cookies }) => {
		const user = requireOwner(cookies);
		try { await sendCuratorCard(user); return { sent: true }; }
		catch (caught) { console.error('Curator card send failed:', caught); return fail(500, { error: caught instanceof Error ? caught.message : 'Die Kuratorin-Karte konnte nicht gesendet werden.' }); }
	}
};