import { MessageFlags, SlashCommandBuilder } from "discord.js";

export const pingCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Prüft ob die Kuratorin in den Hallen ist."),
  async execute(interaction: import("discord.js").ChatInputCommandInteraction) {
    await interaction.reply({
      content: `Und schon wieder liegen ${interaction.client.ws.ping} Phoenixfeder verstreut auf dem Boden!`,
      flags: MessageFlags.Ephemeral
    });
  }
};