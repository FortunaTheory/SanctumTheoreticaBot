import { z } from 'zod';
import { query, transaction } from './database';

const discordId = z.string().regex(/^\d{17,20}$/, 'Discord-IDs müssen 17 bis 20 Ziffern enthalten.');
const editableConfigSchema = z.object({
	guildId: discordId.nullable(),
	modRoleIds: z.array(discordId),
	dashboardAllowedUserIds: z.array(discordId),
	whisperChannelId: discordId.nullable(),
	whisperMinHours: z.coerce.number().positive(),
	whisperMaxHours: z.coerce.number().positive()
}).refine((value) => value.whisperMinHours <= value.whisperMaxHours, {
	message: 'Das Mindestintervall darf nicht über dem Höchstintervall liegen.',
	path: ['whisperMinHours']
});

const configSchema = editableConfigSchema.extend({
	updatedAt: z.string(),
	updatedBy: z.string()
});

export type BotConfig = z.infer<typeof configSchema>;
type Author = { id: string; username: string };

const splitIds = (value: string) => value.split(',').map((id) => id.trim()).filter(Boolean);
const nullableId = (value: string) => value.trim() || null;

function envConfig(author = 'env-fallback'): BotConfig {
	return configSchema.parse({
		guildId: nullableId(process.env.DISCORD_GUILD_ID ?? ''),
		modRoleIds: splitIds(process.env.DISCORD_MOD_ROLE_IDS ?? ''),
		dashboardAllowedUserIds: splitIds(process.env.DASHBOARD_ALLOWED_USER_IDS ?? ''),
		whisperChannelId: nullableId(process.env.DISCORD_WHISPER_CHANNEL_ID ?? ''),
		whisperMinHours: Number(process.env.WHISPER_MIN_HOURS ?? 24),
		whisperMaxHours: Number(process.env.WHISPER_MAX_HOURS ?? 32),
		updatedAt: new Date(0).toISOString(),
		updatedBy: author
	});
}

export function getOwnerId(): string {
	const ownerId = process.env.OWNER_DISCORD_ID;
	if (!ownerId || !/^\d{17,20}$/.test(ownerId)) throw new Error('OWNER_DISCORD_ID must be a valid Discord user ID.');
	return ownerId;
}

export function isDashboardOwner(userId: string): boolean {
	return userId === getOwnerId();
}

export async function loadBotConfig(): Promise<BotConfig | undefined> {
	const rows = await query<BotConfig>(`SELECT guild_id AS "guildId", mod_role_ids AS "modRoleIds", dashboard_allowed_user_ids AS "dashboardAllowedUserIds", whisper_channel_id AS "whisperChannelId", whisper_min_hours::float AS "whisperMinHours", whisper_max_hours::float AS "whisperMaxHours", updated_at::text AS "updatedAt", updated_by AS "updatedBy" FROM bot_config WHERE singleton = true`);
	return rows[0] ? configSchema.parse(rows[0]) : undefined;
}

export async function ensureBotConfig(): Promise<BotConfig> {
	const existing = await loadBotConfig();
	if (existing) return existing;
	const initial = envConfig();
	const rows = await query<BotConfig>(
		`INSERT INTO bot_config (singleton, guild_id, mod_role_ids, dashboard_allowed_user_ids, whisper_channel_id, whisper_min_hours, whisper_max_hours, updated_by)
		 VALUES (true, $1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (singleton) DO UPDATE SET singleton = EXCLUDED.singleton
		 RETURNING guild_id AS "guildId", mod_role_ids AS "modRoleIds", dashboard_allowed_user_ids AS "dashboardAllowedUserIds", whisper_channel_id AS "whisperChannelId", whisper_min_hours::float AS "whisperMinHours", whisper_max_hours::float AS "whisperMaxHours", updated_at::text AS "updatedAt", updated_by AS "updatedBy"`,
		[initial.guildId, initial.modRoleIds, initial.dashboardAllowedUserIds, initial.whisperChannelId, initial.whisperMinHours, initial.whisperMaxHours, initial.updatedBy]
	);
	return configSchema.parse(rows[0]);
}

export function parseBotConfig(input: unknown): Omit<BotConfig, 'updatedAt' | 'updatedBy'> {
	const values = input as Record<string, string>;
	return editableConfigSchema.parse({
		guildId: nullableId(values.guildId ?? ''),
		modRoleIds: splitIds(values.modRoleIds ?? ''),
		dashboardAllowedUserIds: splitIds(values.dashboardAllowedUserIds ?? ''),
		whisperChannelId: nullableId(values.whisperChannelId ?? ''),
		whisperMinHours: values.whisperMinHours,
		whisperMaxHours: values.whisperMaxHours
	});
}

export async function updateBotConfig(input: Omit<BotConfig, 'updatedAt' | 'updatedBy'>, author: Author): Promise<BotConfig> {
	return transaction(async (execute) => {
		const previous = await execute<BotConfig>(`SELECT guild_id AS "guildId", mod_role_ids AS "modRoleIds", dashboard_allowed_user_ids AS "dashboardAllowedUserIds", whisper_channel_id AS "whisperChannelId", whisper_min_hours::float AS "whisperMinHours", whisper_max_hours::float AS "whisperMaxHours", updated_at::text AS "updatedAt", updated_by AS "updatedBy" FROM bot_config WHERE singleton = true`);
		const rows = await execute<BotConfig>(
			`UPDATE bot_config SET guild_id = $1, mod_role_ids = $2, dashboard_allowed_user_ids = $3, whisper_channel_id = $4, whisper_min_hours = $5, whisper_max_hours = $6, updated_at = now(), updated_by = $7 WHERE singleton = true
			 RETURNING guild_id AS "guildId", mod_role_ids AS "modRoleIds", dashboard_allowed_user_ids AS "dashboardAllowedUserIds", whisper_channel_id AS "whisperChannelId", whisper_min_hours::float AS "whisperMinHours", whisper_max_hours::float AS "whisperMaxHours", updated_at::text AS "updatedAt", updated_by AS "updatedBy"`,
			[input.guildId, input.modRoleIds, input.dashboardAllowedUserIds, input.whisperChannelId, input.whisperMinHours, input.whisperMaxHours, author.id]
		);
		const next = configSchema.parse(rows[0]);
		await execute(`INSERT INTO content_revisions (resource_type, resource_id, action, author_id, author_name, previous_value, next_value) VALUES ('admin_config', '00000000-0000-0000-0000-000000000004', 'update', $1, $2, $3::jsonb, $4::jsonb)`, [author.id, author.username, JSON.stringify(previous[0] ?? null), JSON.stringify(next)]);
		return next;
	});
}