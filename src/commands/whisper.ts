import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { WhisperScheduler } from "../whisper-scheduler.js";
import { isAuthorizedMember } from "../permissions.js";

function formatDate(value?: string): string {
  return value ? `<t:${Math.floor(Date.parse(value) / 1000)}:F>` : "Nicht geplant";
}

export function createWhisperCommand(scheduler: WhisperScheduler) {
  return {
    data: new SlashCommandBuilder()
      .setName("whisper")
      .setDescription("Steuere die verborgenen Nachrichten der Kuratorin.")
      .addSubcommand((subcommand) => subcommand
        .setName("enable")
        .setDescription("Aktiviere die Whisper im aktuellen Kanal."))
      .addSubcommand((subcommand) => subcommand
        .setName("disable")
        .setDescription("Deaktiviere die Whisper dauerhaft."))
      .addSubcommand((subcommand) => subcommand
        .setName("status")
        .setDescription("Zeige den aktuellen Whisper-Status."))
      .addSubcommand((subcommand) => subcommand
        .setName("force")
        .setDescription("Löse den nächsten Whisper sofort aus.")),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.inGuild() || !interaction.member) {
        await interaction.reply({
          content: "Diese Stimme bleibt jenseits des Rufs. Nur innerhalb eines Servers ist sie erreichbar.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const isAuthorized = isAuthorizedMember(interaction.member);
      const subcommand = interaction.options.getSubcommand(false);

      if (!isAuthorized) {
        await interaction.reply({
          content: "Nur die Wächter dürfen die Stimme der Kuratorin rufen.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (!subcommand) {
        const state = scheduler.getStatus();
        await interaction.reply({
          content: [
            `Status: ${state.enabled ? "aktiv" : "inaktiv"}`,
            `Kanal: ${state.channelId ? `<#${state.channelId}>` : "nicht festgelegt"}`,
            `Nächste Nachricht: ${formatDate(state.nextAt)}`,
            `Letzte Nachricht: ${formatDate(state.lastSentAt)}`
          ].join("\n"),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (subcommand === "enable") {
        if (!interaction.channelId || !interaction.guildId) {
          await interaction.reply({ content: "Whisper können nur in einem Server-Textkanal aktiviert werden.", flags: MessageFlags.Ephemeral });
          return;
        }
        const state = await scheduler.enable(interaction.guildId, interaction.channelId);
        await interaction.reply({
          content: `Whisper aktiviert. Die nächste Stimme meldet sich voraussichtlich ${formatDate(state.nextAt)}.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (subcommand === "disable") {
        await scheduler.disable();
        await interaction.reply({ content: "Whisper deaktiviert. Das Archiv schweigt.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === "force") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const forced = await scheduler.force();
        await interaction.editReply({
          content: forced
            ? "Der nächste Whisper wurde aus dem Schatten gerufen."
            : "Whisper sind derzeit nicht aktiviert. Der Wahnsinn ruht vorerst."
        });
        return;
      }

      const state = scheduler.getStatus();
      await interaction.reply({
        content: [
          `Status: ${state.enabled ? "aktiv" : "inaktiv"}`,
          `Kanal: ${state.channelId ? `<#${state.channelId}>` : "nicht festgelegt"}`,
          `Nächste Nachricht: ${formatDate(state.nextAt)}`,
          `Letzte Nachricht: ${formatDate(state.lastSentAt)}`
        ].join("\n"),
        flags: MessageFlags.Ephemeral
      });
    }
  };
}
