import { getAlias, addWarning, clearWarnings, banUser } from "../../users/index.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["warn", "clearwarns"],
  category: "mod",
  roleRequired: ["mod", "admin"],
  description: "Issue warnings or clear warnings",
  usage: "/warn <alias|reply> or /clearwarns <alias|reply>",
  showInMenu: false,
};

export function register(bot) {
  // Warn handler
  bot.command("warn", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const alias = args[0];

      const userId = await resolveTargetUser(ctx, alias);
      const warnCount = await addWarning(userId);
      const aliasRaw = await getAlias(userId);
      const aliasEscaped = escapeMarkdownV2(aliasRaw);

      logger.logModeration("warn", ctx.from.id, userId, { warnCount });

      ctx.reply(`⚠️ Warning issued to *${aliasEscaped}*. (${warnCount}/3)`, {
        parse_mode: "MarkdownV2",
      });

      // Auto-ban on 3 warnings
      if (warnCount >= 3) {
        await banUser(userId);
        logger.logModeration("auto_ban", ctx.from.id, userId, { reason: "3 warnings" });
        ctx.reply(
          `❌ User *${aliasEscaped}* has been permanently banned (3 warnings).`,
          { parse_mode: "MarkdownV2" }
        );
      }
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Clear warnings handler
  bot.command("clearwarns", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const alias = args[0];

      const userId = await resolveTargetUser(ctx, alias);
      await clearWarnings(userId);
      const aliasRaw = await getAlias(userId);
      const aliasEscaped = escapeMarkdownV2(aliasRaw);

      logger.logModeration("clear_warnings", ctx.from.id, userId);

      ctx.reply(`🧽 Warnings cleared for *${aliasEscaped}*.`, {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });
}
