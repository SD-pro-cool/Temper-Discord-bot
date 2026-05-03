import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");
const CONFIG_FILE = join(DATA_DIR, "guild-configs.json");

export interface TempChannel {
  channelId: string;
  ownerId: string;
  guildId: string;
  controlPanelMessageId?: string;
}

export interface GuildConfig {
  joinChannelId: string;
  controlCategoryId: string;
  controlChannelId: string;
}

const tempChannels = new Map<string, TempChannel>();
const guildConfigs = new Map<string, GuildConfig>();

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadConfigs() {
  try {
    ensureDataDir();
    if (!existsSync(CONFIG_FILE)) return;
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, GuildConfig>;
    for (const [guildId, config] of Object.entries(parsed)) {
      guildConfigs.set(guildId, config);
    }
    logger.info({ count: guildConfigs.size }, "Loaded guild configs from disk");
  } catch (err) {
    logger.error({ err }, "Failed to load guild configs");
  }
}

function saveConfigs() {
  try {
    ensureDataDir();
    const obj: Record<string, GuildConfig> = {};
    for (const [guildId, config] of guildConfigs.entries()) {
      obj[guildId] = config;
    }
    writeFileSync(CONFIG_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    logger.error({ err }, "Failed to save guild configs");
  }
}

loadConfigs();

export function setGuildConfig(guildId: string, config: GuildConfig) {
  guildConfigs.set(guildId, config);
  saveConfigs();
}

export function getGuildConfig(guildId: string): GuildConfig | undefined {
  return guildConfigs.get(guildId);
}

export function createTempChannel(channelId: string, data: TempChannel) {
  tempChannels.set(channelId, data);
}

export function getTempChannel(channelId: string): TempChannel | undefined {
  return tempChannels.get(channelId);
}

export function deleteTempChannel(channelId: string) {
  tempChannels.delete(channelId);
}

export function getTempChannelByOwner(
  guildId: string,
  ownerId: string,
): TempChannel | undefined {
  for (const ch of tempChannels.values()) {
    if (ch.guildId === guildId && ch.ownerId === ownerId) return ch;
  }
  return undefined;
}

export function getAllTempChannels(): Map<string, TempChannel> {
  return tempChannels;
}
