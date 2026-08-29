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

const whisperMessages: readonly WhisperEntry[] = JSON.parse(
  await readFile(resolve(process.cwd(), "data", "whispers.json"), "utf8")
);
const whisperTargets: readonly string[] = JSON.parse(
  await readFile(resolve(process.cwd(), "data", "whisper-targets.json"), "utf8")
);

export class WhisperScheduler {
  private state: WhisperState = { enabled: false };
  private timer?: NodeJS.Timeout;

  public constructor(private readonly client: Client) {}

  public async load(): Promise<void> {
    this.state = await loadWhisperState();
    if (this.state.enabled && !this.state.channelId && config.whisperChannelId) {
      this.state = { ...this.state, channelId: config.whisperChannelId };
      await saveWhisperState(this.state);
    }
    if (this.state.enabled && this.state.channelId) {
      this.schedule();
    }
  }

  public async enable(guildId: string, channelId: string): Promise<WhisperState> {
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
    return this.state;
  }

  public async disable(): Promise<WhisperState> {
    this.clearTimer();
    this.state = { ...this.state, enabled: false, nextAt: undefined };
    await saveWhisperState(this.state);
    return this.state;
  }

  public getStatus(): WhisperState {
    return { ...this.state };
  }

  public async force(): Promise<boolean> {
    if (!this.state.enabled || !this.state.channelId) return false;
    this.clearTimer();
    await this.sendWhisper();
    return true;
  }

  private schedule(): void {
    this.clearTimer();
    if (!this.state.enabled || !this.state.channelId) return;

    const nextAt = this.state.nextAt ? Date.parse(this.state.nextAt) : Date.now() + this.randomDelay();
    const delay = Math.max(0, nextAt - Date.now());
    this.timer = setTimeout(() => void this.sendWhisper(), delay);
  }

  private async sendWhisper(): Promise<void> {
    if (!this.state.enabled || !this.state.channelId) return;

    try {
      const channel = await this.client.channels.fetch(this.state.channelId);
      if (!(channel instanceof TextChannel)) {
        throw new Error("Der konfigurierte Whisper-Kanal ist kein Textkanal.");
      }

      const targetId = this.chooseTarget();
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

  private chooseTarget(): string {
    const validTargets = whisperTargets.filter((targetId) => /^\d{17,20}$/.test(targetId));
    if (validTargets.length === 0) {
      throw new Error("Keine gültige Zielperson in data/whisper-targets.json konfiguriert.");
    }
    const alternatives = validTargets.filter((targetId) => targetId !== this.state.lastTargetId);
    return choose(alternatives.length > 0 ? alternatives : validTargets);
  }

  private chooseEntry(): { entry: WhisperEntry; index: number } {
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
