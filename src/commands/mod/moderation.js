import { getAlias, addWarning, clearWarnings, getWarnings, removeWarning, banUser } from "../../users/index.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["warn", "clearwarns", "warnings", "removewarning"],
  category: "mod",
  roleRequired: ["mod", "admin"],
  description: "Issue warnings, view warnings, or clear warnings",
  usage: "/warn <alias|reply> [reason] | /warnings [alias|reply] | /removewarning <warningId> | /clearwarns <alias|reply>",
  showInMenu: false,
};

export function register(bot) {
  // Warn handler
  bot.command("warn", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const alias = args[0];
      const reason = args.slice(1).join(" ") || null;

      const userId = await resolveTargetUser(ctx, alias);
      const issuerAlias = await getAlias(ctx.from.id);
      const warnCount = await addWarning(userId, ctx.from.id, issuerAlias, reason);
      const aliasRaw = await getAlias(userId);
      const aliasEscaped = escapeMarkdownV2(aliasRaw);

      logger.logModeration("warn", ctx.from.id, userId, { warnCount, reason });

      let message = `⚠️ Warning issued to *${aliasEscaped}*\\. (${warnCount}/3)`;
      if (reason) {
        message += `\nReason: ${escapeMarkdownV2(reason)}`;
      }

      ctx.reply(message, {
        parse_mode: "MarkdownV2",
      });

      // Auto-ban on 3 warnings
      if (warnCount >= 3) {
        await banUser(userId);
        logger.logModeration("auto_ban", ctx.from.id, userId, { reason: "3 warnings" });
        ctx.reply(
          `❌ User *${aliasEscaped}* has been permanently banned (3 warnings)\\.`,
          { parse_mode: "MarkdownV2" }
        );
      }
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // View warnings handler
  bot.command("warnings", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const alias = args[0];

      // If no alias provided and not a reply, show error
      const userId = await resolveTargetUser(ctx, alias);
      const warnings = await getWarnings(userId);
      const aliasRaw = await getAlias(userId);
      const aliasEscaped = escapeMarkdownV2(aliasRaw);

      if (warnings.length === 0) {
        ctx.reply(`ℹ️ *${aliasEscaped}* has no warnings\\.`, {
          parse_mode: "MarkdownV2",
        });
        return;
      }

      let message = `⚠️ *Warnings for ${aliasEscaped}* (${warnings.length}):\n\n`;
      warnings.forEach((warning, index) => {
        const date = new Date(warning.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        message += `${index + 1}\\. *ID:* \`${warning._id}\`\n`;
        message += `   *Issued by:* ${escapeMarkdownV2(warning.issuedByAlias)}\n`;
        message += `   *Date:* ${escapeMarkdownV2(date)}\n`;
        if (warning.reason) {
          message += `   *Reason:* ${escapeMarkdownV2(warning.reason)}\n`;
        }
        message += "\n";
      });

      message += `_Use /removewarning <ID> to remove a specific warning_`;

      ctx.reply(message, {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Remove specific warning handler
  bot.command("removewarning", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const warningId = args[0];

      if (!warningId) {
        ctx.reply("❌ Please provide a warning ID\\. Use /warnings to view warning IDs\\.", {
          parse_mode: "MarkdownV2",
        });
        return;
      }

      const result = await removeWarning(warningId);
      const aliasRaw = await getAlias(result.userId);
      const aliasEscaped = escapeMarkdownV2(aliasRaw);

      logger.logModeration("remove_warning", ctx.from.id, result.userId, {
        warningId,
        remainingCount: result.remainingCount
      });

      ctx.reply(
        `✅ Warning removed for *${aliasEscaped}*\\. Remaining warnings: ${result.remainingCount}`,
        {
          parse_mode: "MarkdownV2",
        }
      );
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not remove warning."), {
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

      ctx.reply(`🧽 All warnings cleared for *${aliasEscaped}*\\.`, {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });
}
