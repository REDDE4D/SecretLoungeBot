import PinnedMessage from "../../models/PinnedMessage.js";
import RelayedMessage from "../../models/RelayedMessage.js";
import { getAlias, getLobbyUsers } from "../../users/index.js";
import logger from "../../utils/logger.js";
import { escapeHTML } from "../../utils/sanitize.js";
import { sendWithRetry } from "../../relay/utils.js";

export const meta = {
  commands: ["pin", "unpin", "pinned"],
  category: "admin",
  roleRequired: [], // pinned is public, pin/unpin are admin only
  description: "Manage pinned announcements (max 5)",
  usage: "/pin <message>, /unpin <id>, /pinned",
  showInMenu: false,
};

export function register(bot) {
  // Pin a message (admin only) - supports two modes:
  // 1. Reply to a message with /pin - pins that relayed message
  // 2. /pin <text> - creates and pins a new announcement
  bot.command("pin", async (ctx) => {
    try {
      const user = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      const hasAdminRole = user?.user?.id && (await checkAdminRole(user.user.id));

      if (!hasAdminRole) {
        return ctx.reply("❌ This command is restricted to admins.");
      }

      const text = ctx.message.text || "";
      const messageText = text.replace(/^\/pin\s*/, "").trim();
      const isReply = !!ctx.message.reply_to_message;

      // MODE 1: Reply to pin (pin a specific relayed message)
      if (isReply) {
        const repliedMsgId = ctx.message.reply_to_message.message_id;
        const adminUserId = ctx.from.id.toString();

        // Find the relayed message
        const relayed = await RelayedMessage.findOne({
          userId: adminUserId,
          messageId: repliedMsgId
        }).lean();

        if (!relayed) {
          return ctx.reply("❌ This message cannot be pinned (not a relayed lobby message).");
        }

        // Check if max pins reached
        const canAdd = await PinnedMessage.canAddMore();
        if (!canAdd) {
          return ctx.reply(
            "❌ Maximum 5 pinned messages allowed.\n" +
              "Use /pinned to view all pins, then /unpin <id> to remove one first."
          );
        }

        // Find all copies of this message
        const allCopies = await RelayedMessage.find({
          originalUserId: relayed.originalUserId,
          originalMsgId: relayed.originalMsgId
        }).lean();

        // Get next ID and admin alias
        const nextId = await PinnedMessage.getNextId();
        const adminAlias = await getAlias(adminUserId);

        // Pin all copies
        const relayedMessageIds = new Map();
        const errors = [];

        for (const copy of allCopies) {
          try {
            await ctx.telegram.pinChatMessage(
              copy.chatId || copy.userId,
              copy.messageId,
              { disable_notification: true }
            );
            relayedMessageIds.set(copy.userId, copy.messageId);
          } catch (err) {
            errors.push(copy.userId);
            console.error(`Failed to pin message for ${copy.userId}:`, err.message);
          }
        }

        // Create pinned message record
        await PinnedMessage.create({
          _id: nextId,
          type: 'relayed',
          relayedMessageIds: relayedMessageIds,
          originalUserId: relayed.originalUserId,
          originalMsgId: relayed.originalMsgId,
          pinnedBy: adminUserId,
          pinnedByAlias: adminAlias,
        });

        logger.logModeration("pin_relayed", ctx.from.id, null, {
          pinId: nextId,
          originalUserId: relayed.originalUserId,
          originalMsgId: relayed.originalMsgId,
          pinnedCount: relayedMessageIds.size,
          errorCount: errors.length
        });

        let response = `✅ <b>Message pinned in all chats</b> (#${nextId})\n\n`;
        response += `📌 Pinned ${relayedMessageIds.size} copies successfully`;
        if (errors.length > 0) {
          response += `\n⚠️ Failed to pin in ${errors.length} chat(s) (blocked/deleted)`;
        }

        await ctx.replyWithHTML(response);
        return;
      }

      // MODE 2: Announcement mode (create and pin new message)
      if (!messageText) {
        return ctx.reply(
          "Usage:\n" +
            "• Reply to a message with /pin - pins that message\n" +
            "• /pin <text> - creates and pins a new announcement\n\n" +
            "Max 5 pinned messages allowed.\n\n" +
            "Examples:\n" +
            "/pin 📢 Welcome to the lobby! Please read the rules.\n" +
            "or reply to a message with /pin"
        );
      }

      // Check if max pins reached
      const canAdd = await PinnedMessage.canAddMore();
      if (!canAdd) {
        return ctx.reply(
          "❌ Maximum 5 pinned messages allowed.\n" +
            "Use /pinned to view all pins, then /unpin <id> to remove one first."
        );
      }

      // Get next ID and admin alias
      const nextId = await PinnedMessage.getNextId();
      const adminAlias = await getAlias(ctx.from.id.toString());

      // Get all lobby users
      const lobbyUsers = await getLobbyUsers();

      // Send and pin announcement to all lobby members
      const relayedMessageIds = new Map();
      const errors = [];

      for (const userId of lobbyUsers) {
        try {
          const sent = await sendWithRetry(
            ctx.telegram,
            (args) => ctx.telegram.sendMessage(userId, `📢 <b>Announcement</b>\n\n${escapeHTML(messageText)}`, args),
            { parse_mode: "HTML" }
          );

          await ctx.telegram.pinChatMessage(
            userId,
            sent.message_id,
            { disable_notification: true }
          );

          relayedMessageIds.set(String(userId), sent.message_id);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          errors.push(userId);
          console.error(`Failed to send/pin announcement to ${userId}:`, err.message);
        }
      }

      // Create pinned message record
      await PinnedMessage.create({
        _id: nextId,
        type: 'announcement',
        message: messageText,
        relayedMessageIds: relayedMessageIds,
        pinnedBy: ctx.from.id.toString(),
        pinnedByAlias: adminAlias,
      });

      logger.logModeration("pin_announcement", ctx.from.id, null, {
        pinId: nextId,
        messageLength: messageText.length,
        sentCount: relayedMessageIds.size,
        errorCount: errors.length
      });

      let response = `✅ <b>Announcement pinned in all chats</b> (#${nextId})\n\n`;
      response += `📌 ${escapeHTML(messageText)}\n\n`;
      response += `Sent and pinned to ${relayedMessageIds.size} users`;
      if (errors.length > 0) {
        response += `\n⚠️ Failed in ${errors.length} chat(s) (blocked/deleted)`;
      }

      await ctx.replyWithHTML(response);
    } catch (err) {
      logger.error("Error pinning message:", err);
      await ctx.reply("❌ Failed to pin message. Please try again.");
    }
  });

  // Unpin a message (admin only)
  bot.command("unpin", async (ctx) => {
    try {
      const user = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      const hasAdminRole = user?.user?.id && (await checkAdminRole(user.user.id));

      if (!hasAdminRole) {
        return ctx.reply("❌ This command is restricted to admins.");
      }

      const args = (ctx.message.text || "").trim().split(/\s+/);
      const idStr = args[1];

      if (!idStr) {
        return ctx.reply(
          "Usage: /unpin <id>\n\n" +
            "Remove a pinned message by its ID.\n" +
            "Use /pinned to view all pinned messages with their IDs.\n\n" +
            "Example:\n" +
            "/unpin 3"
        );
      }

      const pinId = parseInt(idStr, 10);
      if (isNaN(pinId)) {
        return ctx.reply("❌ Invalid pin ID. Please provide a number.");
      }

      const pin = await PinnedMessage.findById(pinId);
      if (!pin) {
        return ctx.reply(`❌ No pinned message found with ID ${pinId}.`);
      }

      // Unpin all copies if this is a native pinned message
      const errors = [];
      let unpinnedCount = 0;

      if (pin.relayedMessageIds && pin.relayedMessageIds.size > 0) {
        for (const [userId, messageId] of pin.relayedMessageIds) {
          try {
            await ctx.telegram.unpinChatMessage(userId, messageId);
            unpinnedCount++;
          } catch (err) {
            errors.push(userId);
            console.error(`Failed to unpin message for ${userId}:`, err.message);
          }
        }
      }

      // Delete the pin record
      await PinnedMessage.deleteOne({ _id: pinId });

      logger.logModeration("pin_delete", ctx.from.id, null, {
        pinId,
        type: pin.type,
        message: pin.message?.substring(0, 50) || 'relayed message',
        unpinnedCount,
        errorCount: errors.length
      });

      let response = `✅ <b>Pinned message removed</b> (#${pinId})\n\n`;

      if (pin.type === 'announcement' && pin.message) {
        response += `📌 ${escapeHTML(pin.message.substring(0, 100))}${pin.message.length > 100 ? "..." : ""}\n\n`;
      } else if (pin.type === 'relayed') {
        response += `📌 Relayed message\n\n`;
      }

      if (unpinnedCount > 0) {
        response += `Unpinned from ${unpinnedCount} chat(s)`;
        if (errors.length > 0) {
          response += `\n⚠️ Failed in ${errors.length} chat(s) (blocked/deleted)`;
        }
      }

      await ctx.replyWithHTML(response);
    } catch (err) {
      logger.error("Error unpinning message:", err);
      await ctx.reply("❌ Failed to unpin message. Please try again.");
    }
  });

  // View all pinned messages (public)
  bot.command("pinned", async (ctx) => {
    try {
      const pins = await PinnedMessage.getAllPins();

      if (pins.length === 0) {
        return ctx.reply("📌 No pinned messages at this time.");
      }

      let message = `📌 <b>Pinned Messages</b> (${pins.length}/5)\n\n`;

      for (const pin of pins) {
        const date = new Date(pin.pinnedAt).toLocaleDateString();
        message += `<b>#${pin._id}</b> - <i>by ${escapeHTML(pin.pinnedByAlias)} on ${date}</i>\n`;

        if (pin.type === 'announcement' && pin.message) {
          message += `${escapeHTML(pin.message)}\n\n`;
        } else if (pin.type === 'relayed') {
          message += `📎 Pinned lobby message\n\n`;
        } else {
          // Backwards compatibility for old pins without type
          message += `${escapeHTML(pin.message || '[message]')}\n\n`;
        }
      }

      message += `<i>Admins: Use /pin to add new pinned messages</i>`;

      await ctx.replyWithHTML(message);
    } catch (err) {
      logger.error("Error viewing pinned messages:", err);
      await ctx.reply("❌ Failed to load pinned messages. Please try again.");
    }
  });
}

// Helper function to check if user is admin
async function checkAdminRole(userId) {
  const { User } = await import("../../models/User.js");
  const user = await User.findById(userId.toString());
  return user?.role === "admin";
}
