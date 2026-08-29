import { redirect } from '@sveltejs/kit';
import { authenticateDiscordCode, consumeOAuthState, createSession } from '$lib/server/auth';

export async function GET({ cookies, url }) {
	if (!consumeOAuthState(cookies, url.searchParams.get('state'))) throw redirect(302, '/?auth=state');
	const code = url.searchParams.get('code');
	if (!code) throw redirect(302, '/?auth=code');
	try {
		createSession(cookies, await authenticateDiscordCode(code));
	} catch (error) {
		console.error('Dashboard authentication failed:', error);
		throw redirect(302, '/?auth=denied');
	}
	throw redirect(302, '/');
}