import type { PageServerLoad } from './$types';
import { getDashboardUser } from '$lib/server/auth';
import { loadCatalog } from '$lib/server/content';
import { DatabaseUnavailableError } from '$lib/server/database';

export const load: PageServerLoad = async ({ cookies }) => {
	const user = getDashboardUser(cookies);
	if (!user) return { user: undefined, catalog: undefined, databaseReady: Boolean(process.env.DATABASE_URL) };
	try {
		return { user, catalog: await loadCatalog(), databaseReady: true };
	} catch (error) {
		if (error instanceof DatabaseUnavailableError) return { user, catalog: undefined, databaseReady: false };
		throw error;
	}
};