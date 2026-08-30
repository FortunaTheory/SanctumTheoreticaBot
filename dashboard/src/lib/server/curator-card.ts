import { basename } from 'node:path';
import { z } from 'zod';
import { query, transaction, type TransactionQuery } from './database';
import { loadImage, uploadImage } from './storage';

const discordId = z.string().trim().regex(/^\d{17,20}$/, 'Die Discord-ID muss 17 bis 20 Ziffern enthalten.');
const editableSchema = z.object({
	title: z.string().trim().min(3).max(100),
	status: z.string().trim().min(3).max(100),
	note: z.string().trim().min(3).max(500),
	footer: z.string().trim().min(3).max(150),
	author: z.string().trim().min(3).max(100),
	color: z.string().trim().regex(/^[0-9a-fA-F]{6}$/, 'Die Farbe muss aus sechs Hex-Zeichen bestehen.'),
	guildId: discordId.nullable(),
	channelId: discordId.nullable()
}).refine((card) => Boolean(card.guildId) === Boolean(card.channelId), {
	message: 'Guild-ID und Channel-ID müssen gemeinsam eingetragen oder beide leer sein.',
	path: ['channelId']
});

const cardSchema = editableSchema.extend({ imageKey: z.string().nullable(), updatedAt: z.string(), updatedBy: z.string() });
export type CuratorCard = z.infer<typeof cardSchema>;
type Author = { id: string; username: string };

const initialCard = {
	title: 'Die Kuratorin', status: 'Unter Beobachtung', note: 'Das Archiv ist wach. Der Schleier bleibt geschlossen, bis er entscheidet, dass du bereit bist.', footer: 'Sanctum Theoretica · Interne Aufzeichnung', author: 'Die Kuratorin · Sanctum Theoretica', color: '8c52b8', guildId: null, channelId: null
};

export function parseCuratorCard(input: unknown): z.infer<typeof editableSchema> {
	const value = input as Record<string, string>;
	return editableSchema.parse({ ...value, guildId: value.guildId?.trim() || null, channelId: value.channelId?.trim() || null });
}

export async function ensureCuratorCard(): Promise<CuratorCard> {
	const existing = await query<CuratorCard>('SELECT title, status, note, footer, author, color, image_key AS "imageKey", guild_id AS "guildId", channel_id AS "channelId", updated_at::text AS "updatedAt", updated_by AS "updatedBy" FROM curator_card WHERE singleton = true');
	if (existing[0]) return cardSchema.parse(existing[0]);
	const rows = await query<CuratorCard>(
		`INSERT INTO curator_card (singleton, title, status, note, footer, author, color, updated_by) VALUES (true, $1, $2, $3, $4, $5, $6, 'system')
		 RETURNING title, status, note, footer, author, color, image_key AS "imageKey", guild_id AS "guildId", channel_id AS "channelId", updated_at::text AS "updatedAt", updated_by AS "updatedBy"`,
		[initialCard.title, initialCard.status, initialCard.note, initialCard.footer, initialCard.author, initialCard.color]
	);
	return cardSchema.parse(rows[0]);
}

export async function updateCuratorCard(input: z.infer<typeof editableSchema>, author: Author, image?: File): Promise<CuratorCard> {
	const imageKey = image && image.size > 0 ? await uploadImage(image, 'profile') : undefined;
	return transaction(async (execute) => {
		const previous = await ensureCardInTransaction(execute);
		const rows = await execute<CuratorCard>(
			`UPDATE curator_card SET title=$1, status=$2, note=$3, footer=$4, author=$5, color=$6, guild_id=$7, channel_id=$8, image_key=COALESCE($9, image_key), updated_at=now(), updated_by=$10 WHERE singleton=true
			 RETURNING title, status, note, footer, author, color, image_key AS "imageKey", guild_id AS "guildId", channel_id AS "channelId", updated_at::text AS "updatedAt", updated_by AS "updatedBy"`,
			[input.title, input.status, input.note, input.footer, input.author, input.color, input.guildId, input.channelId, imageKey ?? null, author.id]
		);
		const next = cardSchema.parse(rows[0]);
		await audit(execute, 'update', author, previous, next);
		return next;
	});
}

export async function sendCuratorCard(author: Author): Promise<void> {
	const card = await ensureCuratorCard();
	if (!card.guildId || !card.channelId) throw new Error('Trage zuerst Guild-ID und Channel-ID für die Kuratorin-Karte ein.');
	const authorization = `Bot ${requiredEnv('DISCORD_BOT_TOKEN')}`;
	const channelResponse = await fetch(`https://discord.com/api/v10/channels/${card.channelId}`, { headers: { Authorization: authorization } });
	if (!channelResponse.ok) {
		const detail = await discordErrorDetail(channelResponse);
		if (channelResponse.status === 403) {
			throw new Error(`Der Dashboard-Bot darf den Zielkanal nicht ansehen (${detail}). Gib ihm dort mindestens „Kanal ansehen“, „Nachrichten senden“ und „Links einbetten“.`);
		}
		throw new Error(`Discord konnte den Zielkanal nicht prüfen (${channelResponse.status}: ${detail}).`);
	}
	const channel = await channelResponse.json() as { guild_id?: string };
	if (channel.guild_id !== card.guildId) throw new Error('Die eingetragene Guild-ID gehört nicht zum gewählten Zielkanal.');
	const embed = { color: Number.parseInt(card.color, 16), author: { name: card.author }, title: `◈ INTERNE AKTE · ${card.title}`, description: `*${card.note}*`, fields: [{ name: 'Archivstatus', value: card.status, inline: true }], footer: { text: card.footer }, timestamp: new Date().toISOString() } as Record<string, unknown>;
	let body: BodyInit;
	const headers: HeadersInit = { Authorization: authorization };
	if (card.imageKey) {
		const image = await loadImage(card.imageKey);
		const fileName = basename(card.imageKey);
		embed.image = { url: `attachment://${fileName}` };
		const form = new FormData();
		form.set('payload_json', JSON.stringify({ embeds: [embed] }));
		form.set('files[0]', new Blob([new Uint8Array(image.body)], { type: image.contentType }), fileName);
		body = form;
	} else {
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify({ embeds: [embed] });
	}
	const response = await fetch(`https://discord.com/api/v10/channels/${card.channelId}/messages`, { method: 'POST', headers, body });
	if (!response.ok) {
		const detail = await discordErrorDetail(response);
		if (response.status === 403) {
			throw new Error(`Der Dashboard-Bot darf im Zielkanal nicht posten (${detail}). Prüfe „Nachrichten senden“ und „Links einbetten“.`);
		}
		throw new Error(`Discord konnte die Kuratorin-Karte nicht senden (${response.status}: ${detail}).`);
	}
	await transaction(async (execute) => audit(execute, 'send', author, card, card));
}

async function ensureCardInTransaction(execute: TransactionQuery): Promise<CuratorCard> {
	const rows = await execute<CuratorCard>('SELECT title, status, note, footer, author, color, image_key AS "imageKey", guild_id AS "guildId", channel_id AS "channelId", updated_at::text AS "updatedAt", updated_by AS "updatedBy" FROM curator_card WHERE singleton = true');
	if (rows[0]) return cardSchema.parse(rows[0]);
	const created = await execute<CuratorCard>(`INSERT INTO curator_card (singleton, title, status, note, footer, author, color, updated_by) VALUES (true, $1, $2, $3, $4, $5, $6, 'system') RETURNING title, status, note, footer, author, color, image_key AS "imageKey", guild_id AS "guildId", channel_id AS "channelId", updated_at::text AS "updatedAt", updated_by AS "updatedBy"`, [initialCard.title, initialCard.status, initialCard.note, initialCard.footer, initialCard.author, initialCard.color]);
	return cardSchema.parse(created[0]);
}

async function discordErrorDetail(response: Response): Promise<string> {
	try {
		const payload = await response.json() as { message?: string };
		return payload.message ?? 'Unbekannter Discord-Fehler';
	} catch {
		return 'Unbekannter Discord-Fehler';
	}
}

function requiredEnv(name: string): string { const value = process.env[name]; if (!value) throw new Error(`${name} ist nicht konfiguriert.`); return value; }
async function audit(execute: TransactionQuery, action: 'update' | 'send', author: Author, previous: CuratorCard, next: CuratorCard): Promise<void> { await execute(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value) VALUES ('curator_card', '00000000-0000-0000-0000-000000000006', $1, $2, $3, $4::jsonb, $5::jsonb)`, [action, author.id, author.username, JSON.stringify(previous), JSON.stringify(next)]); }