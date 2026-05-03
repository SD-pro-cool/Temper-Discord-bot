import {
  ChannelType,
  PermissionFlagsBits,
  type VoiceState,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import {
  getGuildConfig,
  createTempChannel,
  getTempChannel,
  getTempChannelByOwner,
  deleteTempChannel,
} from "../store.js";
import { buildControlPanel } from "../panel.js";
import { logger } from "../../lib/logger.js";

export async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
) {
  const guild = newState.guild || oldState.guild;
  const config = getGuildConfig(guild.id);

  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  logger.info(
    {
      guildId: guild.id,
      memberId: member.id,
      oldChannelId: oldState.channelId,
      newChannelId: newState.channelId,
      hasConfig: !!config,
      joinChannelId: config?.joinChannelId,
    },
    "voiceStateUpdate",
  );

  if (!config) return;

  if (newState.channelId === config.joinChannelId) {
    await handleJoin(newState, config);
  }

  if (
    oldState.channelId &&
    oldState.channelId !== config.joinChannelId &&
    oldState.channelId !== newState.channelId
  ) {
    await handleLeave(oldState, config);
  }
}

async function handleJoin(
  state: VoiceState,
  config: ReturnType<typeof getGuildConfig>,
) {
  if (!config) return;
  const member = state.member!;
  const guild = state.guild;

  const existing = getTempChannelByOwner(guild.id, member.id);
  if (existing) {
    const existingChannel = guild.channels.cache.get(existing.channelId) as
      | VoiceChannel
      | undefined;
    if (existingChannel) {
      await member.voice.setChannel(existingChannel);
      logger.info(
        { channelId: existing.channelId, ownerId: member.id },
        "Moved user back to their existing temp channel",
      );
      return;
    } else {
      deleteTempChannel(existing.channelId);
    }
  }

  try {
    const channel = await guild.channels.create({
      name: `${member.displayName}'s Channel`,
      type: ChannelType.GuildVoice,
      parent: config.controlCategoryId,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        },
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.Connect],
        },
      ],
    }) as VoiceChannel;

    await member.voice.setChannel(channel);

    createTempChannel(channel.id, {
      channelId: channel.id,
      ownerId: member.id,
      guildId: guild.id,
    });

    const controlChannel = guild.channels.cache.get(
      config.controlChannelId,
    ) as TextChannel | undefined;

    if (controlChannel) {
      const panel = buildControlPanel(channel, member);
      const msg = await controlChannel.send({
        content: `<@${member.id}> your channel is ready!`,
        ...panel,
      });

      const data = getTempChannel(channel.id);
      if (data) {
        data.controlPanelMessageId = msg.id;
      }
    }

    logger.info(
      { channelId: channel.id, ownerId: member.id },
      "Temp channel created",
    );
  } catch (err) {
    logger.error({ err }, "Failed to create temp channel");
  }
}

async function handleLeave(
  state: VoiceState,
  config: ReturnType<typeof getGuildConfig>,
) {
  if (!config) return;
  const channelId = state.channelId!;
  const data = getTempChannel(channelId);
  if (!data) return;

  const channel = state.guild.channels.cache.get(channelId) as
    | VoiceChannel
    | undefined;
  if (!channel) return;

  const humanMembers = [...channel.members.values()].filter((m) => !m.user.bot);
  if (humanMembers.length > 0) {
    const { updateControlPanel } = await import("../panel.js");
    await updateControlPanel(channel);
    return;
  }

  try {
    if (data.controlPanelMessageId) {
      const controlChannel = state.guild.channels.cache.get(
        config.controlChannelId,
      ) as TextChannel | undefined;
      if (controlChannel) {
        try {
          const msg = await controlChannel.messages.fetch(
            data.controlPanelMessageId,
          );
          await msg.delete();
        } catch {}
      }
    }

    await channel.delete();
    deleteTempChannel(channelId);
    logger.info({ channelId }, "Temp channel deleted");
  } catch (err) {
    logger.error({ err }, "Failed to delete temp channel");
  }
}
