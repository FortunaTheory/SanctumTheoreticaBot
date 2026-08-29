import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AttachmentBuilder, Client, TextChannel } from "discord.js";
import { normalizeDecal } from "./assets.js";
import { config } from "./config.js";
import { queryContent, usesContentDatabase } from "./content-database.js";
import { choose } from "./lore.js";
import { getRuntimeConfig } from "./runtime-config.js";
import { loadWhisperState, saveWhisperState, WhisperState } from "./whisper-state.js";

type WhisperEntry = {
  id: string;
  text?: string;
  image?: string;
};

type WhisperData = {
  messages: readonly WhisperEntry[];
  targets: readonly string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWhisperData(messages: unknown, targets: unknown): WhisperData {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("data/whispers.json muss mindestens einen Whisper enthalten.");
  }
  if (!Array.isArray(targets)) {
    throw new Error("data/whisper-targets.json muss eine Liste von Nutzer-IDs enthalten.");
  }

  const parsedMessages = messages.map((entry, index): WhisperEntry => {
    if (typeof entry === "string" && entry.trim()) return { id: `json-${index}`, text: entry };
    if (!isRecord(entry)) throw new Error(`data/whispers.json[${index}] ist ungültig.`);
    const text = entry.text;
    const image = entry.image;
    if (text !== undefined && text !== null && (typeof text !== "string" || !text.trim())) {
      throw new Error(`data/whispers.json[${index}].text ist ungültig.`);
    }
    if (image !== undefined && image !== null && (typeof image !== "string" || !image.trim())) {
      throw new Error(`data/whispers.json[${index}].image ist ungültig.`);
    }
    if (!text && !image) throw new Error(`data/whispers.json[${index}] enthält weder Text noch Bild.`);
    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : `json-${index}`,
      text: typeof text === "string" ? text : undefined,
      image: typeof image === "string" ? image : undefined
    };
  });
  const parsedTargets = targets
    .map((target) => isRecord(target) ? target.userId : target)
    .filter((target): target is string => typeof target === "string" && /^\d{17,20}$/.test(target));
  if (parsedTargets.length === 0) {
    throw new Error("data/whisper-targets.json enthält keine gültige Discord-Nutzer-ID.");
  }
  return { messages: parsedMessages, targets: parsedTargets };
}

export class WhisperScheduler {
  private state: WhisperState = { enabled: false };
  private timer?: NodeJS.Timeout;
  private data?: WhisperData;
  private operationQueue: Promise<void> = Promise.resolve();

  public constructor(private readonly client: Client) {}

  public async load(): Promise<void> {
    await this.runExclusive(async () => {
      await this.ensureData();
      this.state = await loadWhisperState();
      const runtime = getRuntimeConfig();
      if (this.state.enabled && !this.state.channelId && runtime.whisperChannelId) {
        this.state = { ...this.state, channelId: runtime.whisperChannelId };
        await saveWhisperState(this.state);
      }
      if (this.state.enabled && this.state.channelId) this.schedule();
    });
  }

  public async enable(guildId: string, channelId: string): Promise<WhisperState> {
    return this.runExclusive(async () => {
      await this.ensureData();
      this.clearTimer();
      this.state = {
        ...this.state,
        enabled: true,
        guildId,
        channelId,
        nextAt: new Date(Date.now() + this.randomDelay()).toISOString()
      };
      await saveWhisperState(this.state);
      this.schedule();
      return { ...this.state };
    });
  }

  public async disable(): Promise<WhisperState> {
    return this.runExclusive(async () => {
      this.clearTimer();
      this.state = { ...this.state, enabled: false, nextAt: undefined };
      await saveWhisperState(this.state);
      return { ...this.state };
    });
  }

  public getStatus(): WhisperState {
    return { ...this.state };
  }

  public async applyRuntimeConfig(): Promise<void> {
    await this.runExclusive(async () => {
      const runtime = getRuntimeConfig();
      if (this.state.enabled && !this.state.channelId && runtime.whisperChannelId) {
        this.state = { ...this.state, channelId: runtime.whisperChannelId };
        await saveWhisperState(this.state);
      }
      if (this.state.enabled) this.schedule();
    });
  }

  public async force(): Promise<boolean> {
    return this.runExclusive(async () => {
      await this.ensureData();
      if (!this.state.enabled || !this.state.channelId) return false;
      this.clearTimer();
      await this.sendWhisper();
      return true;
    });
  }

  private schedule(): void {
    this.clearTimer();
    if (!this.state.enabled || !this.state.channelId) return;

    const nextAt = this.state.nextAt ? Date.parse(this.state.nextAt) : Date.now() + this.randomDelay();
    const delay = Math.max(0, nextAt - Date.now());
    this.timer = setTimeout(() => {
      void this.runExclusive(() => this.sendWhisper()).catch((error) => {
        console.error("Whisper konnte nicht geplant gesendet werden:", error);
      });
    }, delay);
  }

  private async sendWhisper(): Promise<void> {
    if (!this.state.enabled || !this.state.channelId) return;

    try {
      const channel = await this.client.channels.fetch(this.state.channelId);
      if (!(channel instanceof TextChannel)) {
        throw new Error("Der konfigurierte Whisper-Kanal ist kein Textkanal.");
      }

      const data = await this.ensureData();
      const targetId = this.chooseTarget(data.targets);
      const { entry } = this.chooseEntry();
      const text = entry.text;
      const imageName = entry.image;
      const image = imageName ? await normalizeDecal("whispers-art", imageName) : undefined;
      const attachment = image && imageName
        ? new AttachmentBuilder(image, { name: `whisper-${imageName.replace("/", "-")}` })
        : undefined;
      if (!text && !attachment) {
        throw new Error("Whisper-Eintrag enthält weder Text noch Bild.");
      }
      await channel.send({
        content: text
          ? `<@${targetId}>\n\n${text}\n\n— *Die Kuratorin*`
          : `<@${targetId}>`,
        allowedMentions: { users: [targetId] },
        files: attachment ? [attachment] : []
      });
      this.state = {
        ...this.state,
        lastTargetId: targetId,
        lastSentAt: new Date().toISOString(),
        nextAt: new Date(Date.now() + this.randomDelay()).toISOString(),
        usedEntryIds: [...(this.state.usedEntryIds ?? []), entry.id],
        usedEntryIndexes: undefined
      };
      await saveWhisperState(this.state);
    } catch (error) {
      console.error("Whisper konnte nicht gesendet werden:", error);
      this.state = {
        ...this.state,
        nextAt: new Date(Date.now() + this.randomDelay()).toISOString()
      };
      await saveWhisperState(this.state);
    }

    this.schedule();
  }

  private async ensureData(): Promise<WhisperData> {
    try {
      if (usesContentDatabase()) {
        const [messages, targets] = await Promise.all([
          queryContent<Record<string, unknown>>('SELECT id, text, image_key AS image FROM whisper_entries ORDER BY created_at'),
          queryContent<Record<string, unknown>>('SELECT user_id AS "userId" FROM whisper_targets ORDER BY created_at')
        ]);
        this.data = parseWhisperData(messages, targets);
        return this.data;
      }
      if (this.data) return this.data;
      const [messages, targets] = await Promise.all([
        readFile(resolve(process.cwd(), "data", "whispers.json"), "utf8"),
        readFile(resolve(process.cwd(), "data", "whisper-targets.json"), "utf8")
      ]);
      this.data = parseWhisperData(JSON.parse(messages), JSON.parse(targets));
      return this.data;
    } catch (error) {
      throw new Error("Whisper-Daten konnten nicht geladen werden.", { cause: error });
    }
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.operationQueue.then(operation, operation);
    this.operationQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private chooseTarget(validTargets: readonly string[]): string {
    const alternatives = validTargets.filter((targetId) => targetId !== this.state.lastTargetId);
    return choose(alternatives.length > 0 ? alternatives : validTargets);
  }

  private chooseEntry(): { entry: WhisperEntry } {
    const whisperMessages = this.data?.messages;
    if (!whisperMessages) throw new Error("Whisper-Daten wurden nicht geladen.");
    const usedIds = new Set(this.state.usedEntryIds ?? []);
    let availableEntries = whisperMessages.filter((entry) => !usedIds.has(entry.id));

    if (availableEntries.length === 0) {
      availableEntries = [...whisperMessages];
      this.state.usedEntryIds = [];
    }

    return { entry: choose(availableEntries) };
  }

  private randomDelay(): number {
    const runtime = getRuntimeConfig();
    const hours = runtime.whisperMinHours
      + Math.random() * (runtime.whisperMaxHours - runtime.whisperMinHours);
    return hours * 60 * 60 * 1000;
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
