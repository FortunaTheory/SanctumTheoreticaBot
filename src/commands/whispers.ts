import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { WhisperScheduler } from "../whisper-scheduler.js";

export function createWhispersCommand(scheduler: WhisperScheduler) {
  return {
    data: new SlashCommandBuilder()
      .setName("whispers")
      .setDescription("Löse eine Nachricht der Kuratorin aus.")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand((subcommand) => subcommand
        .setName("force")
        .setDescription("Sende den nächsten Whisper sofort.")),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "Nur die Administration darf Whisper erzwingen.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const forced = await scheduler.force();
      await interaction.editReply({
        content: forced
          ? "Der nächste Whisper wurde aus dem Schatten gerufen."
          : "Whisper sind derzeit nicht aktiviert. Das Archiv bleibt still."
      });
    }
  };
}