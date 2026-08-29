import { AttachmentBuilder, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { choose, fragmentEntries } from "../lore.js";
import { normalizeDecal } from "../assets.js";
import { aspectDesign } from "../design.js";
import { consumeFragmentEasterEgg } from "../easter-eggs.js";

export const fragmentCommand = {
  data: new SlashCommandBuilder()
    .setName("fragment")
    .setDescription("Öffne einen verlorenen Fragment-Eintrag aus dem Archiv."),
  async execute(interaction: import("discord.js").ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const targetUserId = "262371849806020608";
    const easterEgg = consumeFragmentEasterEgg(userId, targetUserId);

    if (easterEgg) {
      const image = await normalizeDecal("", easterEgg.image);
      const attachment = image ? new AttachmentBuilder(image, { name: `fragment-easter-egg.png` }) : undefined;
      const embed = new EmbedBuilder()
        .setColor(aspectDesign.archive.color)
        .setAuthor({
          name: "Archiv der verlorenen Dinge",
          iconURL: interaction.client.user.displayAvatarURL({ extension: "png", size: 128 })
        })
        .setTitle(`${aspectDesign.archive.symbol} Versteckter Eintrag · zwischen Charme und Wahn`)
        .setDescription(`**GEHEIMER EINGANG**\n\n> *${easterEgg.text}*`)
        .setFooter({ text: `${aspectDesign.archive.footer} · nur in dieser Stunde sichtbar` })
        .setTimestamp();
      if (attachment) {
        embed.setImage("attachment://fragment-easter-egg.png");
      }
      await interaction.reply({
        embeds: [embed],
        files: attachment ? [attachment] : [],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

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