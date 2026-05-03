import dotenv from "dotenv";
import path from "path";

// 🔥 Force-load .env from project root
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

import app from "./app";
import { logger } from "./lib/logger";
import { startBot } from "./bot/index";

async function main() {
  try {
    // 🔍 Debug (remove later if you want)
    console.log("CWD:", process.cwd());
    console.log("TOKEN CHECK:", process.env.DISCORD_BOT_TOKEN);

    // Use PORT or fallback
    const port = Number(process.env.PORT) || 3000;

    // Start server
    app.listen(port, (err: any) => {
      if (err) {
        logger.error({ err }, "❌ Error starting server");
        process.exit(1);
      }

      logger.info({ port }, "🌐 Server running");
    });

    // Start Discord bot
    await startBot();

    logger.info("🤖 Bot started successfully");
  } catch (err) {
    logger.error({ err }, "❌ Startup failed");
    process.exit(1);
  }
}

main();