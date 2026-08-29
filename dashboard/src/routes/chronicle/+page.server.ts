import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { loadRevisions, restoreRevision } from '$lib/server/content';

function requireUser(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	return user;
}

export const load: PageServerLoad = async ({ cookies }) => {
	requireUser(cookies);
	return { revisions: await loadRevisions() };
};

export const actions: Actions = {
	restore: async ({ request, cookies }) => {
		const user = requireUser(cookies);
		const revisionId = Number((await request.formData()).get('revisionId'));
		if (!Number.isInteger(revisionId) || revisionId <= 0) return fail(400, { error: 'Die Revision ist ungültig.' });
		try {
			await restoreRevision(revisionId, user);
			return { success: true };
		} catch (error) {
			console.error('Revision could not be restored:', error);
			return fail(400, { error: error instanceof Error ? error.message : 'Die Revision konnte nicht wiederhergestellt werden.' });
		}
	}
};