import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';

export function POST({ cookies }) {
	clearSession(cookies);
	throw redirect(303, '/');
}