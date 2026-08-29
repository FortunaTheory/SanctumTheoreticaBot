import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { isTeamMember } from "../permissions.js";

export const curatorCommand = {
  data: new SlashCommandBuilder()
    .setName("curator")
    .setDescription("...und da irrte sie abermals in der Dunkelheit und bettelte..."),
  async execute(interaction: import("discord.js").ChatInputCommandInteraction) {
    const isAuthorized = isTeamMember(interaction);

    const content = isAuthorized
      ? [
          "Die Kuratorin hält den Schleier offen.",
          "",
          "**Das Archiv ist wach.**",
          "Der alte Ritus bleibt unter Kontrolle.",
          "**Zugriff:** nur die Wächter und Hüter des Archivs",
          "**Stille:** noch unter Beobachtung"
        ].join("\n")
      : [
          "Die Kuratorin beobachtet aus dem Schatten.",
          "",
          "**Der Schleier bleibt geschlossen.**",
          "Das Archiv ist wach, aber nicht für alle Ohren bestimmt.",
          "Nur das Team darf die tieferen Stimmen rufen."
        ].join("\n");

    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral
    });
  }
};
