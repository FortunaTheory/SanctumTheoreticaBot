import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { isTeamMember } from "../permissions.js";

export function createWhisperCommand() {
  return {
    data: new SlashCommandBuilder()
      .setName("whisper")
      .setDescription("Höre auf die Stimme hinter dem Schleier."),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.reply({
        content: isTeamMember(interaction)
          ? "Die Stimme ist empfangsbereit. Die Steuerung liegt unter `/whisper-admin`."
          : "Die Stimme der Kuratorin bleibt hinter dem Schleier. Nur die Wächter dürfen sie lenken.",
        flags: MessageFlags.Ephemeral
      });
    }
  };
}
