import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { WhisperScheduler } from "../whisper-scheduler.js";
import { isAuthorizedMember } from "../permissions.js";

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
      if (!interaction.inGuild() || !interaction.member || !isAuthorizedMember(interaction.member)) {
        await interaction.reply({
          content: "Nur das Archiv-Team darf die Kuratorin in die Stimme rufen.",
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