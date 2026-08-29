import { z } from 'zod';
import { query, transaction } from './database';

const entrySchema = z.object({ id: z.string().uuid(), text: z.string().nullable(), imageKey: z.string().nullable(), updatedAt: z.string() });
const targetSchema = z.object({ id: z.string().uuid(), userId: z.string().regex(/^\d{17,20}$/), updatedAt: z.string() });
const whisperInputSchema = z.object({ text: z.string().trim().max(500, 'Ein Whisper darf höchstens 500 Zeichen enthalten.'), hasImage: z.boolean() }).refine((entry) => Boolean(entry.text) || entry.hasImage, { message: 'Ein Whisper benötigt Text oder ein Visual.', path: ['text'] });
const targetInputSchema = z.object({ userId: z.string().trim().regex(/^\d{17,20}$/, 'Die Nutzer-ID muss eine gültige Discord-ID sein.') });

export type WhisperEntry = z.infer<typeof entrySchema>;
export type WhisperTarget = z.infer<typeof targetSchema>;
type Author = { id: string; username: string };

export function parseWhisperInput(input: unknown) { return whisperInputSchema.parse(input); }
export function parseWhisperTarget(input: unknown) { return targetInputSchema.parse(input); }

export async function loadWhisperCatalog(): Promise<{ entries: WhisperEntry[]; targets: WhisperTarget[] }> {
	const [entries, targets] = await Promise.all([
		query<WhisperEntry>('SELECT id, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM whisper_entries ORDER BY updated_at DESC'),
		query<WhisperTarget>('SELECT id, user_id AS "userId", updated_at::text AS "updatedAt" FROM whisper_targets ORDER BY created_at')
	]);
	return { entries: z.array(entrySchema).parse(entries), targets: z.array(targetSchema).parse(targets) };
}

export async function createWhisper(input: z.infer<typeof whisperInputSchema>, imageKey: string | undefined, author: Author): Promise<void> {
	const entries = await query<WhisperEntry>(
		`INSERT INTO whisper_entries (text, image_key, updated_by) VALUES ($1, $2, $3)
		 RETURNING id, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
		[input.text || null, imageKey ?? null, author.id]
	);
	const entry = entrySchema.parse(entries[0]);
	await audit('whisper', entry.id, 'create', author, null, entry);
}

export async function updateWhisper(id: string, input: z.infer<typeof whisperInputSchema>, imageKey: string | undefined, author: Author): Promise<void> {
	await transaction(async (execute) => {
		const previous = entrySchema.parse((await execute<WhisperEntry>('SELECT id, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM whisper_entries WHERE id = $1', [id]))[0]);
		const entry = entrySchema.parse((await execute<WhisperEntry>(
			`UPDATE whisper_entries SET text = $2, image_key = COALESCE($3, image_key), updated_at = now(), updated_by = $4 WHERE id = $1
			 RETURNING id, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
			[id, input.text || null, imageKey ?? null, author.id]
		))[0]);
		await auditWith(execute, 'whisper', id, 'update', author, previous, entry);
	});
}

export async function deleteWhisper(id: string, author: Author): Promise<void> {
	await transaction(async (execute) => {
		const previous = entrySchema.parse((await execute<WhisperEntry>('DELETE FROM whisper_entries WHERE id = $1 RETURNING id, text, image_key AS "imageKey", updated_at::text AS "updatedAt"', [id]))[0]);
		await auditWith(execute, 'whisper', id, 'delete', author, previous, null);
	});
}

export async function createWhisperTarget(input: z.infer<typeof targetInputSchema>, author: Author): Promise<void> {
	const targets = await query<WhisperTarget>(
		`INSERT INTO whisper_targets (user_id, updated_by) VALUES ($1, $2)
		 RETURNING id, user_id AS "userId", updated_at::text AS "updatedAt"`,
		[input.userId, author.id]
	);
	const target = targetSchema.parse(targets[0]);
	await audit('whisper_target', target.id, 'create', author, null, target);
}

export async function updateWhisperTarget(id: string, input: z.infer<typeof targetInputSchema>, author: Author): Promise<void> {
	await transaction(async (execute) => {
		const previous = targetSchema.parse((await execute<WhisperTarget>('SELECT id, user_id AS "userId", updated_at::text AS "updatedAt" FROM whisper_targets WHERE id = $1', [id]))[0]);
		const target = targetSchema.parse((await execute<WhisperTarget>(
			'UPDATE whisper_targets SET user_id = $2, updated_at = now(), updated_by = $3 WHERE id = $1 RETURNING id, user_id AS "userId", updated_at::text AS "updatedAt"',
			[id, input.userId, author.id]
		))[0]);
		await auditWith(execute, 'whisper_target', id, 'update', author, previous, target);
	});
}

export async function deleteWhisperTarget(id: string, author: Author): Promise<void> {
	await transaction(async (execute) => {
		const previous = targetSchema.parse((await execute<WhisperTarget>('DELETE FROM whisper_targets WHERE id = $1 RETURNING id, user_id AS "userId", updated_at::text AS "updatedAt"', [id]))[0]);
		await auditWith(execute, 'whisper_target', id, 'delete', author, previous, null);
	});
}

async function audit(resourceType: 'whisper' | 'whisper_target', resourceId: string, action: 'create', author: Author, previous: unknown, next: unknown): Promise<void> {
	await query(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`, [resourceType, resourceId, action, author.id, author.username, JSON.stringify(previous), JSON.stringify(next)]);
}

async function auditWith(execute: Parameters<typeof transaction>[0] extends (execute: infer Query) => Promise<unknown> ? Query : never, resourceType: 'whisper' | 'whisper_target', resourceId: string, action: 'update' | 'delete', author: Author, previous: unknown, next: unknown): Promise<void> {
	await execute(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`, [resourceType, resourceId, action, author.id, author.username, JSON.stringify(previous), JSON.stringify(next)]);
}