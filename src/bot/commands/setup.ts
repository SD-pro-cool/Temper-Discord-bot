import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  type ChatInputCommandInteraction,
  type Guild,
  type TextChannel,
  EmbedBuilder,
} from "discord.js";
import { setGuildConfig } from "../store.js";
import { buildHelpMessage } from "../help.js";
import { logger } from "../../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Set up the Temp Voice system in this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guild: Guild = interaction.guild;

  try {
    const category = await guild.channels.create({
      name: "🎙️ Temp Voice",
      type: ChannelType.GuildCategory,
    });

    const joinChannel = await guild.channels.create({
      name: "➕ Join to Create",
      type: ChannelType.GuildVoice,
      parent: category.id,
    });

    const controlChannel = await guild.channels.create({
      name: "🎛️ vc-controls",
      type: ChannelType.GuildText,
      parent: category.id,
      topic: "Use this channel to manage your temporary voice channel.",
    });

    const helpChannel = await guild.channels.create({
      name: "📖・help",
      type: ChannelType.GuildText,
      parent: category.id,
      topic: "Browse all bot commands here.",
    }) as TextChannel;

    setGuildConfig(guild.id, {
      joinChannelId: joinChannel.id,
      controlCategoryId: category.id,
      controlChannelId: controlChannel.id,
    });

    await helpChannel.send(buildHelpMessage());

    const embed = new EmbedBuilder()
      .setTitle("✅ Temp Voice Setup Complete!")
      .setColor(0x57f287)
      .setDescription(
        "The temporary voice channel system is now active in this server.",
      )
      .addFields(
        {
          name: "📣 Join to Create",
          value: `Join <#${joinChannel.id}> to get your own voice channel!`,
        },
        {
          name: "🎛️ Controls",
          value: `Manage your channel in <#${controlChannel.id}>`,
        },
        {
          name: "📖 Help",
          value: `Browse all commands in <#${helpChannel.id}>`,
        },
        {
          name: "ℹ️ How it works",
          value:
            "1. Join the **➕ Join to Create** channel\n2. A private VC is created for you\n3. Use the control panel to rename, lock, kick members, and more\n4. The channel is deleted automatically when everyone leaves",
        },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info(
      { guildId: guild.id, joinChannelId: joinChannel.id },
      "Setup complete",
    );
  } catch (err) {
    logger.error({ err }, "Setup command failed");
    await interaction.editReply({
      content: "❌ Setup failed. Make sure the bot has **Manage Channels** permission.",
    });
  }
}
