import { AttachmentBuilder, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { normalizeDecal } from "../assets.js";
import { profileDesign } from "../design.js";
import { getProfileCard } from "../lore.js";
import { isAuthorizedMember } from "../permissions.js";
import { registerProfileLookup } from "../easter-eggs.js";

export const profileCommand = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Öffne die Archivakte eines Mitgliedes.")
    .addUserOption((option) => option
      .setName("member")
      .setDescription("Das Mitglied, dessen Akte geöffnet werden soll.")
      .setRequired(true)),
  async execute(interaction: import("discord.js").ChatInputCommandInteraction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "Archivakten können nur innerhalb des Serverarchivs geöffnet werden.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = interaction.options.getUser("member", true);
    let member;
    try {
      member = await interaction.guild.members.fetch(user.id);
    } catch (error) {
      console.error(`Profil für ${user.id} konnte nicht geladen werden:`, error);
      await interaction.editReply({
        content: "Diese Akte konnte nicht aus dem Serverarchiv geladen werden. Das Mitglied ist möglicherweise nicht mehr anwesend."
      });
      return;
    }

    if (!isAuthorizedMember(member)) {
      await interaction.editReply({
        content: "Dieser Eintrag ist nicht für das Schattenarchiv freigegeben.",
      });
      return;
    }

    registerProfileLookup(interaction.user.id, member.id);

    const roleNames = member.roles.cache
      .filter((role) => role.name !== "@everyone")
      .map((role) => role.name)
      .slice(0, 5);
    const card = await getProfileCard(member.id);
    const image = card.image ? await normalizeDecal("profile-pictures", card.image) : undefined;
    const attachment = image && card.image
      ? new AttachmentBuilder(image, { name: `profile-${card.image}` })
      : undefined;
    const archivalAge = member.joinedTimestamp
      ? Math.max(0, new Date().getFullYear() - new Date(member.joinedTimestamp).getFullYear())
      : undefined;
    const fileNumber = `${member.id.slice(-4)}-${new Date().getFullYear()}`;
    const joinedAt = member.joinedTimestamp
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`
      : "Nicht verzeichnet";
    const embed = new EmbedBuilder()
      .setColor(Number.parseInt(card.color, 16) || profileDesign.fallbackColor)
      .setAuthor({
        name: card.author,
        iconURL: interaction.client.user.displayAvatarURL({ extension: "png", size: 128 })
      })
      .setTitle(`${profileDesign.symbol} INTERNE AKTE · ${card.title}`)
      .setDescription(`**${member.displayName}**\n\n*${card.note}*`)
      .setThumbnail(member.displayAvatarURL())
      .addFields(
        { name: "Erstmals verzeichnet", value: joinedAt, inline: true },
        { name: "Archivstatus", value: card.status, inline: true },
        { name: "Zugeordnete Siegel", value: roleNames.length > 0 ? roleNames.join(" · ") : "Keine sichtbaren Siegel" },
        { name: "Archivalter", value: archivalAge === undefined ? "Nicht verzeichnet" : `${archivalAge} Jahr${archivalAge === 1 ? "" : "e"}`, inline: true },
        { name: "Aktennummer", value: `\`${fileNumber}\``, inline: true }
      )
      .setFooter({ text: card.footer || profileDesign.footer })
      .setTimestamp();
    if (attachment && card.image) {
      embed.setImage(`attachment://profile-${card.image}`);
    }
    await interaction.editReply({
      embeds: [embed],
      files: attachment ? [attachment] : []
    });
  }
};