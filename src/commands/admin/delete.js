import { getAlias, muteUser, getLobbyUsers, getIcon } from "../../users/index.js";
import { parseDuration } from "../utils/parsers.js";
import { escapeMarkdownV2, escapeHTML, renderIconHTML } from "../../utils/sanitize.js";
import { resolveOriginalFromReply } from "../../relay/quoteMap.js";
import RelayedMessage from "../../models/RelayedMessage.js";
import bot from "../../core/bot.js";

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
      // Must reply to a message
      const replyId = ctx.message?.reply_to_message?.message_id;
      if (!replyId) {
        return ctx.reply(
          escapeMarkdownV2("❌ Reply to a message to delete it."),
          { parse_mode: "MarkdownV2" }
        );
      }

      // Resolve the original message
      const original = await resolveOriginalFromReply(ctx.from.id, replyId);
      if (!original) {
        return ctx.reply(
          escapeMarkdownV2("❌ Could not find original message."),
          { parse_mode: "MarkdownV2" }
        );
      }

      const targetUserId = original.originalUserId;
      const originalMsgId = original.originalMsgId;

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

      if (relayedCopies.length === 0) {
        return ctx.reply(
          escapeMarkdownV2("❌ No relayed copies found for this message."),
          { parse_mode: "MarkdownV2" }
        );
      }

      // Delete all copies
      let deletedCount = 0;
      for (const copy of relayedCopies) {
        try {
          const chatId = copy.userId || copy.chatId;
          if (chatId) {
            await ctx.telegram.deleteMessage(chatId, copy.messageId);
            deletedCount++;
          }
        } catch (err) {
          // Silently fail for individual deletions (user may have deleted it, blocked bot, etc.)
        }
      }

      // Remove from database
      await RelayedMessage.deleteMany({
        originalUserId: String(targetUserId),
        originalMsgId: Number(originalMsgId),
      });

      // Get target user info
      const targetAlias = await getAlias(targetUserId);
      const targetIcon = await getIcon(targetUserId);
      const targetAliasEscaped = escapeMarkdownV2(targetAlias);

      // Apply cooldown if duration specified
      if (durationMs) {
        await muteUser(targetUserId, durationMs);

        // Notify the target user
        const cooldownMinutes = Math.round(durationMs / 60000);
        const notificationText = `🚫 Your message was deleted by an admin${
          reason ? ` for: ${reason}` : ""
        }\n\nYou have been given a ${cooldownMinutes} minute cooldown.`;

        try {
          await ctx.telegram.sendMessage(targetUserId, notificationText);
        } catch (err) {
          // Silently fail
        }
      } else {
        // Notify the target user (no cooldown)
        const notificationText = `🚫 Your message was deleted by an admin${
          reason ? ` for: ${reason}` : ""
        }`;

        try {
          await ctx.telegram.sendMessage(targetUserId, notificationText);
        } catch (err) {
          // Silently fail
        }
      }

      // Send confirmation to admin
      const cooldownInfo = durationMs
        ? ` and applied ${Math.round(durationMs / 60000)}m cooldown`
        : "";
      ctx.reply(
        `🗑️ Deleted message from *${targetAliasEscaped}*${cooldownInfo}\\.\nDeleted ${deletedCount} copies\\.`,
        { parse_mode: "MarkdownV2" }
      );

      // Announce to lobby
      const lobbyUsers = await getLobbyUsers();
      const cooldownText = durationMs
        ? ` and given a ${Math.round(durationMs / 60000)} minute cooldown`
        : "";
      const reasonText = reason ? `\nReason: ${escapeHTML(reason)}` : "";
      const announcement = `${renderIconHTML(targetIcon)} <b>${escapeHTML(
        targetAlias
      )}</b>'s message was deleted by an admin${cooldownText}.${reasonText}`;

      for (const userId of lobbyUsers) {
        // Skip the admin who deleted and the target user (they got their own notification)
        if (userId === String(ctx.from.id) || userId === String(targetUserId)) continue;

        try {
          await bot.telegram.sendMessage(userId, announcement, {
            parse_mode: "HTML",
          });
        } catch (err) {
          // Silently fail
        }
      }
    } catch (err) {
      console.error("[delete] Error:", err);
      ctx.reply(
        escapeMarkdownV2(err.message || "❌ Failed to delete message."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });
}
