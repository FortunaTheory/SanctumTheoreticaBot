import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { loadBotConfig } from './admin-config';

const sessionCookie = 'sanctum_session';
const oauthStateCookie = 'sanctum_oauth_state';
const sessionLifetimeSeconds = 60 * 60 * 12;
const administratorBit = 8n;

export type DashboardUser = { id: string; username: string };
type DiscordIdentity = { id: string; global_name: string | null; username: string };
type DiscordMember = { roles: string[]; permissions?: string };

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required for dashboard authentication.`);
	return value;
}

function sign(value: string): string {
	return createHmac('sha256', requiredEnv('SESSION_SECRET')).update(value).digest('base64url');
}

function encodeSession(user: DashboardUser): string {
	const payload = Buffer.from(JSON.stringify({ ...user, expiresAt: Date.now() + sessionLifetimeSeconds * 1000 })).toString('base64url');
	return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string): DashboardUser | undefined {
	const [payload, signature] = value.split('.');
	if (!payload || !signature) return undefined;
	const expected = sign(payload);
	if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return undefined;
	try {
		const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as DashboardUser & { expiresAt: number };
		return typeof session.id === 'string' && typeof session.username === 'string' && Date.now() < session.expiresAt
			? { id: session.id, username: session.username }
			: undefined;
	} catch {
		return undefined;
	}
}

const cookieOptions = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };

export function getDashboardUser(cookies: Cookies): DashboardUser | undefined {
	const session = cookies.get(sessionCookie);
	return session ? decodeSession(session) : undefined;
}

export function createOAuthState(cookies: Cookies): string {
	const state = randomBytes(32).toString('base64url');
	cookies.set(oauthStateCookie, state, { ...cookieOptions, maxAge: 600 });
	return state;
}

export function consumeOAuthState(cookies: Cookies, state: string | null): boolean {
	const expected = cookies.get(oauthStateCookie);
	cookies.delete(oauthStateCookie, cookieOptions);
	return Boolean(state && expected && state.length === expected.length && timingSafeEqual(Buffer.from(state), Buffer.from(expected)));
}

export function createSession(cookies: Cookies, user: DashboardUser): void {
	cookies.set(sessionCookie, encodeSession(user), { ...cookieOptions, maxAge: sessionLifetimeSeconds });
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(sessionCookie, cookieOptions);
}

export function isDashboardOwner(user: DashboardUser): boolean {
	return user.id === process.env.OWNER_DISCORD_ID;
}

export function getDiscordAuthorizeUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: requiredEnv('DISCORD_CLIENT_ID'),
		redirect_uri: `${requiredEnv('DASHBOARD_URL')}/auth/callback`,
		response_type: 'code',
		scope: 'identify',
		state
	});
	return `https://discord.com/oauth2/authorize?${params}`;
}

export async function authenticateDiscordCode(code: string): Promise<DashboardUser> {
	const callbackUrl = `${requiredEnv('DASHBOARD_URL')}/auth/callback`;
	const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ client_id: requiredEnv('DISCORD_CLIENT_ID'), client_secret: requiredEnv('DISCORD_CLIENT_SECRET'), grant_type: 'authorization_code', code, redirect_uri: callbackUrl })
	});
	if (!tokenResponse.ok) throw new Error('Discord OAuth token exchange failed.');
	const token = await tokenResponse.json() as { access_token?: string };
	if (!token.access_token) throw new Error('Discord OAuth did not return an access token.');

	const identityResponse = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token.access_token}` } });
	if (!identityResponse.ok) throw new Error('Discord identity lookup failed.');
	const identity = await identityResponse.json() as DiscordIdentity;
	const memberResponse = await fetch(`https://discord.com/api/guilds/${requiredEnv('DISCORD_GUILD_ID')}/members/${identity.id}`, {
		headers: { Authorization: `Bot ${requiredEnv('DISCORD_BOT_TOKEN')}` }
	});
	if (!memberResponse.ok) throw new Error('Discord guild membership lookup failed.');
	const member = await memberResponse.json() as DiscordMember;
	let runtimeConfig;
	try {
		runtimeConfig = await loadBotConfig();
	} catch (error) {
		console.warn('Dashboard authorization falls back to environment configuration:', error);
	}
	const allowedRoles = runtimeConfig?.modRoleIds ?? (process.env.DISCORD_MOD_ROLE_IDS ?? '').split(',').map((role) => role.trim()).filter(Boolean);
	const allowedUserIds = runtimeConfig?.dashboardAllowedUserIds ?? (process.env.DASHBOARD_ALLOWED_USER_IDS ?? '').split(',').map((userId) => userId.trim()).filter(Boolean);
	const isAdministrator = member.permissions !== undefined
		&& (BigInt(member.permissions) & administratorBit) === administratorBit;
	const isExplicitlyAllowed = allowedUserIds.includes(identity.id) || identity.id === process.env.OWNER_DISCORD_ID;
	if (!isExplicitlyAllowed && !isAdministrator && !member.roles.some((role) => allowedRoles.includes(role))) {
		throw new Error('This Discord account is not authorized for the dashboard.');
	}
	return { id: identity.id, username: identity.global_name || identity.username };
}