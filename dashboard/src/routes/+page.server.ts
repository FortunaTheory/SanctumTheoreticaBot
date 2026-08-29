import type { PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { isDashboardOwner } from '$lib/server/admin-config';
import { loadCatalog } from '$lib/server/content';
import { DatabaseUnavailableError } from '$lib/server/database';

export const load: PageServerLoad = async ({ cookies }) => {
	const user = getDashboardUser(cookies);
	if (!user) return { user: undefined, isOwner: false, catalog: undefined, databaseReady: Boolean(process.env.DATABASE_URL) };
	try {
		return { user, isOwner: isDashboardOwner(user.id), catalog: await loadCatalog(), databaseReady: true };
	} catch (error) {
		if (error instanceof DatabaseUnavailableError) return { user, isOwner: isDashboardOwner(user.id), catalog: undefined, databaseReady: false };
		throw error;
	}
};