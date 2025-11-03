// src/commands/admin/welcome.js
import Setting from "../../models/Setting.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["welcome"],
  category: "admin",
  roleRequired: ["admin"],
  description: "Configure welcome messages sent to users when they join the lobby",
  usage: "/welcome [on [message]|off|set <message>|status]",
  showInMenu: false,
};

export function register(bot) {
  bot.command("welcome", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const command = args[0]?.toLowerCase();

      // Show current status if no arguments
      if (!command || command === "status") {
        const setting = await Setting.findById("global");

        if (!setting || !setting.welcomeEnabled) {
          return ctx.reply(
            "❌ Welcome messages are currently DISABLED\n" +
              "Users joining the lobby will not receive a welcome message.\n\n" +
              "Use /welcome on to enable."
          );
        }

        return ctx.reply(
          `✅ Welcome messages are currently ENABLED\n\n` +
            `📢 New members see:\n` +
            `"${setting.welcomeMessage}"\n\n` +
            `<i>This message is sent automatically when users successfully join the lobby</i>`,
          { parse_mode: "HTML" }
        );
      }

      // Enable welcome messages
      if (command === "on") {
        // Get optional custom message (everything after "on")
        const customMessage = args.slice(1).join(" ");
        const defaultMessage = "👋 Welcome to the lobby! Feel free to introduce yourself and chat with others. Use /help to see all available commands.";
        const message = customMessage || defaultMessage;

        await Setting.findByIdAndUpdate(
          "global",
          {
            welcomeEnabled: true,
            welcomeMessage: message,
          },
          { upsert: true, new: true }
        );

        logger.logModeration("welcome_enable", ctx.from.id, null, {
          customMessage: !!customMessage,
          messageLength: message.length
        });

        return ctx.reply(
          `✅ Welcome messages ENABLED\n\n` +
            `📢 New members will see:\n` +
            `"${message}"\n\n` +
            `<i>This message will be sent automatically when users join the lobby</i>`,
          { parse_mode: "HTML" }
        );
      }

      // Disable welcome messages
      if (command === "off") {
        const setting = await Setting.findById("global");

        if (!setting || !setting.welcomeEnabled) {
          return ctx.reply("ℹ️ Welcome messages are already DISABLED");
        }

        await Setting.findByIdAndUpdate(
          "global",
          {
            welcomeEnabled: false,
          },
          { upsert: true, new: true }
        );

        logger.logModeration("welcome_disable", ctx.from.id, null);

        return ctx.reply(
          "❌ Welcome messages DISABLED\n" +
            "Users joining the lobby will no longer receive a welcome message."
        );
      }

      // Update welcome message without changing enabled status
      if (command === "set") {
        const message = args.slice(1).join(" ");

        if (!message) {
          return ctx.reply(
            "❌ Please provide a message.\n\n" +
              "Usage: /welcome set <message>"
          );
        }

        const setting = await Setting.findByIdAndUpdate(
          "global",
          {
            welcomeMessage: message,
          },
          { upsert: true, new: true }
        );

        logger.logModeration("welcome_update", ctx.from.id, null, {
          messageLength: message.length,
          wasEnabled: setting?.welcomeEnabled || false
        });

        return ctx.reply(
          `✅ Welcome message UPDATED\n\n` +
            `📢 New members will see:\n` +
            `"${message}"\n\n` +
            `<i>Status: ${setting?.welcomeEnabled ? 'ENABLED' : 'DISABLED'}</i>`,
          { parse_mode: "HTML" }
        );
      }

      // Invalid command
      return ctx.reply(
        "❌ Invalid welcome command.\n\n" +
          "Usage:\n" +
          "/welcome - Show current status\n" +
          "/welcome status - Show current status\n" +
          "/welcome on [message] - Enable with optional custom message\n" +
          "/welcome off - Disable\n" +
          "/welcome set <message> - Update message\n\n" +
          "Examples:\n" +
          "/welcome on - Enable with default message\n" +
          "/welcome on Hi! Welcome to our community! - Enable with custom message\n" +
          "/welcome set Check out our rules with /rules - Update message\n" +
          "/welcome off - Disable welcome messages"
      );
    } catch (err) {
      logger.error("Error configuring welcome messages:", err);
      await ctx.reply("❌ Error configuring welcome messages.");
    }
  });
}
