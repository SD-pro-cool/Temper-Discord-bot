import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type VoiceChannel,
  type TextChannel,
  type GuildMember,
} from "discord.js";
import { getTempChannel } from "./store.js";

function getBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  const domain = domains?.split(",")[0]?.trim();
  if (domain) return `https://${domain}`;
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain}`;
  return "";
}

export function buildControlPanel(channel: VoiceChannel, owner: GuildMember) {
  const members =
    [...channel.members.values()]
      .filter((m) => !m.user.bot)
      .map((m) => `<@${m.id}>`)
      .join(", ") || "Just you";

  const base = getBaseUrl();

  const embed = new EmbedBuilder()
    .setTitle("🎙️ Your Voice Channel")
    .setColor(0x5865f2)
    .setDescription(`Managing **${channel.name}**`)
    .addFields(
      { name: "👑 Owner", value: `<@${owner.id}>`, inline: true },
      { name: "👥 Members", value: members, inline: true },
      {
        name: "🔒 Status",
        value: channel.permissionOverwrites.cache
          .get(channel.guild.id)
          ?.deny.has("Connect")
          ? "Locked"
          : "Open",
        inline: true,
      },
      {
        name: "🔢 User Limit",
        value: channel.userLimit === 0 ? "Unlimited" : `${channel.userLimit}`,
        inline: true,
      },
    )
    .setFooter({ text: "Channel auto-deletes when empty" })
    .setTimestamp();

  if (base) {
    embed.setThumbnail(`${base}/api/assets/panel2.gif`);
    embed.setImage(`${base}/api/assets/panel.gif`);
  }

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("vc_rename")
      .setLabel("Rename")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("vc_lock")
      .setLabel("Lock")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vc_unlock")
      .setLabel("Unlock")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vc_limit")
      .setLabel("Set Limit")
      .setEmoji("🔢")
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("vc_kick")
      .setLabel("Kick Member")
      .setEmoji("👢")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("vc_ban")
      .setLabel("Ban Member")
      .setEmoji("🚫")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("vc_transfer")
      .setLabel("Transfer")
      .setEmoji("👑")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("vc_info")
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

export async function updateControlPanel(channel: VoiceChannel) {
  const data = getTempChannel(channel.id);
  if (!data?.controlPanelMessageId) return;

  try {
    const config = (await import("./store.js")).getGuildConfig(channel.guild.id);
    if (!config) return;

    const controlChannel = channel.guild.channels.cache.get(
      config.controlChannelId,
    ) as TextChannel | undefined;
    if (!controlChannel) return;

    const msg = await controlChannel.messages.fetch(data.controlPanelMessageId);
    const owner = channel.guild.members.cache.get(data.ownerId);
    if (!owner) return;

    await msg.edit(buildControlPanel(channel, owner));
  } catch {
  }
}
