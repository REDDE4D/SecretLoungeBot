import { Telegraf } from "telegraf";

// Validate required environment variable
if (!process.env.BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN environment variable is required. Please check your .env file.");
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Export bot instance (default export for backward compatibility)
export default bot;

// Named export for dashboard API
export function getBotInstance() {
  return bot;
}
