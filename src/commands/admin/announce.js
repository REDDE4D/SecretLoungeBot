// src/commands/admin/announce.js
import { User } from "../../models/User.js";
import { escapeHTML } from "../../utils/sanitize.js";

export const meta = {
  commands: ["announce", "announce_lobby", "announce_all"],
  category: "admin",
  roleRequired: "admin",
  description: "Send official announcements to users",
  usage: "/announce <type> <message>\nTypes: info, update, warning, maintenance, event\n/announce_lobby <type> <message> - Send to lobby members only\n/announce_all <type> <message> - Send to all registered users",
  showInMenu: true,
};

// Announcement templates with emoji and formatting
const ANNOUNCEMENT_TEMPLATES = {
  info: {
    emoji: "📢",
    title: "Information",
    color: "#3498db",
  },
  update: {
    emoji: "🔔",
    title: "Update",
    color: "#2ecc71",
  },
  warning: {
    emoji: "⚠️",
    title: "Warning",
    color: "#f39c12",
  },
  maintenance: {
    emoji: "🔧",
    title: "Maintenance",
    color: "#e74c3c",
  },
  event: {
    emoji: "🎉",
    title: "Event",
    color: "#9b59b6",
  },
};

/**
 * Format announcement message with template
 */
function formatAnnouncement(type, message) {
  const template = ANNOUNCEMENT_TEMPLATES[type] || ANNOUNCEMENT_TEMPLATES.info;

  const header = `${template.emoji} <b>${template.title.toUpperCase()}</b> ${template.emoji}`;
  const separator = "━━━━━━━━━━━━━━━━";
  const escapedMessage = escapeHTML(message);

  return `${header}\n${separator}\n\n${escapedMessage}\n\n${separator}\n<i>Official announcement from bot administration</i>`;
}

/**
 * Send announcement to list of user IDs
 */
async function sendAnnouncement(ctx, userIds, formattedMessage) {
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (const userId of userIds) {
    try {
      await ctx.telegram.sendMessage(userId, formattedMessage, {
        parse_mode: "HTML",
      });
      successCount++;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      failCount++;
      const errorMsg = err?.response?.description || err?.message || "Unknown error";

      // Only log detailed errors for non-blocking situations
      if (!errorMsg.includes("bot was blocked") && !errorMsg.includes("user is deactivated")) {
        errors.push(`User ${userId}: ${errorMsg}`);
      }
    }
  }

  return { successCount, failCount, errors };
}

/**
 * Parse announcement command
 */
function parseAnnouncementCommand(text) {
  // Remove command and trim
  const content = text.replace(/^\/announce(_lobby|_all)?\s*/, "").trim();

  // Split by first space to get type and message
  const spaceIndex = content.indexOf(" ");
  if (spaceIndex === -1) {
    return { type: null, message: null, error: "Invalid format" };
  }

  const type = content.substring(0, spaceIndex).toLowerCase();
  const message = content.substring(spaceIndex + 1).trim();

  if (!ANNOUNCEMENT_TEMPLATES[type]) {
    return {
      type: null,
      message: null,
      error: `Invalid type. Available types: ${Object.keys(ANNOUNCEMENT_TEMPLATES).join(", ")}`
    };
  }

  if (!message || message.length === 0) {
    return { type: null, message: null, error: "Message cannot be empty" };
  }

  return { type, message, error: null };
}

export function register(bot) {
  // /announce - Send to lobby users (default)
  bot.command("announce", async (ctx) => {
    try {
      const text = ctx.message.text || "";
      const { type, message, error } = parseAnnouncementCommand(text);

      if (error) {
        await ctx.replyWithHTML(
          `❌ <b>Error:</b> ${escapeHTML(error)}\n\n` +
          `<b>Usage:</b> /announce &lt;type&gt; &lt;message&gt;\n` +
          `<b>Types:</b> ${Object.keys(ANNOUNCEMENT_TEMPLATES).join(", ")}\n\n` +
          `<b>Example:</b> /announce info The lobby will be maintained tomorrow at 3 PM UTC`
        );
        return;
      }

      // Get lobby users
      const lobbyUsers = await User.find({ inLobby: true }).lean();
      const userIds = lobbyUsers.map(u => u._id);

      if (userIds.length === 0) {
        await ctx.reply("❌ No users in lobby to send announcement to.");
        return;
      }

      // Format and send announcement
      const formattedMessage = formatAnnouncement(type, message);

      // Send preview to admin
      await ctx.replyWithHTML(
        `📤 <b>Sending announcement to ${userIds.length} lobby member(s)...</b>\n\n` +
        `<b>Preview:</b>\n${formattedMessage}`
      );

      // Send to all users
      const result = await sendAnnouncement(ctx, userIds, formattedMessage);

      // Report results
      let report = `✅ <b>Announcement sent!</b>\n\n`;
      report += `📊 <b>Statistics:</b>\n`;
      report += `• Delivered: ${result.successCount}/${userIds.length}\n`;
      if (result.failCount > 0) {
        report += `• Failed: ${result.failCount} (blocked/deactivated users)\n`;
      }

      if (result.errors.length > 0) {
        report += `\n⚠️ <b>Errors:</b>\n`;
        report += result.errors.slice(0, 5).map(e => `• ${escapeHTML(e)}`).join("\n");
        if (result.errors.length > 5) {
          report += `\n• ... and ${result.errors.length - 5} more`;
        }
      }

      await ctx.replyWithHTML(report);
    } catch (err) {
      console.error("Error sending announcement:", err);
      await ctx.reply("❌ Failed to send announcement. Please try again.");
    }
  });

  // /announce_lobby - Send to lobby users only (explicit)
  bot.command("announce_lobby", async (ctx) => {
    // Reuse the same logic as /announce
    ctx.message.text = ctx.message.text.replace("/announce_lobby", "/announce");
    return bot.handleCommand(ctx, "announce");
  });

  // /announce_all - Send to all registered users
  bot.command("announce_all", async (ctx) => {
    try {
      const text = ctx.message.text || "";
      const { type, message, error } = parseAnnouncementCommand(text);

      if (error) {
        await ctx.replyWithHTML(
          `❌ <b>Error:</b> ${escapeHTML(error)}\n\n` +
          `<b>Usage:</b> /announce_all &lt;type&gt; &lt;message&gt;\n` +
          `<b>Types:</b> ${Object.keys(ANNOUNCEMENT_TEMPLATES).join(", ")}\n\n` +
          `<b>Example:</b> /announce_all maintenance The bot will be down for 30 minutes starting at 5 PM UTC`
        );
        return;
      }

      // Get ALL registered users
      const allUsers = await User.find({}).lean();
      const userIds = allUsers.map(u => u._id);

      if (userIds.length === 0) {
        await ctx.reply("❌ No registered users to send announcement to.");
        return;
      }

      // Format and send announcement
      const formattedMessage = formatAnnouncement(type, message);

      // Send preview to admin
      await ctx.replyWithHTML(
        `📤 <b>Sending announcement to ALL ${userIds.length} registered user(s)...</b>\n\n` +
        `⚠️ <b>This includes users not in lobby!</b>\n\n` +
        `<b>Preview:</b>\n${formattedMessage}`
      );

      // Send to all users
      const result = await sendAnnouncement(ctx, userIds, formattedMessage);

      // Report results
      let report = `✅ <b>Announcement sent to all users!</b>\n\n`;
      report += `📊 <b>Statistics:</b>\n`;
      report += `• Delivered: ${result.successCount}/${userIds.length}\n`;
      if (result.failCount > 0) {
        report += `• Failed: ${result.failCount} (blocked/deactivated users)\n`;
      }

      if (result.errors.length > 0) {
        report += `\n⚠️ <b>Errors:</b>\n`;
        report += result.errors.slice(0, 5).map(e => `• ${escapeHTML(e)}`).join("\n");
        if (result.errors.length > 5) {
          report += `\n• ... and ${result.errors.length - 5} more`;
        }
      }

      await ctx.replyWithHTML(report);
    } catch (err) {
      console.error("Error sending announcement to all users:", err);
      await ctx.reply("❌ Failed to send announcement. Please try again.");
    }
  });
}
