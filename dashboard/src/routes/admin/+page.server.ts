import { error, fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { ensureBotConfig, isDashboardOwner, parseBotConfig, updateBotConfig } from '$lib/server/admin-config';
import { getDashboardUser } from '$lib/server/auth';

function requireOwner(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	if (!isDashboardOwner(user.id)) throw error(403, 'Dieser Bereich ist ausschließlich für die Archivleitung bestimmt.');
	return user;
}

export const load: PageServerLoad = async ({ cookies }) => {
	requireOwner(cookies);
	return { config: await ensureBotConfig() };
};

export const actions: Actions = {
	save: async ({ request, cookies }) => {
		const user = requireOwner(cookies);
		const form = await request.formData();
		const values = {
			guildId: String(form.get('guildId') ?? ''), modRoleIds: String(form.get('modRoleIds') ?? ''),
			dashboardAllowedUserIds: String(form.get('dashboardAllowedUserIds') ?? ''), whisperChannelId: String(form.get('whisperChannelId') ?? ''),
			whisperMinHours: String(form.get('whisperMinHours') ?? ''), whisperMaxHours: String(form.get('whisperMaxHours') ?? '')
		};
		try {
			await updateBotConfig(parseBotConfig(values), user);
			return { success: true };
		} catch (caught) {
			if (caught instanceof ZodError) return fail(400, { error: caught.issues[0]?.message ?? 'Die Konfiguration ist ungültig.', values });
			console.error('Bot configuration could not be updated:', caught);
			return fail(500, { error: 'Die Konfiguration konnte nicht gespeichert werden.', values });
		}
	}
};