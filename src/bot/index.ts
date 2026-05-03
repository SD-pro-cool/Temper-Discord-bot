import {
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { handleVoiceStateUpdate } from "./handlers/voiceState.js";
import { handleInteraction } from "./handlers/interactions.js";
import { registerCommands } from "./commands/index.js";

export async function startBot() {
  // Token should already be loaded from index.ts
  const token =
    process.env.DISCORD_BOT_TOKEN ||
    process.env.TOKEN;

  if (!token) {
    logger.error("❌ No Discord token found in environment variables");
    logger.error("👉 Expected: DISCORD_BOT_TOKEN or TOKEN in .env");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
  });

  client.once("ready", async (c) => {
    logger.info({ tag: c.user.tag }, "🤖 Discord bot is ready");
    await registerCommands(c);
  });

  client.on("voiceStateUpdate", (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState).catch((err) =>
      logger.error({ err }, "voiceStateUpdate error"),
    );
  });

  client.on("interactionCreate", (interaction) => {
    handleInteraction(interaction).catch((err) =>
      logger.error({ err }, "interactionCreate error"),
    );
  });

  client.on("error", (err) => {
    logger.error({ err }, "Discord client error");
  });

  try {
    await client.login(token);
    logger.info("✅ Logged into Discord");
  } catch (err) {
    logger.error({ err }, "❌ Failed to login to Discord");
  }

  return client;
}