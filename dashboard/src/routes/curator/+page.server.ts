import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { isDashboardOwner } from '$lib/server/admin-config';
import { ensureCuratorCard, type CuratorCard } from '$lib/server/curator-card';
import { loadPersonas, type CuratorPersona } from '$lib/server/curator-chat';

function requireOwner(cookies: Parameters<typeof getDashboardUser>[0]) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	if (!isDashboardOwner(user.id)) throw error(403, 'Dieser Bereich ist nur für die Archivleitung zugänglich.');
}

export const load: PageServerLoad = async ({ cookies }) => {
	requireOwner(cookies);

	const [personasResult, cardResult] = await Promise.allSettled([loadPersonas(), ensureCuratorCard()]);
	const personas: CuratorPersona[] = personasResult.status === 'fulfilled' ? personasResult.value : [];
	const card: CuratorCard | undefined = cardResult.status === 'fulfilled' ? cardResult.value : undefined;

	if (personasResult.status === 'rejected') console.error('Failed to load curator personas for hub:', personasResult.reason);
	if (cardResult.status === 'rejected') console.error('Failed to load curator card for hub:', cardResult.reason);

	return { personas, card };
};
