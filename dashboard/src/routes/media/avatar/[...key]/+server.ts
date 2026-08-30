import { error, redirect } from '@sveltejs/kit';
import { loadImage } from '$lib/server/storage';

export async function GET({ params }) {
	const key = params.key;
	if (!key || !/^(persona|chat|oracle|fragment|profile|whisper)\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(key)) {
		throw error(404, 'Ungültiger oder fehlender Bildschlüssel.');
	}

	try {
		const image = await loadImage(key);
		return new Response(new Uint8Array(image.body), {
			headers: {
				'Content-Type': image.contentType,
				'Cache-Control': 'public, max-age=86400, immutable'
			}
		});
	} catch (err) {
		console.error(`Media proxy error for key ${key}:`, err);
		throw error(404, 'Bild konnte nicht geladen werden.');
	}
}
