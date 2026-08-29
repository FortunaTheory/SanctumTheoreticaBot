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

export async function loadWhisperState(): Promise<WhisperState> {
  try {
    const contents = await readFile(statePath, "utf8");
    return JSON.parse(contents) as WhisperState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { enabled: false };
  }
}

export async function saveWhisperState(state: WhisperState): Promise<void> {
  const temporaryPath = `${statePath}.tmp`;
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporaryPath, statePath);
}
