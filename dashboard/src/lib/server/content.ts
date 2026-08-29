import { z } from 'zod';
import { query, transaction, type TransactionQuery } from './database';

const oracleSchema = z.object({
	id: z.string().uuid(),
	aspect: z.enum(['archive', 'lucid', 'enigma']),
	text: z.string(),
	imageKey: z.string().nullable(),
	updatedAt: z.string()
});

const fragmentSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	text: z.string(),
	imageKey: z.string().nullable(),
	updatedAt: z.string()
});

const profileSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().nullable(),
	priority: z.number(),
	author: z.string(),
	title: z.string(),
	status: z.string(),
	note: z.string(),
	footer: z.string(),
	color: z.string(),
	imageKey: z.string().nullable(),
	isDefault: z.boolean(),
	updatedAt: z.string()
});

export type OracleEntry = z.infer<typeof oracleSchema>;
export type FragmentEntry = z.infer<typeof fragmentSchema>;
export type ProfileCard = z.infer<typeof profileSchema>;

export type Catalog = {
	oracles: OracleEntry[];
	fragments: FragmentEntry[];
	profiles: ProfileCard[];
};

const revisionSchema = z.object({
	id: z.coerce.number().int().positive(),
	resourceType: z.enum(['oracle', 'fragment', 'profile']),
	resourceId: z.string().uuid(),
	action: z.enum(['create', 'update', 'delete', 'restore']),
	authorId: z.string(),
	authorName: z.string(),
	previousValue: z.unknown().nullable(),
	nextValue: z.unknown().nullable(),
	createdAt: z.string()
});

export type ContentRevision = z.infer<typeof revisionSchema>;

const createOracleSchema = z.object({
	aspect: z.enum(['archive', 'lucid', 'enigma']),
	text: z.string().trim().min(10, 'Ein Orakel benötigt mindestens 10 Zeichen.').max(500, 'Ein Orakel darf höchstens 500 Zeichen enthalten.')
});

export type CreateOracleInput = z.infer<typeof createOracleSchema>;

export function parseCreateOracle(input: unknown): CreateOracleInput {
	return createOracleSchema.parse(input);
}

const createFragmentSchema = z.object({
	title: z.string().trim().min(3, 'Ein Fragment benötigt einen Titel mit mindestens 3 Zeichen.').max(100, 'Ein Fragmenttitel darf höchstens 100 Zeichen enthalten.'),
	text: z.string().trim().min(10, 'Ein Fragment benötigt mindestens 10 Zeichen.').max(800, 'Ein Fragment darf höchstens 800 Zeichen enthalten.')
});

const createProfileSchema = z.object({
	userId: z.string().trim().regex(/^\d{17,20}$/, 'Die Nutzer-ID muss eine gültige Discord-ID sein.').optional().or(z.literal('')),
	priority: z.coerce.number().int().min(0, 'Die Priorität darf nicht negativ sein.').max(100, 'Die Priorität darf höchstens 100 sein.'),
	author: z.string().trim().min(3, 'Eine Kartenautorin oder ein Kartenautor ist erforderlich.').max(100),
	title: z.string().trim().min(3, 'Ein Kartentitel ist erforderlich.').max(100),
	status: z.string().trim().min(3, 'Ein Archivstatus ist erforderlich.').max(100),
	note: z.string().trim().min(3, 'Eine Archivnotiz ist erforderlich.').max(500),
	footer: z.string().trim().min(3, 'Ein Footer ist erforderlich.').max(150),
	color: z.string().trim().regex(/^[0-9a-fA-F]{6}$/, 'Die Farbe muss aus sechs Hex-Zeichen bestehen.'),
	isDefault: z.boolean()
}).refine((card) => card.isDefault || Boolean(card.userId), {
	message: 'Eine Profilkarte benötigt eine Discord-Nutzer-ID oder muss als Standardkarte markiert sein.',
	path: ['userId']
});

export type CreateFragmentInput = z.infer<typeof createFragmentSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export function parseCreateFragment(input: unknown): CreateFragmentInput {
	return createFragmentSchema.parse(input);
}

export function parseCreateProfile(input: unknown): CreateProfileInput {
	return createProfileSchema.parse(input);
}

const entryIdSchema = z.string().uuid('Die Eintrags-ID ist ungültig.');
type Author = { id: string; username: string };

function parseEntryId(id: string): string {
	return entryIdSchema.parse(id);
}

export async function loadCatalog(): Promise<Catalog> {
	const [oracles, fragments, profiles] = await Promise.all([
		query<OracleEntry>('SELECT id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM oracle_entries ORDER BY updated_at DESC'),
		query<FragmentEntry>('SELECT id, title, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM fragment_entries ORDER BY updated_at DESC'),
		query<ProfileCard>('SELECT id, user_id AS "userId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt" FROM profile_cards ORDER BY is_default DESC, updated_at DESC')
	]);

	return {
		oracles: z.array(oracleSchema).parse(oracles),
		fragments: z.array(fragmentSchema).parse(fragments),
		profiles: z.array(profileSchema).parse(profiles)
	};
}

export async function loadRevisions(limit = 80): Promise<ContentRevision[]> {
	const revisions = await query<ContentRevision>(
		`SELECT id, resource_type AS "resourceType", resource_id AS "resourceId", action,
		 author_id AS "authorId", author_name AS "authorName", previous_value AS "previousValue",
		 next_value AS "nextValue", created_at::text AS "createdAt"
		 FROM content_revisions ORDER BY created_at DESC LIMIT $1`,
		[Math.min(Math.max(limit, 1), 200)]
	);
	return z.array(revisionSchema).parse(revisions);
}

export async function createOracle(input: CreateOracleInput, author: Author, imageKey?: string): Promise<OracleEntry> {
	const entries = await query<OracleEntry>(
		`INSERT INTO oracle_entries (aspect, text, image_key, updated_by)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
		[input.aspect, input.text, imageKey ?? null, author.id]
	);
	const entry = oracleSchema.parse(entries[0]);
	await query(
		`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, next_value)
		 VALUES ('oracle', $1, 'create', $2, $3, $4::jsonb)`,
		[entry.id, author.id, author.username, JSON.stringify(entry)]
	);
	return entry;
}

export async function createFragment(input: CreateFragmentInput, author: Author, imageKey?: string): Promise<FragmentEntry> {
	const entries = await query<FragmentEntry>(
		`INSERT INTO fragment_entries (title, text, image_key, updated_by)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, title, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
		[input.title, input.text, imageKey ?? null, author.id]
	);
	const entry = fragmentSchema.parse(entries[0]);
	await query(
		`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, next_value)
		 VALUES ('fragment', $1, 'create', $2, $3, $4::jsonb)`,
		[entry.id, author.id, author.username, JSON.stringify(entry)]
	);
	return entry;
}

export async function createProfileCard(input: CreateProfileInput, author: Author, imageKey?: string): Promise<ProfileCard> {
	return transaction(async (execute) => {
		if (input.isDefault) await execute('UPDATE profile_cards SET is_default = false WHERE is_default = true');
		const entries = await execute<ProfileCard>(
			`INSERT INTO profile_cards (user_id, priority, author, title, status, note, footer, color, image_key, is_default, updated_by)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			 RETURNING id, user_id AS "userId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt"`,
			[input.userId || null, input.priority, input.author, input.title, input.status, input.note, input.footer, input.color, imageKey ?? null, input.isDefault, author.id]
		);
		const entry = profileSchema.parse(entries[0]);
		await execute(
			`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, next_value)
			 VALUES ('profile', $1, 'create', $2, $3, $4::jsonb)`,
			[entry.id, author.id, author.username, JSON.stringify(entry)]
		);
		return entry;
	});
}

export async function updateOracle(id: string, input: CreateOracleInput, author: Author, imageKey?: string): Promise<OracleEntry> {
	return transaction(async (execute) => {
		const previous = oracleSchema.parse((await execute<OracleEntry>('SELECT id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM oracle_entries WHERE id = $1', [parseEntryId(id)]))[0]);
		const entry = oracleSchema.parse((await execute<OracleEntry>(
			`UPDATE oracle_entries SET aspect = $2, text = $3, image_key = COALESCE($4, image_key), updated_at = now(), updated_by = $5 WHERE id = $1
			 RETURNING id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
			[id, input.aspect, input.text, imageKey ?? null, author.id]
		))[0]);
		await execute(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value) VALUES ('oracle', $1, 'update', $2, $3, $4::jsonb, $5::jsonb)`, [id, author.id, author.username, JSON.stringify(previous), JSON.stringify(entry)]);
		return entry;
	});
}

export async function updateFragment(id: string, input: CreateFragmentInput, author: Author, imageKey?: string): Promise<FragmentEntry> {
	return transaction(async (execute) => {
		const previous = fragmentSchema.parse((await execute<FragmentEntry>('SELECT id, title, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM fragment_entries WHERE id = $1', [parseEntryId(id)]))[0]);
		const entry = fragmentSchema.parse((await execute<FragmentEntry>(
			`UPDATE fragment_entries SET title = $2, text = $3, image_key = COALESCE($4, image_key), updated_at = now(), updated_by = $5 WHERE id = $1
			 RETURNING id, title, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
			[id, input.title, input.text, imageKey ?? null, author.id]
		))[0]);
		await execute(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value) VALUES ('fragment', $1, 'update', $2, $3, $4::jsonb, $5::jsonb)`, [id, author.id, author.username, JSON.stringify(previous), JSON.stringify(entry)]);
		return entry;
	});
}

export async function updateProfileCard(id: string, input: CreateProfileInput, author: Author, imageKey?: string): Promise<ProfileCard> {
	return transaction(async (execute) => {
		const previous = profileSchema.parse((await execute<ProfileCard>('SELECT id, user_id AS "userId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt" FROM profile_cards WHERE id = $1', [parseEntryId(id)]))[0]);
		if (input.isDefault) await execute('UPDATE profile_cards SET is_default = false WHERE is_default = true AND id <> $1', [id]);
		const entry = profileSchema.parse((await execute<ProfileCard>(
			`UPDATE profile_cards SET user_id = $2, priority = $3, author = $4, title = $5, status = $6, note = $7, footer = $8, color = $9, image_key = COALESCE($10, image_key), is_default = $11, updated_at = now(), updated_by = $12 WHERE id = $1
			 RETURNING id, user_id AS "userId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt"`,
			[id, input.userId || null, input.priority, input.author, input.title, input.status, input.note, input.footer, input.color, imageKey ?? null, input.isDefault, author.id]
		))[0]);
		await execute(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value) VALUES ('profile', $1, 'update', $2, $3, $4::jsonb, $5::jsonb)`, [id, author.id, author.username, JSON.stringify(previous), JSON.stringify(entry)]);
		return entry;
	});
}

export async function deleteOracle(id: string, author: Author): Promise<void> {
	await deleteEntry('oracle_entries', 'oracle', id, author);
}

export async function deleteFragment(id: string, author: Author): Promise<void> {
	await deleteEntry('fragment_entries', 'fragment', id, author);
}

export async function deleteProfileCard(id: string, author: Author): Promise<void> {
	await transaction(async (execute) => {
		const previous = profileSchema.parse((await execute<ProfileCard>('DELETE FROM profile_cards WHERE id = $1 RETURNING id, user_id AS "userId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt"', [parseEntryId(id)]))[0]);
		if (previous.isDefault) throw new Error('Die Standardkarte kann nicht gelöscht werden. Lege zuerst eine neue Standardkarte fest.');
		await execute(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value) VALUES ('profile', $1, 'delete', $2, $3, $4::jsonb)`, [id, author.id, author.username, JSON.stringify(previous)]);
	});
}

async function deleteEntry(table: 'oracle_entries' | 'fragment_entries', resourceType: 'oracle' | 'fragment', id: string, author: Author): Promise<void> {
	await transaction(async (execute) => {
		const select = resourceType === 'oracle'
			? 'SELECT id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM oracle_entries WHERE id = $1'
			: 'SELECT id, title, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM fragment_entries WHERE id = $1';
		const previous = (await execute<Record<string, unknown>>(select, [parseEntryId(id)]))[0];
		if (!previous) throw new Error('Der Eintrag wurde nicht gefunden.');
		await execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
		await execute(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value) VALUES ('${resourceType}', $1, 'delete', $2, $3, $4::jsonb)`, [id, author.id, author.username, JSON.stringify(previous)]);
	});
}

export async function restoreRevision(revisionId: number, author: Author): Promise<void> {
	await transaction(async (execute) => {
		const revision = revisionSchema.parse((await execute<ContentRevision>(
			`SELECT id, resource_type AS "resourceType", resource_id AS "resourceId", action,
			 author_id AS "authorId", author_name AS "authorName", previous_value AS "previousValue",
			 next_value AS "nextValue", created_at::text AS "createdAt"
			 FROM content_revisions WHERE id = $1`,
			[revisionId]
		))[0]);
		if (revision.action === 'create' || !revision.previousValue) {
			throw new Error('Diese Revision besitzt keinen früheren Zustand zum Wiederherstellen.');
		}

		if (revision.resourceType === 'oracle') {
			const target = oracleSchema.parse(revision.previousValue);
			const current = (await execute<OracleEntry>('SELECT id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM oracle_entries WHERE id = $1', [target.id]))[0] ?? null;
			const restored = oracleSchema.parse((await execute<OracleEntry>(
				`INSERT INTO oracle_entries (id, aspect, text, image_key, updated_by) VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (id) DO UPDATE SET aspect = EXCLUDED.aspect, text = EXCLUDED.text, image_key = EXCLUDED.image_key, updated_at = now(), updated_by = EXCLUDED.updated_by
				 RETURNING id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
				[target.id, target.aspect, target.text, target.imageKey, author.id]
			))[0]);
			await recordRestore(execute, revision, author, current, restored);
			return;
		}

		if (revision.resourceType === 'fragment') {
			const target = fragmentSchema.parse(revision.previousValue);
			const current = (await execute<FragmentEntry>('SELECT id, title, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM fragment_entries WHERE id = $1', [target.id]))[0] ?? null;
			const restored = fragmentSchema.parse((await execute<FragmentEntry>(
				`INSERT INTO fragment_entries (id, title, text, image_key, updated_by) VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, text = EXCLUDED.text, image_key = EXCLUDED.image_key, updated_at = now(), updated_by = EXCLUDED.updated_by
				 RETURNING id, title, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
				[target.id, target.title, target.text, target.imageKey, author.id]
			))[0]);
			await recordRestore(execute, revision, author, current, restored);
			return;
		}

		const target = profileSchema.parse(revision.previousValue);
		const current = (await execute<ProfileCard>('SELECT id, user_id AS "userId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt" FROM profile_cards WHERE id = $1', [target.id]))[0] ?? null;
		if (target.isDefault) await execute('UPDATE profile_cards SET is_default = false WHERE is_default = true AND id <> $1', [target.id]);
		const restored = profileSchema.parse((await execute<ProfileCard>(
			`INSERT INTO profile_cards (id, user_id, priority, author, title, status, note, footer, color, image_key, is_default, updated_by)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			 ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, priority = EXCLUDED.priority, author = EXCLUDED.author, title = EXCLUDED.title, status = EXCLUDED.status, note = EXCLUDED.note, footer = EXCLUDED.footer, color = EXCLUDED.color, image_key = EXCLUDED.image_key, is_default = EXCLUDED.is_default, updated_at = now(), updated_by = EXCLUDED.updated_by
			 RETURNING id, user_id AS "userId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt"`,
			[target.id, target.userId, target.priority, target.author, target.title, target.status, target.note, target.footer, target.color, target.imageKey, target.isDefault, author.id]
		))[0]);
		await recordRestore(execute, revision, author, current, restored);
	});
}

async function recordRestore(execute: TransactionQuery, revision: ContentRevision, author: Author, previous: unknown, next: unknown): Promise<void> {
	await execute(
		`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value)
		 VALUES ($1, $2, 'restore', $3, $4, $5::jsonb, $6::jsonb)`,
		[revision.resourceType, revision.resourceId, author.id, author.username, JSON.stringify(previous), JSON.stringify(next)]
	);
}