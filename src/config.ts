import "dotenv/config";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function listEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function numberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return parsed;
}

const whisperMinHours = numberEnv("WHISPER_MIN_HOURS", 24);
const whisperMaxHours = numberEnv("WHISPER_MAX_HOURS", 32);
if (whisperMinHours > whisperMaxHours) {
  throw new Error("WHISPER_MIN_HOURS must be less than or equal to WHISPER_MAX_HOURS.");
}

export const config = {
  token: requiredEnv("DISCORD_TOKEN"),
  clientId: requiredEnv("DISCORD_CLIENT_ID"),
  guildId: process.env.DISCORD_GUILD_ID || undefined,
  modRoleIds: listEnv("DISCORD_MOD_ROLE_IDS"),
  whisperMinHours,
  whisperMaxHours,
  whisperChannelId: process.env.DISCORD_WHISPER_CHANNEL_ID || undefined,
  whisperStatePath: process.env.WHISPER_STATE_PATH || "data/whisper-state.json",
  databaseUrl: process.env.DATABASE_URL || undefined
};
