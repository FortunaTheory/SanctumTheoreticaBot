import { z } from 'zod';
import { query, transaction } from './database';

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
	roleId: z.string().nullable(),
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
	roleId: z.string().trim().regex(/^\d{17,20}$/, 'Die Rollen-ID muss eine gültige Discord-ID sein.').optional().or(z.literal('')),
	priority: z.coerce.number().int().min(0, 'Die Priorität darf nicht negativ sein.').max(100, 'Die Priorität darf höchstens 100 sein.'),
	author: z.string().trim().min(3, 'Eine Kartenautorin oder ein Kartenautor ist erforderlich.').max(100),
	title: z.string().trim().min(3, 'Ein Kartentitel ist erforderlich.').max(100),
	status: z.string().trim().min(3, 'Ein Archivstatus ist erforderlich.').max(100),
	note: z.string().trim().min(3, 'Eine Archivnotiz ist erforderlich.').max(500),
	footer: z.string().trim().min(3, 'Ein Footer ist erforderlich.').max(150),
	color: z.string().trim().regex(/^[0-9a-fA-F]{6}$/, 'Die Farbe muss aus sechs Hex-Zeichen bestehen.'),
	isDefault: z.boolean()
});

export type CreateFragmentInput = z.infer<typeof createFragmentSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export function parseCreateFragment(input: unknown): CreateFragmentInput {
	return createFragmentSchema.parse(input);
}

export function parseCreateProfile(input: unknown): CreateProfileInput {
	return createProfileSchema.parse(input);
}

export async function loadCatalog(): Promise<Catalog> {
	const [oracles, fragments, profiles] = await Promise.all([
		query<OracleEntry>('SELECT id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM oracle_entries ORDER BY updated_at DESC'),
		query<FragmentEntry>('SELECT id, title, text, image_key AS "imageKey", updated_at::text AS "updatedAt" FROM fragment_entries ORDER BY updated_at DESC'),
		query<ProfileCard>('SELECT id, role_id AS "roleId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt" FROM profile_cards ORDER BY is_default DESC, priority DESC, updated_at DESC')
	]);

	return {
		oracles: z.array(oracleSchema).parse(oracles),
		fragments: z.array(fragmentSchema).parse(fragments),
		profiles: z.array(profileSchema).parse(profiles)
	};
}

export async function createOracle(input: CreateOracleInput, author: { id: string; username: string }, imageKey?: string): Promise<OracleEntry> {
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

export async function createFragment(input: CreateFragmentInput, author: { id: string; username: string }, imageKey?: string): Promise<FragmentEntry> {
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

export async function createProfileCard(input: CreateProfileInput, author: { id: string; username: string }, imageKey?: string): Promise<ProfileCard> {
	return transaction(async (execute) => {
		if (input.isDefault) await execute('UPDATE profile_cards SET is_default = false WHERE is_default = true');
		const entries = await execute<ProfileCard>(
			`INSERT INTO profile_cards (role_id, priority, author, title, status, note, footer, color, image_key, is_default, updated_by)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			 RETURNING id, role_id AS "roleId", priority, author, title, status, note, footer, color, image_key AS "imageKey", is_default AS "isDefault", updated_at::text AS "updatedAt"`,
			[input.roleId || null, input.priority, input.author, input.title, input.status, input.note, input.footer, input.color, imageKey ?? null, input.isDefault, author.id]
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