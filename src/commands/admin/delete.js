import { getAlias, muteUser } from "../../users/index.js";
import { parseDuration } from "../utils/parsers.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveOriginalFromReply } from "../../relay/quoteMap.js";
import RelayedMessage from "../../models/RelayedMessage.js";
import { handleTelegramError } from "../../utils/telegramErrorHandler.js";

export const meta = {
  commands: ["delete", "del"],
  category: "admin",
  roleRequired: "admin",
  description: "Delete a relayed message and optionally apply cooldown",
  usage: "/delete [duration] [reason] (reply to message)",
  showInMenu: false,
};

export function register(botInstance) {
  botInstance.command(["delete", "del"], async (ctx) => {
    try {
      console.log("[delete] Command called by user:", ctx.from.id);

      // Must reply to a message
      const replyId = ctx.message?.reply_to_message?.message_id;
      if (!replyId) {
        console.log("[delete] No reply ID found");
        return ctx.reply(
          escapeMarkdownV2("❌ Reply to a message to delete it."),
          { parse_mode: "MarkdownV2" }
        );
      }

      console.log("[delete] Resolving original message from reply:", replyId);

      // Resolve the original message
      const original = await resolveOriginalFromReply(ctx.from.id, replyId);
      if (!original) {
        console.log("[delete] Could not resolve original message");
        return ctx.reply(
          escapeMarkdownV2("❌ Could not find original message."),
          { parse_mode: "MarkdownV2" }
        );
      }

      const targetUserId = original.originalUserId;
      const originalMsgId = original.originalMsgId;

      console.log("[delete] Found original message:", { targetUserId, originalMsgId });

      // Parse arguments: [duration] [reason...]
      const args = ctx.message.text.trim().split(" ").slice(1);
      let durationMs = null;
      let reason = "";

      // Check if first arg looks like a duration
      if (args.length > 0) {
        const maybeDuration = parseDuration(args[0]);
        if (maybeDuration) {
          durationMs = maybeDuration;
          reason = args.slice(1).join(" ");
        } else {
          // All args are part of reason
          reason = args.join(" ");
        }
      }

      // Find all relayed copies of this message
      const relayedCopies = await RelayedMessage.find({
        originalUserId: String(targetUserId),
        originalMsgId: Number(originalMsgId),
      });

      console.log("[delete] Found", relayedCopies.length, "relayed copies");

      if (relayedCopies.length === 0) {
        console.log("[delete] No relayed copies found");
        return ctx.reply(
          escapeMarkdownV2("❌ No relayed copies found for this message."),
          { parse_mode: "MarkdownV2" }
        );
      }

      // Get target user info
      const targetAlias = await getAlias(targetUserId);

      console.log("[delete] Target user:", { targetUserId, targetAlias });

      // Delete all relayed copies with detailed error tracking
      // Note: We skip the sender's original message (where userId === originalUserId)
      // because the bot may not have permission to delete user-sent media messages
      let deletedCount = 0;
      let blockedCount = 0;
      let notFoundCount = 0;
      let otherErrorCount = 0;
      let skippedOriginal = false;

      for (const copy of relayedCopies) {
        try {
          const chatId = copy.userId || copy.chatId;

          // Skip sender's original message - only delete relayed copies
          if (String(copy.userId) === String(targetUserId) &&
              copy.messageId === copy.originalItemMsgId) {
            console.log(`[delete] Skipping sender's original message ${copy.messageId}`);
            skippedOriginal = true;
            continue;
          }

          if (chatId) {
            console.log(`[delete] Attempting to delete message ${copy.messageId} from chat ${chatId}`);
            await ctx.telegram.deleteMessage(chatId, copy.messageId);
            console.log(`[delete] Successfully deleted message ${copy.messageId} from chat ${chatId}`);
            deletedCount++;
          } else {
            console.log("[delete] No chatId for copy:", copy);
          }
        } catch (err) {
          console.log(`[delete] Error deleting message ${copy.messageId} from chat ${copy.userId}:`, err.message);

          // Track error types
          const handleResult = await handleTelegramError(err, copy.userId, "message_delete", {
            targetUserId,
            targetAlias,
            messageId: copy.messageId,
          });

          console.log(`[delete] Error handled as: ${handleResult.reason}`);

          if (handleResult.reason === "user_blocked") {
            blockedCount++;
          } else if (handleResult.reason === "not_found") {
            notFoundCount++;
          } else {
            otherErrorCount++;
          }
        }
      }

      console.log("[delete] Deletion summary:", { deletedCount, blockedCount, notFoundCount, otherErrorCount });

      // Remove from database
      await RelayedMessage.deleteMany({
        originalUserId: String(targetUserId),
        originalMsgId: Number(originalMsgId),
      });

      const targetAliasEscaped = escapeMarkdownV2(targetAlias);

      // Apply cooldown if duration specified
      if (durationMs) {
        await muteUser(targetUserId, durationMs);

        // Reply to the sender's original message
        const cooldownMinutes = Math.round(durationMs / 60000);
        const notificationText = `🚫 Your message was deleted by an admin${
          reason ? ` for: ${reason}` : ""
        }\n\nYou have been given a ${cooldownMinutes} minute cooldown.`;

        try {
          await ctx.telegram.sendMessage(targetUserId, notificationText, {
            reply_to_message_id: originalMsgId,
          });
        } catch (err) {
          // If reply fails, send without reply
          try {
            await ctx.telegram.sendMessage(targetUserId, notificationText);
          } catch (err2) {
            await handleTelegramError(err2, targetUserId, "delete_notification", { targetAlias });
          }
        }
      } else {
        // Reply to the sender's original message (no cooldown)
        const notificationText = `🚫 Your message was deleted by an admin${
          reason ? ` for: ${reason}` : ""
        }`;

        try {
          await ctx.telegram.sendMessage(targetUserId, notificationText, {
            reply_to_message_id: originalMsgId,
          });
        } catch (err) {
          // If reply fails, send without reply
          try {
            await ctx.telegram.sendMessage(targetUserId, notificationText);
          } catch (err2) {
            await handleTelegramError(err2, targetUserId, "delete_notification", { targetAlias });
          }
        }
      }

      // Send confirmation to admin with error statistics
      const cooldownInfo = durationMs
        ? ` and applied ${Math.round(durationMs / 60000)}m cooldown`
        : "";

      const totalAttempted = relayedCopies.length;
      let detailsText = `🗑️ Deleted message from *${targetAliasEscaped}*${cooldownInfo}\\.\n\n`;
      detailsText += `✅ Successfully deleted: ${deletedCount}/${totalAttempted} messages\n`;

      if (blockedCount > 0) {
        detailsText += `🚫 Users who blocked bot: ${blockedCount}\n`;
      }
      if (notFoundCount > 0) {
        detailsText += `❌ Already deleted: ${notFoundCount}\n`;
      }
      if (otherErrorCount > 0) {
        detailsText += `⚠️ Other errors: ${otherErrorCount}\n`;
      }

      ctx.reply(detailsText, { parse_mode: "MarkdownV2" });
    } catch (err) {
      console.error("[delete] Error:", err);
      ctx.reply(
        escapeMarkdownV2(err.message || "❌ Failed to delete message."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });
}
