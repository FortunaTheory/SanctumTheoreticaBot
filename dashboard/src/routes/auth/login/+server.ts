import { redirect } from '@sveltejs/kit';
import { createOAuthState, getDiscordAuthorizeUrl } from '$lib/server/auth';

export function GET({ cookies }) {
	throw redirect(302, getDiscordAuthorizeUrl(createOAuthState(cookies)));
}