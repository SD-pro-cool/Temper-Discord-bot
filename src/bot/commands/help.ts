import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { buildHelpEmbed } from "../help.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Browse all bot commands with a dropdown menu");

export async function execute(interaction: ChatInputCommandInteraction) {
  const { embed, row } = buildHelpEmbed("home");
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
}
