// src/commands/admin/maintenance.js
import Setting from "../../models/Setting.js";
import logger from "../../utils/logger.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";

export const meta = {
  commands: ["maintenance"],
  category: "admin",
  roleRequired: ["admin"],
  description: "Enable/disable maintenance mode to block all lobby messages",
  usage: "/maintenance [on [message]|off|status]",
  showInMenu: false,
};

export function register(bot) {
  bot.command("maintenance", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const command = args[0]?.toLowerCase();

      // Show current status if no arguments
      if (!command || command === "status") {
        const setting = await Setting.findById("global");

        if (!setting || !setting.maintenanceMode) {
          return ctx.reply(
            "✅ Maintenance mode is currently OFF\n" +
              "All lobby messages are being relayed normally."
          );
        }

        return ctx.reply(
          `🔧 Maintenance mode is currently ON\n\n` +
            `📢 User message:\n` +
            `"${setting.maintenanceMessage}"\n\n` +
            `<i>Admin commands continue to function normally</i>`,
          { parse_mode: "HTML" }
        );
      }

      // Enable maintenance mode
      if (command === "on") {
        // Get optional custom message (everything after "on")
        const customMessage = args.slice(1).join(" ");
        const defaultMessage = "🔧 The lobby is currently undergoing maintenance. Please check back later.";
        const message = customMessage || defaultMessage;

        await Setting.findByIdAndUpdate(
          "global",
          {
            maintenanceMode: true,
            maintenanceMessage: message,
          },
          { upsert: true, new: true }
        );

        logger.logModeration("maintenance_enable", ctx.from.id, null, {
          customMessage: !!customMessage,
          messageLength: message.length
        });

        return ctx.reply(
          `🔧 Maintenance mode ENABLED\n\n` +
            `📢 Users will see:\n` +
            `"${message}"\n\n` +
            `<i>All lobby messages are now blocked. Admin commands will continue to work.</i>`,
          { parse_mode: "HTML" }
        );
      }

      // Disable maintenance mode
      if (command === "off") {
        const setting = await Setting.findById("global");

        if (!setting || !setting.maintenanceMode) {
          return ctx.reply("ℹ️ Maintenance mode is already OFF");
        }

        await Setting.findByIdAndUpdate(
          "global",
          {
            maintenanceMode: false,
          },
          { upsert: true, new: true }
        );

        logger.logModeration("maintenance_disable", ctx.from.id, null);

        return ctx.reply(
          "✅ Maintenance mode DISABLED\n" +
            "Lobby messages are now being relayed normally."
        );
      }

      // Invalid command
      return ctx.reply(
        "❌ Invalid maintenance command.\n\n" +
          "Usage:\n" +
          "/maintenance - Show current status\n" +
          "/maintenance status - Show current status\n" +
          "/maintenance on [message] - Enable with optional custom message\n" +
          "/maintenance off - Disable\n\n" +
          "Examples:\n" +
          "/maintenance on - Enable with default message\n" +
          "/maintenance on We'll be back in 30 minutes! - Enable with custom message\n" +
          "/maintenance off - Disable maintenance mode"
      );
    } catch (err) {
      logger.error("Error configuring maintenance mode:", err);
      await ctx.reply("❌ Error configuring maintenance mode.");
    }
  });
}
