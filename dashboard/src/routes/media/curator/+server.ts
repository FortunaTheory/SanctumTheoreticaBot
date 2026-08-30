import { error, redirect } from '@sveltejs/kit';
import { isDashboardOwner } from '$lib/server/admin-config';
import { getDashboardUser } from '$lib/server/auth';
import { ensureCuratorCard } from '$lib/server/curator-card';
import { loadImage } from '$lib/server/storage';

export async function GET({ cookies }) {
	const user = getDashboardUser(cookies);
	if (!user) throw redirect(302, '/');
	if (!isDashboardOwner(user.id)) throw error(403, 'Diese Datei ist nur für die Archivleitung sichtbar.');

	const card = await ensureCuratorCard();
	if (!card.imageKey) throw error(404, 'Für die Kuratorin-Karte ist kein Visual hinterlegt.');
	const image = await loadImage(card.imageKey);
	return new Response(new Uint8Array(image.body), {
		headers: {
			'Content-Type': image.contentType,
			'Cache-Control': 'private, max-age=300'
		}
	});
}