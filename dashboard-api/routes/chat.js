import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { requireOwnerOrAdmin } from "../middleware/rbac.js";
import { getBotInstance } from "../../src/core/bot.js";
import { escapeHTML, renderIconHTML } from "../../src/utils/sanitize.js";
import { getSystemRoleEmoji } from "../config/permissions.js";
import { getKarmaEmoji } from "../../src/services/karmaService.js";
import { emitLobbyMessage } from "../services/socketService.js";

const router = express.Router();

// Helper to get models at runtime
const getRelayedMessage = () => mongoose.model("RelayedMessage");
const getUser = () => mongoose.model("User");

/**
 * GET /api/chat/history
 * Get recent lobby messages for live chat display
 * Admin only
 */
router.get(
  "/history",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res) => {
    try {
      const RelayedMessage = getRelayedMessage();
      const User = getUser();

      const limit = parseInt(req.query.limit) || 100;
      const hours = parseInt(req.query.hours) || 24;

      // Calculate time threshold
      const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Find recent messages (original messages only, not relayed copies)
      // Simplified query without aggregation
      const messages = await RelayedMessage.find({
        createdAt: { $gte: timeThreshold },
        $expr: { $eq: ["$userId", "$originalUserId"] },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Get unique user IDs
      const userIds = [...new Set(messages.map((msg) => msg.originalUserId))];

      // Fetch user data in batch
      const users = await User.find({ _id: { $in: userIds } })
        .select("_id alias icon role karma")
        .lean();

      // Create user lookup map
      const userMap = new Map(users.map((u) => [u._id, u]));

      // Combine message and user data
      const enrichedMessages = messages
        .map((msg) => {
          const user = userMap.get(msg.originalUserId);
          if (!user) return null;

          return {
            id: msg._id,
            userId: msg.originalUserId,
            alias: user.alias,
            icon: user.icon,
            role: user.role,
            karma: user.karma || 0,
            type: msg.type,
            text: msg.caption || "",
            fileId: msg.fileId,
            albumId: msg.albumId,
            timestamp: msg.createdAt,
          };
        })
        .filter((msg) => msg !== null)
        .reverse(); // Reverse to chronological order

      res.json({
        success: true,
        messages: enrichedMessages,
        count: enrichedMessages.length,
      });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch chat history",
      });
    }
  }
);

/**
 * POST /api/chat/send
 * Send a message from dashboard to Telegram lobby
 * Admin only - message appears as coming from the admin user
 */
router.post(
  "/send",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res) => {
    try {
      const { text, replyToAlias, replyToText } = req.body;
      const adminId = req.user.id || req.user.userId; // From JWT token (try both fields)
      const User = getUser();

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: "Message text is required",
        });
      }

      if (text.length > 4096) {
        return res.status(400).json({
          success: false,
          error: "Message text exceeds 4096 character limit",
        });
      }

      // Get admin user data using dashboard-api's mongoose connection
      const adminUser = await User.findById(adminId).lean();

      if (!adminUser) {
        return res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
      }

      if (!adminUser.inLobby) {
        return res.status(400).json({
          success: false,
          error: "You must be in the lobby to send messages",
        });
      }

      // Get bot instance
      const bot = getBotInstance();

      // Get all lobby users (excluding the admin) using dashboard-api's mongoose connection
      const lobbyUserDocs = await User.find({ inLobby: true }).select("_id").lean();
      const recipients = lobbyUserDocs
        .map((u) => String(u._id))
        .filter((uid) => uid !== String(adminId));

      // Build message header (same format as relay system)
      const karmaEmoji = getKarmaEmoji(adminUser.karma || 0);
      const karmaPrefix = karmaEmoji ? `${karmaEmoji} ` : "";
      const roleEmoji = await getSystemRoleEmoji(adminUser.role);
      const roleBadge = roleEmoji ? ` ${roleEmoji}` : "";
      const header = `${karmaPrefix}${renderIconHTML(adminUser.icon)} <b>${escapeHTML(adminUser.alias)}</b>${roleBadge}`;

      // Build message with reply if present
      let messageText = header;
      if (replyToAlias && replyToText) {
        const replyBlock = `\n\n<blockquote><b>↩️ ${escapeHTML(replyToAlias)}</b>\n${escapeHTML(replyToText)}</blockquote>`;
        messageText = `${header}${replyBlock}\n\n${escapeHTML(text)}`;
      } else {
        messageText = `${header}\n\n${escapeHTML(text)}`;
      }

      // Send to all lobby members
      let successCount = 0;
      let failedCount = 0;

      for (const recipientId of recipients) {
        try {
          await bot.telegram.sendMessage(recipientId, messageText, {
            parse_mode: "HTML",
          });
          successCount++;

          // Small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (err) {
          console.error(
            `Failed to send dashboard message to ${recipientId}:`,
            err.message
          );
          failedCount++;
        }
      }

      // Broadcast message to dashboard live chat
      try {
        emitLobbyMessage({
          id: `dashboard-${Date.now()}`,
          userId: adminId,
          alias: adminUser.alias,
          icon: adminUser.icon,
          role: adminUser.role,
          karma: adminUser.karma || 0,
          type: "text",
          text: text,
          fileId: null,
          albumId: null,
          replyToAlias: replyToAlias || null,
          replyToText: replyToText || null,
          timestamp: new Date().toISOString(),
        });
      } catch (broadcastErr) {
        console.error("Error broadcasting to dashboard:", broadcastErr.message);
      }

      res.json({
        success: true,
        message: "Message sent to lobby",
        stats: {
          sent: successCount,
          failed: failedCount,
          total: recipients.length,
        },
      });
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send message",
      });
    }
  }
);

export default router;
