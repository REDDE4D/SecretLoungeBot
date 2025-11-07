// src/commands/admin/restart.js
import { exec } from "child_process";
import { promisify } from "util";
import logger from "../../utils/logger.js";

const execAsync = promisify(exec);

export const meta = {
  commands: ["restart", "reload"],
  category: "admin",
  roleRequired: ["owner"],
  description: "Restart/reload the bot process using PM2",
  usage: "/restart or /reload",
  showInMenu: false,
};

export function register(bot) {
  // Register both /restart and /reload commands
  const handler = async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const ownerId = String(process.env.ADMIN_ID);

      // Double-check owner permission
      if (userId !== ownerId) {
        return; // Silently ignore non-owner
      }

      await ctx.reply("🔄 Initiating bot restart...\n\nThe bot will reload in a few seconds.");

      logger.logModeration("bot_restart", ctx.from.id, null, {
        trigger: "command",
        command: ctx.message.text,
      });

      // Give time for the message to send before restarting
      setTimeout(async () => {
        try {
          // Try to reload using PM2
          const { stdout, stderr } = await execAsync("pm2 reload bot");

          if (stderr && !stderr.includes("Process")) {
            logger.error("PM2 reload stderr:", stderr);
          }

          logger.info("Bot restart initiated via PM2:", stdout);
        } catch (error) {
          logger.error("Failed to restart bot via PM2:", error);

          // Fallback: exit process and let PM2 restart it
          logger.info("Falling back to process exit for restart");
          process.exit(0);
        }
      }, 2000);
    } catch (err) {
      logger.error("Error executing restart command:", err);
      await ctx.reply("❌ Error initiating restart. Check logs for details.");
    }
  };

  bot.command("restart", handler);
  bot.command("reload", handler);
}
