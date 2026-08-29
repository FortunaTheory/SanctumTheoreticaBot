import { SlashCommandBuilder } from "discord.js";

export const pingCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether Sanctum Theoretica is awake."),
  async execute(interaction: import("discord.js").ChatInputCommandInteraction) {
    await interaction.reply({
      content: `Pong. Latency: ${interaction.client.ws.ping}ms`,
      ephemeral: true
    });
  }
};
