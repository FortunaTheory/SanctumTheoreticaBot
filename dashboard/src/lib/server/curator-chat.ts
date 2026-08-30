import { basename } from 'node:path';
import { z } from 'zod';
import { query, transaction, type TransactionQuery } from './database';
import { loadImage, uploadImage } from './storage';

const personaSchema = z.object({
	id: z.string().uuid(),
	name: z.string().trim().min(1).max(80),
	imageKey: z.string().nullable(),
	description: z.string().nullable(),
	isDefault: z.boolean(),
	updatedAt: z.string(),
	updatedBy: z.string()
});

export type CuratorPersona = z.infer<typeof personaSchema>;
type Author = { id: string; username: string };

const editablePersonaSchema = z.object({
	name: z.string().trim().min(1, 'Der Name der Persona muss mindestens 1 Zeichen lang sein.').max(80, 'Der Name darf höchstens 80 Zeichen lang sein.'),
	description: z.string().trim().max(300, 'Die Beschreibung darf maximal 300 Zeichen lang sein.').optional().or(z.literal('')),
	isDefault: z.boolean().default(false)
});

export type EditablePersonaInput = z.infer<typeof editablePersonaSchema>;

export function parsePersonaInput(input: unknown): EditablePersonaInput {
	return editablePersonaSchema.parse(input);
}

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} ist nicht konfiguriert.`);
	return value;
}

export async function loadPersonas(): Promise<CuratorPersona[]> {
	const rows = await query<CuratorPersona>(
		'SELECT id, name, image_key AS "imageKey", description, is_default AS "isDefault", updated_at::text AS "updatedAt", updated_by AS "updatedBy" FROM curator_personas ORDER BY is_default DESC, name ASC'
	);
	return z.array(personaSchema).parse(rows);
}

export async function createPersona(input: EditablePersonaInput, author: Author, image?: File): Promise<CuratorPersona> {
	const imageKey = image && image.size > 0 ? await uploadImage(image, 'persona') : undefined;

	return transaction(async (execute) => {
		if (input.isDefault) {
			await execute('UPDATE curator_personas SET is_default = false WHERE is_default = true');
		}

		const rows = await execute<CuratorPersona>(
			`INSERT INTO curator_personas (name, image_key, description, is_default, updated_by)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, name, image_key AS "imageKey", description, is_default AS "isDefault", updated_at::text AS "updatedAt", updated_by AS "updatedBy"`,
			[input.name, imageKey ?? null, input.description || null, input.isDefault, author.id]
		);
		const persona = personaSchema.parse(rows[0]);

		await execute(
			`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, next_value)
			 VALUES ('curator_persona', $1, 'create', $2, $3, $4::jsonb)`,
			[persona.id, author.id, author.username, JSON.stringify(persona)]
		);

		return persona;
	});
}

export async function updatePersona(id: string, input: EditablePersonaInput, author: Author, image?: File): Promise<CuratorPersona> {
	const imageKey = image && image.size > 0 ? await uploadImage(image, 'persona') : undefined;

	return transaction(async (execute) => {
		const previousRows = await execute<CuratorPersona>(
			'SELECT id, name, image_key AS "imageKey", description, is_default AS "isDefault", updated_at::text AS "updatedAt", updated_by AS "updatedBy" FROM curator_personas WHERE id = $1',
			[id]
		);
		const previous = personaSchema.parse(previousRows[0]);

		if (input.isDefault) {
			await execute('UPDATE curator_personas SET is_default = false WHERE is_default = true AND id <> $1', [id]);
		}

		const rows = await execute<CuratorPersona>(
			`UPDATE curator_personas SET name = $2, image_key = COALESCE($3, image_key), description = $4, is_default = $5, updated_at = now(), updated_by = $6
			 WHERE id = $1
			 RETURNING id, name, image_key AS "imageKey", description, is_default AS "isDefault", updated_at::text AS "updatedAt", updated_by AS "updatedBy"`,
			[id, input.name, imageKey ?? null, input.description || null, input.isDefault, author.id]
		);
		const updated = personaSchema.parse(rows[0]);

		await execute(
			`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value)
			 VALUES ('curator_persona', $1, 'update', $2, $3, $4::jsonb, $5::jsonb)`,
			[id, author.id, author.username, JSON.stringify(previous), JSON.stringify(updated)]
		);

		return updated;
	});
}

export async function deletePersona(id: string, author: Author): Promise<void> {
	await transaction(async (execute) => {
		const previousRows = await execute<CuratorPersona>(
			'SELECT id, name, image_key AS "imageKey", description, is_default AS "isDefault", updated_at::text AS "updatedAt", updated_by AS "updatedBy" FROM curator_personas WHERE id = $1',
			[id]
		);
		const previous = personaSchema.parse(previousRows[0]);

		if (previous.isDefault) {
			throw new Error('Die Standard-Persona kann nicht gelöscht werden. Bestimme zuerst eine andere als Standard.');
		}

		await execute('DELETE FROM curator_personas WHERE id = $1', [id]);
		await execute(
			`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value)
			 VALUES ('curator_persona', $1, 'delete', $2, $3, $4::jsonb)`,
			[id, author.id, author.username, JSON.stringify(previous)]
		);
	});
}

export type SendChatMessageInput = {
	targetMode: 'channel' | 'webhook';
	channelId?: string;
	webhookUrl?: string;
	personaId?: string;
	customName?: string;
	customAvatarUrl?: string;
	content: string;
	attachment?: File;
};

const discordIdRegex = /^\d{17,20}$/;
const webhookUrlRegex = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

async function getOrCreateWebhookForChannel(channelId: string): Promise<string> {
	const botToken = requiredEnv('DISCORD_BOT_TOKEN');

	// 1. Fetch existing webhooks for this channel
	const listRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/webhooks`, {
		headers: { Authorization: `Bot ${botToken}` }
	});

	if (!listRes.ok) {
		throw new Error(`Kanal-Webhooks konnten nicht abgerufen werden (${listRes.status}). Stelle sicher, dass der Bot die Berechtigung "Webhooks verwalten" im Zielkanal hat.`);
	}

	const webhooks = (await listRes.json()) as Array<{ id: string; token?: string; name: string }>;
	const existing = webhooks.find((w) => Boolean(w.token));

	if (existing && existing.token) {
		return `https://discord.com/api/webhooks/${existing.id}/${existing.token}`;
	}

	// 2. Create a new webhook if none exists
	const createRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/webhooks`, {
		method: 'POST',
		headers: {
			Authorization: `Bot ${botToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ name: 'Sanctum Kuratorin' })
	});

	if (!createRes.ok) {
		throw new Error(`Webhook konnte nicht im Kanal erstellt werden (${createRes.status}). Fehlt die Berechtigung "Webhooks verwalten"?`);
	}

	const created = (await createRes.json()) as { id: string; token: string };
	return `https://discord.com/api/webhooks/${created.id}/${created.token}`;
}

export async function sendChatMessage(input: SendChatMessageInput, author: Author): Promise<void> {
	const messageContent = input.content?.trim();
	if (!messageContent && (!input.attachment || input.attachment.size === 0)) {
		throw new Error('Die Nachricht darf nicht leer sein.');
	}
	if (messageContent && messageContent.length > 2000) {
		throw new Error('Die Nachricht darf maximal 2000 Zeichen lang sein.');
	}

	let targetWebhookUrl = '';

	if (input.targetMode === 'webhook') {
		if (!input.webhookUrl || !webhookUrlRegex.test(input.webhookUrl.trim())) {
			throw new Error('Bitte gib eine gültige Discord-Webhook-URL an.');
		}
		targetWebhookUrl = input.webhookUrl.trim();
	} else {
		const chId = input.channelId?.trim();
		if (!chId || !discordIdRegex.test(chId)) {
			throw new Error('Bitte gib eine gültige 17-20-stellige Discord-Channel-ID an.');
		}
		targetWebhookUrl = await getOrCreateWebhookForChannel(chId);
	}

	// Resolve persona / name / avatar
	let username = 'Die Kuratorin';
	let avatarUrl: string | undefined = undefined;

	if (input.personaId) {
		const personas = await loadPersonas();
		const selected = personas.find((p) => p.id === input.personaId);
		if (selected) {
			username = selected.name;
			if (selected.imageKey) {
				const dashboardUrl = requiredEnv('DASHBOARD_URL').replace(/\/$/, '');
				avatarUrl = `${dashboardUrl}/media/avatar/${selected.imageKey}`;
			}
		}
	}

	if (input.customName?.trim()) {
		username = input.customName.trim();
	}
	if (input.customAvatarUrl?.trim()) {
		avatarUrl = input.customAvatarUrl.trim();
	}

	// Prepare payload for Discord Webhook
	const payload: Record<string, unknown> = {
		content: messageContent,
		username,
		avatar_url: avatarUrl
	};

	let body: BodyInit;
	const headers: Record<string, string> = {};

	if (input.attachment && input.attachment.size > 0) {
		// Optional attachment directly uploaded
		const form = new FormData();
		form.set('payload_json', JSON.stringify(payload));
		const fileBuffer = await input.attachment.arrayBuffer();
		form.set('files[0]', new Blob([new Uint8Array(fileBuffer)], { type: input.attachment.type || 'application/octet-stream' }), input.attachment.name || 'image.png');
		body = form;
	} else {
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify(payload);
	}

	const response = await fetch(targetWebhookUrl, {
		method: 'POST',
		headers,
		body
	});

	if (!response.ok) {
		const errText = await response.text();
		console.error('Webhook execution failed:', response.status, errText);
		throw new Error(`Discord Webhook fehlgeschlagen (${response.status}): ${errText}`);
	}

	// Audit log
	await query(
		`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, next_value)
		 VALUES ('curator_chat', '00000000-0000-0000-0000-000000000007', 'send', $1, $2, $3::jsonb)`,
		[
			author.id,
			author.username,
			JSON.stringify({
				username,
				avatarUrl,
				targetMode: input.targetMode,
				channelId: input.channelId,
				content: messageContent,
				timestamp: new Date().toISOString()
			})
		]
	);
}
