import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { choose, fragmentEntries } from "../lore.js";
import { normalizeDecal } from "../assets.js";
import { aspectDesign } from "../design.js";

export const fragmentCommand = {
  data: new SlashCommandBuilder()
    .setName("fragment")
    .setDescription("Öffne einen verlorenen Fragment-Eintrag aus dem Archiv."),
  async execute(interaction: import("discord.js").ChatInputCommandInteraction) {
    const entry = choose(fragmentEntries);
    const image = entry.image ? await normalizeDecal("", entry.image) : undefined;
    const attachment = image && entry.image
      ? new AttachmentBuilder(image, { name: `fragment-${entry.image}` })
      : undefined;
    const embed = new EmbedBuilder()
      .setColor(aspectDesign.archive.color)
      .setAuthor({
        name: "Archiv der verlorenen Dinge",
        iconURL: interaction.client.user.displayAvatarURL({ extension: "png", size: 128 })
      })
      .setTitle(`${aspectDesign.archive.symbol} ARCHIV-FRAGMENT · ${entry.title}`)
      .setDescription(`**ARCHIV-FRAGMENT**\n\n> *${entry.text}*`)
      .setFooter({ text: `${aspectDesign.archive.footer} · Katalogstatus: absichtlich unvollständig` })
      .setTimestamp();
    if (attachment && entry.image) {
      embed.setImage(`attachment://fragment-${entry.image}`);
    }
    await interaction.reply({
      embeds: [embed],
      files: attachment ? [attachment] : []
    });
  }
};