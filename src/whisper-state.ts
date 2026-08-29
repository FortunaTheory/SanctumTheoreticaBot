import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { config } from "./config.js";

export type WhisperState = {
  enabled: boolean;
  guildId?: string;
  channelId?: string;
  lastTargetId?: string;
  lastSentAt?: string;
  nextAt?: string;
  usedEntryIndexes?: number[];
};

const statePath = resolve(process.cwd(), config.whisperStatePath);

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Whisper-State-Feld ${field} muss ein Text sein.`);
  }
  return value;
}

function parseState(value: unknown): WhisperState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Whisper-State muss ein Objekt sein.");
  }
  const state = value as Record<string, unknown>;
  if (typeof state.enabled !== "boolean") {
    throw new Error("Whisper-State-Feld enabled muss ein Boolean sein.");
  }
  if (state.usedEntryIndexes !== undefined && (!Array.isArray(state.usedEntryIndexes)
    || state.usedEntryIndexes.some((index) => typeof index !== "number" || !Number.isInteger(index) || index < 0))) {
    throw new Error("Whisper-State-Feld usedEntryIndexes muss eine Liste nichtnegativer Ganzzahlen sein.");
  }
  return {
    enabled: state.enabled,
    guildId: optionalString(state.guildId, "guildId"),
    channelId: optionalString(state.channelId, "channelId"),
    lastTargetId: optionalString(state.lastTargetId, "lastTargetId"),
    lastSentAt: optionalString(state.lastSentAt, "lastSentAt"),
    nextAt: optionalString(state.nextAt, "nextAt"),
    usedEntryIndexes: state.usedEntryIndexes as number[] | undefined
  };
}

export async function loadWhisperState(): Promise<WhisperState> {
  try {
    const contents = await readFile(statePath, "utf8");
    return parseState(JSON.parse(contents));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Whisper-State ist ungültig; starte mit deaktivierten Whispern:", error);
    }
    return { enabled: false };
  }
}

export async function saveWhisperState(state: WhisperState): Promise<void> {
  const temporaryPath = `${statePath}.tmp`;
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporaryPath, statePath);
}
