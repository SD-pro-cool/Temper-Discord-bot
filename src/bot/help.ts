import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

function getBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  const domain = domains?.split(",")[0]?.trim();
  if (domain) return `https://${domain}`;
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain}`;
  return "";
}

const PAGES: Record<
  string,
  { label: string; emoji: string; description: string; content: string }
> = {
  home: {
    label: "Home",
    emoji: "🏠",
    description: "Overview of all features",
    content: [
      "Welcome to **Temp Voice Bot**!",
      "",
      "Use the dropdown below to browse command categories.",
      "",
      "**Categories**",
      "🎙️ **Voice Controls** — manage your temp VC",
      "⚙️ **Setup** — configure the bot",
      "ℹ️ **General** — misc commands",
    ].join("\n"),
  },
  voice: {
    label: "Voice Controls",
    emoji: "🎙️",
    description: "Commands for managing your VC",
    content: [
      "**🎙️ Voice Channel Controls**",
      "All controls appear as buttons in the **🎛️ vc-controls** channel when you own a temp VC.",
      "",
      "✏️ **Rename** — Change your channel's name",
      "🔒 **Lock** — Prevent new users from joining",
      "🔓 **Unlock** — Allow users to join again",
      "🔢 **Set Limit** — Cap the number of members (0 = unlimited)",
      "👢 **Kick Member** — Remove a member from your VC",
      "🚫 **Ban Member** — Remove & block a member from rejoining",
      "👑 **Transfer** — Hand ownership to another member",
      "🔄 **Refresh** — Update the control panel info",
    ].join("\n"),
  },
  setup: {
    label: "Setup",
    emoji: "⚙️",
    description: "Bot configuration commands",
    content: [
      "**⚙️ Setup Commands**",
      "",
      "**/setup** *(requires Manage Server)*",
      "Creates the full Temp Voice system in your server:",
      "• 🎙️ **Temp Voice** category",
      "• ➕ **Join to Create** voice channel",
      "• 🎛️ **vc-controls** text channel",
      "• 📖 **help** text channel",
      "",
      "Run this once. The config is saved and survives bot restarts.",
    ].join("\n"),
  },
  general: {
    label: "General",
    emoji: "ℹ️",
    description: "General bot commands",
    content: [
      "**ℹ️ General Commands**",
      "",
      "**/help** — Show this help menu",
      "**/setup** — Set up the bot *(admin only)*",
      "",
      "**How Temp Voice works:**",
      "1. Join **➕ Join to Create**",
      "2. The bot instantly creates a private VC for you",
      "3. Manage it via the control panel in **🎛️ vc-controls**",
      "4. When everyone leaves, the VC is auto-deleted",
    ].join("\n"),
  },
};

export function buildHelpEmbed(page: string) {
  const current = PAGES[page] ?? PAGES["home"]!;
  const base = getBaseUrl();

  const embed = new EmbedBuilder()
    .setTitle(`${current.emoji} ${current.label}`)
    .setColor(0x5865f2)
    .setDescription(current.content)
    .setFooter({ text: "Temp Voice Bot • Use the dropdown to navigate" })
    .setTimestamp();

  if (base) {
    embed.setImage(`${base}/api/assets/help.gif`);
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_menu")
    .setPlaceholder("📖 Browse command categories...")
    .addOptions(
      Object.entries(PAGES).map(([value, p]) =>
        new StringSelectMenuOptionBuilder()
          .setValue(value)
          .setLabel(p.label)
          .setDescription(p.description)
          .setEmoji(p.emoji)
          .setDefault(value === page),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

  return { embed, row };
}

export function buildHelpMessage() {
  const base = getBaseUrl();

  const embed = new EmbedBuilder()
    .setTitle("📖 Bot Help & Commands")
    .setColor(0x5865f2)
    .setDescription(
      [
        "Welcome to **Temp Voice Bot**! 🎙️",
        "",
        "Use the dropdown menu below to explore all available commands and features.",
        "",
        "**Quick Start:**",
        "1. An admin runs `/setup` to activate the system",
        "2. Join **➕ Join to Create** to get your own VC",
        "3. Manage it from **🎛️ vc-controls**",
      ].join("\n"),
    )
    .setFooter({ text: "Select a category below to learn more" })
    .setTimestamp();

  if (base) {
    embed.setImage(`${base}/api/assets/help.gif`);
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_menu")
    .setPlaceholder("📖 Browse command categories...")
    .addOptions(
      Object.entries(PAGES).map(([value, p]) =>
        new StringSelectMenuOptionBuilder()
          .setValue(value)
          .setLabel(p.label)
          .setDescription(p.description)
          .setEmoji(p.emoji),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

  return { embeds: [embed], components: [row] };
}
