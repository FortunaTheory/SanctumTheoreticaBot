import { config } from "./config.js";
import { queryContent, usesContentDatabase } from "./content-database.js";

export type RuntimeConfig = {
  guildId?: string;
  modRoleIds: string[];
  whisperChannelId?: string;
  whisperMinHours: number;
  whisperMaxHours: number;
};

let current: RuntimeConfig = {
  guildId: config.guildId,
  modRoleIds: [...config.modRoleIds],
  whisperChannelId: config.whisperChannelId,
  whisperMinHours: config.whisperMinHours,
  whisperMaxHours: config.whisperMaxHours
};

export function getRuntimeConfig(): RuntimeConfig {
  return current;
}

export async function refreshRuntimeConfig(): Promise<boolean> {
  if (!usesContentDatabase()) return false;
  const rows = await queryContent<Record<string, unknown>>(
    `SELECT guild_id AS "guildId", mod_role_ids AS "modRoleIds", whisper_channel_id AS "whisperChannelId", whisper_min_hours::float AS "whisperMinHours", whisper_max_hours::float AS "whisperMaxHours" FROM bot_config WHERE singleton = true`
  );
  const value = rows[0];
  if (!value || !Array.isArray(value.modRoleIds) || typeof value.whisperMinHours !== "number" || typeof value.whisperMaxHours !== "number" || value.whisperMinHours > value.whisperMaxHours) return false;
  const next: RuntimeConfig = {
    guildId: typeof value.guildId === "string" ? value.guildId : undefined,
    modRoleIds: value.modRoleIds.filter((id): id is string => typeof id === "string" && /^\d{17,20}$/.test(id)),
    whisperChannelId: typeof value.whisperChannelId === "string" ? value.whisperChannelId : undefined,
    whisperMinHours: value.whisperMinHours,
    whisperMaxHours: value.whisperMaxHours
  };
  const changed = JSON.stringify(next) !== JSON.stringify(current);
  current = next;
  return changed;
}