import { z } from 'zod';
import { query } from './database';

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

export async function createOracle(input: CreateOracleInput, author: { id: string; username: string }): Promise<OracleEntry> {
	const entries = await query<OracleEntry>(
		`INSERT INTO oracle_entries (aspect, text, updated_by)
		 VALUES ($1, $2, $3)
		 RETURNING id, aspect, text, image_key AS "imageKey", updated_at::text AS "updatedAt"`,
		[input.aspect, input.text, author.id]
	);
	const entry = oracleSchema.parse(entries[0]);
	await query(
		`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, next_value)
		 VALUES ('oracle', $1, 'create', $2, $3, $4::jsonb)`,
		[entry.id, author.id, author.username, JSON.stringify(entry)]
	);
	return entry;
}