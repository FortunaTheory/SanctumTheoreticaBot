import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AttachmentBuilder, Client, TextChannel } from "discord.js";
import { config } from "./config.js";
import { choose } from "./lore.js";
import { loadWhisperState, saveWhisperState, WhisperState } from "./whisper-state.js";

type WhisperEntry = string | {
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
    if (typeof entry === "string" && entry.trim()) return entry;
    if (!isRecord(entry)) throw new Error(`data/whispers.json[${index}] ist ungültig.`);
    const text = entry.text;
    const image = entry.image;
    if (text !== undefined && (typeof text !== "string" || !text.trim())) {
      throw new Error(`data/whispers.json[${index}].text ist ungültig.`);
    }
    if (image !== undefined && (typeof image !== "string" || !image.trim())) {
      throw new Error(`data/whispers.json[${index}].image ist ungültig.`);
    }
    if (!text && !image) throw new Error(`data/whispers.json[${index}] enthält weder Text noch Bild.`);
    return { text, image };
  });
  const parsedTargets = targets.filter((target): target is string => typeof target === "string" && /^\d{17,20}$/.test(target));
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
      if (this.state.enabled && !this.state.channelId && config.whisperChannelId) {
        this.state = { ...this.state, channelId: config.whisperChannelId };
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
      const { entry, index } = this.chooseEntry();
      const text = typeof entry === "string" ? entry : entry.text;
      const imageName = typeof entry === "string" ? undefined : entry.image;
      const imagePath = imageName
        ? resolve(process.cwd(), "decals", "whispers-art", imageName)
        : undefined;
      const attachment = imagePath
        ? new AttachmentBuilder(imagePath, { name: imageName })
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
        usedEntryIndexes: [...(this.state.usedEntryIndexes ?? []), index]
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
    if (this.data) return this.data;
    try {
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

  private chooseEntry(): { entry: WhisperEntry; index: number } {
    const whisperMessages = this.data?.messages;
    if (!whisperMessages) throw new Error("Whisper-Daten wurden nicht geladen.");
    const usedIndexes = new Set(
      (this.state.usedEntryIndexes ?? []).filter((index) => index >= 0 && index < whisperMessages.length)
    );
    let availableIndexes = whisperMessages
      .map((_, index) => index)
      .filter((index) => !usedIndexes.has(index));

    if (availableIndexes.length === 0) {
      usedIndexes.clear();
      availableIndexes = whisperMessages.map((_, index) => index);
      this.state.usedEntryIndexes = [];
    }

    const index = choose(availableIndexes);
    return { entry: whisperMessages[index], index };
  }

  private randomDelay(): number {
    const hours = config.whisperMinHours
      + Math.random() * (config.whisperMaxHours - config.whisperMinHours);
    return hours * 60 * 60 * 1000;
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
