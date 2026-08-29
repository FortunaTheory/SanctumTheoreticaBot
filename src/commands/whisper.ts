import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { WhisperScheduler } from "../whisper-scheduler.js";

function formatDate(value?: string): string {
  return value ? `<t:${Math.floor(Date.parse(value) / 1000)}:F>` : "Nicht geplant";
}

export function createWhisperCommand(scheduler: WhisperScheduler) {
  return {
    data: new SlashCommandBuilder()
      .setName("whisper")
      .setDescription("Steuere die verborgenen Nachrichten der Kuratorin.")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand((subcommand) => subcommand
        .setName("enable")
        .setDescription("Aktiviere die Whisper im aktuellen Kanal."))
      .addSubcommand((subcommand) => subcommand
        .setName("disable")
        .setDescription("Deaktiviere die Whisper dauerhaft."))
      .addSubcommand((subcommand) => subcommand
        .setName("status")
        .setDescription("Zeige den aktuellen Whisper-Status.")),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "Nur die Administration darf den Whisper aktivieren oder verändern.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const subcommand = interaction.options.getSubcommand();
      if (subcommand === "enable") {
        if (!interaction.channelId || !interaction.guildId) {
          await interaction.reply({ content: "Whisper können nur in einer Server-Textkanal aktiviert werden.", flags: MessageFlags.Ephemeral });
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
