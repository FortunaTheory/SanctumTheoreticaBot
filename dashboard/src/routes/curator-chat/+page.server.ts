import { error, fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { isDashboardOwner } from '$lib/server/admin-config';
import {
	createPersona,
	deletePersona,
	loadPersonas,
	parsePersonaInput,
	sendChatMessage,
	updatePersona
} from '$lib/server/curator-chat';

function requireOwner(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	if (!isDashboardOwner(user.id)) throw error(403, 'Dieser Bereich ist nur für die Archivleitung zugänglich.');
	return user;
}

export const load: PageServerLoad = async ({ cookies }) => {
	requireOwner(cookies);
	return {
		personas: await loadPersonas()
	};
};

export const actions: Actions = {
	sendMessage: async ({ request, cookies }) => {
		const user = requireOwner(cookies);
		const form = await request.formData();

		const targetMode = form.get('targetMode') === 'webhook' ? 'webhook' : 'channel';
		const channelId = String(form.get('channelId') ?? '');
		const webhookUrl = String(form.get('webhookUrl') ?? '');
		const personaId = String(form.get('personaId') ?? '');
		const customName = String(form.get('customName') ?? '');
		const customAvatarUrl = String(form.get('customAvatarUrl') ?? '');
		const content = String(form.get('content') ?? '');
		const attachment = form.get('attachment') as File | null;

		try {
			await sendChatMessage(
				{
					targetMode,
					channelId,
					webhookUrl,
					personaId: personaId || undefined,
					customName: customName || undefined,
					customAvatarUrl: customAvatarUrl || undefined,
					content,
					attachment: attachment instanceof File && attachment.size > 0 ? attachment : undefined
				},
				user
			);
			return { sent: true };
		} catch (err) {
			console.error('Chat message send failed:', err);
			return fail(400, {
				error: err instanceof Error ? err.message : 'Die Nachricht konnte nicht gesendet werden.',
				values: { targetMode, channelId, webhookUrl, personaId, customName, customAvatarUrl, content }
			});
		}
	},

	createPersona: async ({ request, cookies }) => {
		const user = requireOwner(cookies);
		const form = await request.formData();
		const name = String(form.get('name') ?? '');
		const description = String(form.get('description') ?? '');
		const isDefault = form.get('isDefault') === 'on';
		const image = form.get('image') as File | null;

		try {
			const input = parsePersonaInput({ name, description, isDefault });
			await createPersona(input, user, image instanceof File && image.size > 0 ? image : undefined);
			return { personaCreated: true };
		} catch (err) {
			if (err instanceof ZodError) {
				return fail(400, { personaError: err.issues[0]?.message ?? 'Ungültige Eingabe.' });
			}
			console.error('Persona creation failed:', err);
			return fail(400, { personaError: err instanceof Error ? err.message : 'Preset konnte nicht erstellt werden.' });
		}
	},

	updatePersona: async ({ request, cookies }) => {
		const user = requireOwner(cookies);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '');
		const description = String(form.get('description') ?? '');
		const isDefault = form.get('isDefault') === 'on';
		const image = form.get('image') as File | null;

		try {
			const input = parsePersonaInput({ name, description, isDefault });
			await updatePersona(id, input, user, image instanceof File && image.size > 0 ? image : undefined);
			return { personaUpdated: true };
		} catch (err) {
			if (err instanceof ZodError) {
				return fail(400, { personaError: err.issues[0]?.message ?? 'Ungültige Eingabe.' });
			}
			console.error('Persona update failed:', err);
			return fail(400, { personaError: err instanceof Error ? err.message : 'Preset konnte nicht aktualisiert werden.' });
		}
	},

	deletePersona: async ({ request, cookies }) => {
		const user = requireOwner(cookies);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		try {
			await deletePersona(id, user);
			return { personaDeleted: true };
		} catch (err) {
			console.error('Persona deletion failed:', err);
			return fail(400, { personaError: err instanceof Error ? err.message : 'Preset konnte nicht gelöscht werden.' });
		}
	}
};
