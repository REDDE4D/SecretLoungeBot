// src/commands/user/preferences.js
import { Preferences } from "../../models/Preferences.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["preferences", "prefs", "settings"],
  category: "user",
  roleRequired: null,
  description: "Manage your personal preferences",
  usage: "/preferences, /preferences set <option> <value>",
  showInMenu: true,
};

const PREFERENCE_INFO = {
  hideStatusAnnouncements: {
    name: "Hide Status Announcements",
    description: "Hide when users come online, go idle, or go offline",
    type: "boolean",
    values: ["true", "false"],
    emoji: "🔕",
  },
  compactMode: {
    name: "Compact Mode",
    description: "Show messages with less spacing and formatting",
    type: "boolean",
    values: ["true", "false"],
    emoji: "📐",
  },
  hideJoinLeaveAnnouncements: {
    name: "Hide Join/Leave Announcements",
    description: "Hide when users join or leave the lobby",
    type: "boolean",
    values: ["true", "false"],
    emoji: "🚪",
  },
  notificationPreference: {
    name: "Notification Preference",
    description: "Control notification behavior",
    type: "enum",
    values: ["all", "mentions_only", "none"],
    emoji: "🔔",
  },
  autoMarkRead: {
    name: "Auto-Mark Read",
    description: "Automatically mark messages as read (future feature)",
    type: "boolean",
    values: ["true", "false"],
    emoji: "✅",
  },
};

function formatPreferenceValue(key, value) {
  if (typeof value === "boolean") {
    return value ? "✅ Enabled" : "❌ Disabled";
  }
  return value;
}

function formatPreferencesList(prefs) {
  const lines = ["⚙️ *Your Preferences*\n"];

  for (const [key, info] of Object.entries(PREFERENCE_INFO)) {
    const value = prefs[key];
    const formattedValue = formatPreferenceValue(key, value);
    lines.push(`${info.emoji} *${info.name}*`);
    lines.push(`   ${info.description}`);
    lines.push(`   Current: ${formattedValue}\n`);
  }

  lines.push("\n💡 *Usage:*");
  lines.push("`/preferences set <option> <value>`");
  lines.push("\n📋 *Available Options:*");
  lines.push("• `hideStatusAnnouncements` \\(true/false\\)");
  lines.push("• `compactMode` \\(true/false\\)");
  lines.push("• `hideJoinLeaveAnnouncements` \\(true/false\\)");
  lines.push("• `notificationPreference` \\(all/mentions\\_only/none\\)");
  lines.push("• `autoMarkRead` \\(true/false\\)");

  lines.push("\n📖 *Examples:*");
  lines.push("`/preferences set hideStatusAnnouncements true`");
  lines.push("`/preferences set compactMode true`");
  lines.push("`/preferences set notificationPreference mentions_only`");

  return escapeMarkdownV2(lines.join("\n"));
}

export function register(bot) {
  // Main preferences command
  bot.command(["preferences", "prefs", "settings"], async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const args = ctx.message.text.trim().split(" ").slice(1);

      // Check if it's a "set" command
      if (args[0] === "set" && args.length >= 3) {
        const option = args[1];
        const value = args.slice(2).join(" ");

        // Validate option
        if (!PREFERENCE_INFO[option]) {
          return ctx.reply(
            escapeMarkdownV2(
              `❌ Unknown option: ${option}\n\n` +
              `Available options:\n` +
              Object.keys(PREFERENCE_INFO).join(", ")
            ),
            { parse_mode: "MarkdownV2" }
          );
        }

        const info = PREFERENCE_INFO[option];

        // Parse and validate value
        let parsedValue;
        if (info.type === "boolean") {
          if (value === "true" || value === "on" || value === "yes" || value === "1") {
            parsedValue = true;
          } else if (value === "false" || value === "off" || value === "no" || value === "0") {
            parsedValue = false;
          } else {
            return ctx.reply(
              escapeMarkdownV2(
                `❌ Invalid value for ${option}. Expected: true or false`
              ),
              { parse_mode: "MarkdownV2" }
            );
          }
        } else if (info.type === "enum") {
          if (!info.values.includes(value)) {
            return ctx.reply(
              escapeMarkdownV2(
                `❌ Invalid value for ${option}. Expected one of: ${info.values.join(", ")}`
              ),
              { parse_mode: "MarkdownV2" }
            );
          }
          parsedValue = value;
        }

        // Update preference
        await Preferences.updatePreference(userId, option, parsedValue);

        logger.info("User updated preference", {
          userId,
          option,
          value: parsedValue
        });

        // Send confirmation with inline keyboard to toggle back
        const formattedValue = formatPreferenceValue(option, parsedValue);
        ctx.reply(
          escapeMarkdownV2(
            `✅ ${info.name} updated!\n\n` +
            `${info.emoji} ${info.description}\n` +
            `New value: ${formattedValue}`
          ),
          { parse_mode: "MarkdownV2" }
        );

        return;
      }

      // Otherwise, show current preferences
      const prefs = await Preferences.getOrCreate(userId);
      const message = formatPreferencesList(prefs);

      ctx.reply(message, { parse_mode: "MarkdownV2" });

    } catch (err) {
      logger.error("Error in preferences command", {
        error: err.message,
        userId: ctx.from?.id
      });
      ctx.reply(
        escapeMarkdownV2("❌ Could not load preferences. Please try again."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });

  // Quick toggle commands for convenience
  bot.command("compact", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const prefs = await Preferences.getOrCreate(userId);
      const newValue = !prefs.compactMode;

      await Preferences.updatePreference(userId, "compactMode", newValue);

      logger.info("User toggled compact mode", { userId, newValue });

      ctx.reply(
        escapeMarkdownV2(
          `📐 Compact Mode: ${newValue ? "✅ Enabled" : "❌ Disabled"}\n\n` +
          `Messages will ${newValue ? "now" : "no longer"} be shown in compact format.`
        ),
        { parse_mode: "MarkdownV2" }
      );
    } catch (err) {
      logger.error("Error toggling compact mode", {
        error: err.message,
        userId: ctx.from?.id
      });
      ctx.reply(
        escapeMarkdownV2("❌ Could not toggle compact mode. Please try again."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });

  bot.command("quiet", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const prefs = await Preferences.getOrCreate(userId);
      const newValue = !prefs.hideStatusAnnouncements;

      await Preferences.updatePreference(userId, "hideStatusAnnouncements", newValue);

      logger.info("User toggled status announcements", { userId, hideStatus: newValue });

      ctx.reply(
        escapeMarkdownV2(
          `🔕 Hide Status Announcements: ${newValue ? "✅ Enabled" : "❌ Disabled"}\n\n` +
          `You will ${newValue ? "no longer" : "now"} see when users come online, go idle, or go offline.`
        ),
        { parse_mode: "MarkdownV2" }
      );
    } catch (err) {
      logger.error("Error toggling status announcements", {
        error: err.message,
        userId: ctx.from?.id
      });
      ctx.reply(
        escapeMarkdownV2("❌ Could not toggle status announcements. Please try again."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });
}
