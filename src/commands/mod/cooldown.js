import { getAlias, muteUser } from "../../users/index.js";
import { parseDuration } from "../utils/parsers.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["cooldown", "cd"],
  category: "mod",
  roleRequired: ["mod", "admin"],
  description: "Apply cooldown (temporary mute) to a user",
  usage: "/cooldown <alias|reply> [duration] [reason]",
  showInMenu: false,
};

export function register(bot) {
  bot.command(["cooldown", "cd"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const isReply = ctx.message.reply_to_message != null;

      let userId;
      let remainingArgs;

      if (isReply) {
        // Reply mode: all args are duration/reason
        userId = await resolveTargetUser(ctx, null);
        remainingArgs = args;
      } else {
        // Alias mode: first arg is alias, rest is duration/reason
        const alias = args[0];
        userId = await resolveTargetUser(ctx, alias);
        remainingArgs = args.slice(1);
      }

      let durationMs = 5 * 60 * 1000; // Default: 5 minutes
      let reason = "";

      if (remainingArgs.length > 0) {
        // Check if first remaining arg is a duration
        const maybeDuration = parseDuration(remainingArgs[0]);
        if (maybeDuration) {
          durationMs = maybeDuration;
          reason = remainingArgs.slice(1).join(" ");
        } else {
          // All remaining args are reason, use default duration
          reason = remainingArgs.join(" ");
        }
      }

      // Apply cooldown (mute)
      await muteUser(userId, durationMs);

      // Get user info
      const targetAlias = await getAlias(userId);
      const targetAliasEscaped = escapeMarkdownV2(targetAlias);
      const cooldownMinutes = Math.round(durationMs / 60000);

      logger.logModeration("cooldown_apply", ctx.from.id, userId, {
        durationMs,
        reason,
      });

      // Notify the target user
      const notificationText = `⏸️ You have been given a ${cooldownMinutes} minute cooldown by a moderator${
        reason ? ` for: ${reason}` : ""
      }\n\nYou will be able to send messages again after the cooldown expires.`;

      try {
        await ctx.telegram.sendMessage(userId, notificationText);
      } catch (err) {
        // Silently fail
      }

      // Confirm to moderator
      const reasonDisplay = reason ? ` \\(${escapeMarkdownV2(reason)}\\)` : "";
      ctx.reply(
        `⏸️ Applied ${cooldownMinutes}m cooldown to *${targetAliasEscaped}*${reasonDisplay}\\.`,
        { parse_mode: "MarkdownV2" }
      );
    } catch (err) {
      console.error("[cooldown] Error:", err);
      ctx.reply(
        escapeMarkdownV2(err.message || "❌ Could not apply cooldown."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });
}
