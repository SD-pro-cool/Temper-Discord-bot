import { Collection, type Client, REST, Routes } from "discord.js";
import * as setup from "./setup.js";
import * as help from "./help.js";
import { logger } from "../../lib/logger.js";

type Command = {
  data: { name: string; toJSON: () => unknown };
  execute: (interaction: any) => Promise<void>;
};

export const commands = new Collection<string, Command>();
commands.set(setup.data.name, setup);
commands.set(help.data.name, help);

export async function registerCommands(client: Client) {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) throw new Error("DISCORD_BOT_TOKEN not set");

  const rest = new REST().setToken(token);
  const body = [...commands.values()].map((c) => c.data.toJSON());

  if (!client.application) {
    logger.warn("client.application not ready yet, skipping command registration");
    return;
  }

  try {
    logger.info("Registering slash commands...");
    await rest.put(Routes.applicationCommands(client.application.id), { body });
    logger.info("Slash commands registered");
  } catch (err) {
    logger.error({ err }, "Failed to register commands");
  }
}
