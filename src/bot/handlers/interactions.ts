import {
  type Interaction,
  type VoiceChannel,
  type GuildMember,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import {
  getTempChannel,
  getGuildConfig,
  getTempChannelByOwner,
  createTempChannel,
  deleteTempChannel,
} from "../store.js";
import { buildControlPanel, updateControlPanel } from "../panel.js";
import { logger } from "../../lib/logger.js";

export async function handleInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    const { commands } = await import("../commands/index.js");
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err }, "Command error");
      const msg = { content: "❌ An error occurred.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "help_menu") {
    const page = interaction.values[0] ?? "home";
    const { buildHelpEmbed } = await import("../help.js");
    const { embed, row } = buildHelpEmbed(page);
    await interaction.update({ embeds: [embed], components: [row] });
    return;
  }

  if (!interaction.isButton()) return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  const member = interaction.member as GuildMember;
  const tempData = getTempChannelByOwner(guildId, member.id);

  if (!tempData) {
    await interaction.reply({
      content: "❌ You don't own a temp voice channel right now.",
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild!;
  const channel = guild.channels.cache.get(tempData.channelId) as
    | VoiceChannel
    | undefined;

  if (!channel) {
    await interaction.reply({
      content: "❌ Your voice channel no longer exists.",
      ephemeral: true,
    });
    return;
  }

  const id = interaction.customId;

  if (id === "vc_rename") {
    await interaction.reply({
      content: "📝 What would you like to name your channel? (Type your reply — you have 30 seconds)",
      ephemeral: true,
    });

    try {
      const collected = await interaction.channel!.awaitMessages({
        filter: (m) => m.author.id === member.id,
        max: 1,
        time: 30_000,
        errors: ["time"],
      });
      const newName = collected.first()?.content?.slice(0, 100);
      if (newName) {
        await channel.setName(newName);
        try { await collected.first()?.delete(); } catch {}
        await interaction.followUp({ content: `✅ Channel renamed to **${newName}**`, ephemeral: true });
        await updateControlPanel(channel);
      }
    } catch {
      await interaction.followUp({ content: "⏰ No response received. Name unchanged.", ephemeral: true });
    }
    return;
  }

  if (id === "vc_lock") {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      Connect: false,
    });
    await interaction.reply({ content: "🔒 Channel locked.", ephemeral: true });
    await updateControlPanel(channel);
    return;
  }

  if (id === "vc_unlock") {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      Connect: true,
    });
    await interaction.reply({ content: "🔓 Channel unlocked.", ephemeral: true });
    await updateControlPanel(channel);
    return;
  }

  if (id === "vc_limit") {
    await interaction.reply({
      content: "🔢 Enter a user limit (1–99), or 0 for unlimited. You have 30 seconds.",
      ephemeral: true,
    });

    try {
      const collected = await interaction.channel!.awaitMessages({
        filter: (m) => m.author.id === member.id && !isNaN(Number(m.content)),
        max: 1,
        time: 30_000,
        errors: ["time"],
      });
      const limit = Math.min(99, Math.max(0, Number(collected.first()?.content ?? 0)));
      await channel.setUserLimit(limit);
      try { await collected.first()?.delete(); } catch {}
      await interaction.followUp({
        content: `✅ User limit set to **${limit === 0 ? "Unlimited" : limit}**`,
        ephemeral: true,
      });
      await updateControlPanel(channel);
    } catch {
      await interaction.followUp({ content: "⏰ No response. Limit unchanged.", ephemeral: true });
    }
    return;
  }

  if (id === "vc_kick") {
    const members = [...channel.members.values()].filter(
      (m) => !m.user.bot && m.id !== member.id,
    );
    if (members.length === 0) {
      await interaction.reply({ content: "🤷 No other members to kick.", ephemeral: true });
      return;
    }

    const list = members.map((m, i) => `\`${i + 1}\` — ${m.displayName}`).join("\n");
    await interaction.reply({
      content: `👢 Reply with the number of the member to kick:\n${list}\n\n_(30 seconds)_`,
      ephemeral: true,
    });

    try {
      const collected = await interaction.channel!.awaitMessages({
        filter: (m) =>
          m.author.id === member.id &&
          !isNaN(Number(m.content)) &&
          Number(m.content) >= 1 &&
          Number(m.content) <= members.length,
        max: 1,
        time: 30_000,
        errors: ["time"],
      });
      const idx = Number(collected.first()?.content) - 1;
      const target = members[idx];
      if (target) {
        await target.voice.disconnect(`Kicked by channel owner ${member.displayName}`);
        try { await collected.first()?.delete(); } catch {}
        await interaction.followUp({ content: `✅ **${target.displayName}** was kicked.`, ephemeral: true });
        await updateControlPanel(channel);
      }
    } catch {
      await interaction.followUp({ content: "⏰ No response. No one was kicked.", ephemeral: true });
    }
    return;
  }

  if (id === "vc_ban") {
    const members = [...channel.members.values()].filter(
      (m) => !m.user.bot && m.id !== member.id,
    );
    if (members.length === 0) {
      await interaction.reply({ content: "🤷 No other members to ban from VC.", ephemeral: true });
      return;
    }

    const list = members.map((m, i) => `\`${i + 1}\` — ${m.displayName}`).join("\n");
    await interaction.reply({
      content: `🚫 Reply with the number of the member to ban from your VC:\n${list}\n\n_(30 seconds)_`,
      ephemeral: true,
    });

    try {
      const collected = await interaction.channel!.awaitMessages({
        filter: (m) =>
          m.author.id === member.id &&
          !isNaN(Number(m.content)) &&
          Number(m.content) >= 1 &&
          Number(m.content) <= members.length,
        max: 1,
        time: 30_000,
        errors: ["time"],
      });
      const idx = Number(collected.first()?.content) - 1;
      const target = members[idx];
      if (target) {
        await channel.permissionOverwrites.edit(target.id, { Connect: false });
        await target.voice.disconnect(`Banned from VC by ${member.displayName}`);
        try { await collected.first()?.delete(); } catch {}
        await interaction.followUp({ content: `✅ **${target.displayName}** is banned from your channel.`, ephemeral: true });
        await updateControlPanel(channel);
      }
    } catch {
      await interaction.followUp({ content: "⏰ No response. No one was banned.", ephemeral: true });
    }
    return;
  }

  if (id === "vc_transfer") {
    const members = [...channel.members.values()].filter(
      (m) => !m.user.bot && m.id !== member.id,
    );
    if (members.length === 0) {
      await interaction.reply({ content: "🤷 No other members to transfer ownership to.", ephemeral: true });
      return;
    }

    const list = members.map((m, i) => `\`${i + 1}\` — ${m.displayName}`).join("\n");
    await interaction.reply({
      content: `👑 Transfer ownership to:\n${list}\n\n_(30 seconds)_`,
      ephemeral: true,
    });

    try {
      const collected = await interaction.channel!.awaitMessages({
        filter: (m) =>
          m.author.id === member.id &&
          !isNaN(Number(m.content)) &&
          Number(m.content) >= 1 &&
          Number(m.content) <= members.length,
        max: 1,
        time: 30_000,
        errors: ["time"],
      });
      const idx = Number(collected.first()?.content) - 1;
      const newOwner = members[idx];
      if (newOwner) {
        const data = getTempChannel(channel.id);
        if (data) data.ownerId = newOwner.id;
        await channel.permissionOverwrites.edit(newOwner.id, {
          ManageChannels: true,
          MoveMembers: true,
          Connect: true,
          Speak: true,
        });
        await channel.permissionOverwrites.edit(member.id, {
          ManageChannels: null,
          MoveMembers: null,
        });
        try { await collected.first()?.delete(); } catch {}
        await interaction.followUp({
          content: `✅ Ownership transferred to **${newOwner.displayName}**.`,
          ephemeral: true,
        });
        await updateControlPanel(channel);
      }
    } catch {
      await interaction.followUp({ content: "⏰ No response. Ownership unchanged.", ephemeral: true });
    }
    return;
  }

  if (id === "vc_info") {
    await updateControlPanel(channel);
    await interaction.reply({ content: "🔄 Panel refreshed.", ephemeral: true });
    return;
  }
}
