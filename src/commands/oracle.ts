import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProphecy, OracleAspect } from "../lore.js";
import { normalizeDecal } from "../assets.js";
import { aspectDesign } from "../design.js";

const aspectLabels: Record<OracleAspect, string> = Object.fromEntries(
  Object.entries(aspectDesign).map(([aspect, design]) => [aspect, design.label])
) as Record<OracleAspect, string>;

const aspectDescriptions: Record<OracleAspect, string> = {
  archive: "Verlorenes Wissen regt sich zwischen den Seiten.",
  lucid: "Alles fügt sich zu einem Muster. Vor allem das, was sich dagegen wehrt.",
  enigma: "Die Frage ist klar. Die Wirklichkeit, die sie beantwortet, nicht."
};

export const oracleCommand = {
  data: new SlashCommandBuilder()
    .setName("oracle")
    .setDescription("Bitte die Kuratorin um eine verschleierte Prophezeiung.")
    .addStringOption((option) => option
      .setName("aspect")
      .setDescription("Durch welches Aspekt soll das Orakel sprechen?")
      .addChoices(
        { name: "der ewige Nexus", value: "random" },
        { name: "Hallen des Archivs", value: "archive" },
        { name: "der luzide Verfall", value: "lucid" },
        { name: "Omegaprotokoll: ENIGMA", value: "enigma" }
      )),
  async execute(interaction: import("discord.js").ChatInputCommandInteraction) {
    const requestedAspect = interaction.options.getString("aspect") as OracleAspect | "random" | null;
    const prophecy = await getProphecy(requestedAspect && requestedAspect !== "random" ? requestedAspect : undefined);
    const design = aspectDesign[prophecy.aspect];
    const image = prophecy.image ? await normalizeDecal("", prophecy.image) : undefined;
    const attachment = image && prophecy.image
      ? new AttachmentBuilder(image, { name: `oracle-${prophecy.image}` })
      : undefined;
    const embed = new EmbedBuilder()
      .setColor(design.color)
      .setAuthor({
        name: "Die Kuratorin · Sanctum Theoretica",
        iconURL: interaction.client.user.displayAvatarURL({ extension: "png", size: 128 })
      })
      .setTitle(`${design.symbol} ORAKELRESONANZ · ${aspectLabels[prophecy.aspect]}`)
      .setDescription(`**ARCHIVSIGNAL · ${aspectLabels[prophecy.aspect].toUpperCase()}**\n\n> *${prophecy.text}*`)
      .addFields({
        name: "Resonanz",
        value: `*${aspectDescriptions[prophecy.aspect]}*`
      })
      .setFooter({ text: `${design.footer} · Nicht jede Erkenntnis möchte gefunden werden.` })
      .setTimestamp();
    if (attachment && prophecy.image) {
      embed.setImage(`attachment://oracle-${prophecy.image}`);
    }
    await interaction.reply({
      embeds: [embed],
      files: attachment ? [attachment] : []
    });
  }
};