import { Telegraf } from "telegraf";

// Validate required environment variable
if (!process.env.BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN environment variable is required. Please check your .env file.");
}

const bot = new Telegraf(process.env.BOT_TOKEN);

export default bot;
