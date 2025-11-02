import { getAlias, banUser, unbanUser, findUserIdByAlias } from "../../users/index.js";
import { parseDuration } from "../utils/parsers.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["ban", "b", "unban", "ub"],
  category: "admin",
  roleRequired: "admin",
  description: "Ban or unban users (supports bulk: /ban alice bob charlie 7d)",
  usage: "/ban <alias(es)|reply> [duration] or /unban <alias(es)|reply>",
  showInMenu: false,
};

// Store pending confirmations
const pendingBulkBans = new Map();

export function register(bot) {
  // Ban handler
  bot.command(["ban", "b"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);

      if (args.length === 0) {
        return ctx.reply("❌ Usage: /ban <alias(es)> [duration] or reply to message(s)");
      }

      // Check if replying to a message (single user ban)
      const isReply = ctx.message.reply_to_message != null;

      if (isReply) {
        // Single user ban via reply (existing logic)
        const userId = await resolveTargetUser(ctx, null);
        const durationStr = args[0];
        let durationMs = parseDuration(durationStr);

        if (durationStr && !durationMs) {
          return ctx.reply(
            escapeMarkdownV2("❌ Invalid duration. Use formats like `10m`, `1h`, `2d`."),
            { parse_mode: "MarkdownV2" }
          );
        }

        await banUser(userId, durationMs);
        const aliasRaw = await getAlias(userId);
        const aliasEscaped = escapeMarkdownV2(aliasRaw);
        const duration = escapeMarkdownV2(durationStr || "permanent");

        return ctx.reply(`✅ Banned *${aliasEscaped}* for *${duration}*`, {
          parse_mode: "MarkdownV2",
        });
      }

      // Parse aliases and duration from args
      // Duration pattern: ends with m/h/d or is a number
      const durationPattern = /^\d+[mhd]?$/i;

      let aliases = [];
      let durationStr = null;

      for (const arg of args) {
        if (durationPattern.test(arg) && !durationStr) {
          durationStr = arg;
        } else {
          aliases.push(arg);
        }
      }

      if (aliases.length === 0) {
        return ctx.reply("❌ No aliases provided. Usage: /ban <alias(es)> [duration]");
      }

      // Resolve all aliases to user IDs
      const resolutions = await Promise.allSettled(
        aliases.map(async (alias) => {
          const userId = await findUserIdByAlias(alias);
          if (!userId) throw new Error(`Alias "${alias}" not found`);
          const userAlias = await getAlias(userId);
          return { alias, userId, resolvedAlias: userAlias };
        })
      );

      const successful = resolutions
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      const failed = resolutions
        .filter((r) => r.status === "rejected")
        .map((r, i) => ({ alias: aliases[i], reason: r.reason.message }));

      if (successful.length === 0) {
        const errors = failed.map((f) => `• ${f.alias}: ${f.reason}`).join("\n");
        return ctx.reply(`❌ Failed to resolve any users:\n${errors}`);
      }

      // Parse duration
      let durationMs = parseDuration(durationStr);
      if (durationStr && !durationMs) {
        return ctx.reply(
          escapeMarkdownV2("❌ Invalid duration. Use formats like `10m`, `1h`, `2d`."),
          { parse_mode: "MarkdownV2" }
        );
      }

      // Single user - execute immediately
      if (successful.length === 1) {
        const { userId, resolvedAlias } = successful[0];
        await banUser(userId, durationMs);
        const duration = durationStr || "permanent";
        const aliasEscaped = escapeMarkdownV2(resolvedAlias);
        const durationEscaped = escapeMarkdownV2(duration);

        logger.logModeration(ctx.from.id, "ban", userId, { duration });
        return ctx.reply(`✅ Banned *${aliasEscaped}* for *${durationEscaped}*`, {
          parse_mode: "MarkdownV2",
        });
      }

      // Multiple users - require confirmation
      const confirmationId = `bulk_ban_${Date.now()}_${ctx.from.id}`;
      pendingBulkBans.set(confirmationId, {
        users: successful,
        durationMs,
        durationStr: durationStr || "permanent",
        adminId: ctx.from.id,
        expiresAt: Date.now() + 60000, // 1 minute expiry
      });

      const userList = successful.map((u) => `• ${u.resolvedAlias}`).join("\n");
      const failedList = failed.length > 0
        ? `\n\n⚠️ Failed to resolve:\n${failed.map((f) => `• ${f.alias}`).join("\n")}`
        : "";

      const duration = durationStr || "permanent";
      const message = `⚠️ Bulk Ban Confirmation\n\nYou are about to ban ${successful.length} user(s) for ${duration}:\n\n${userList}${failedList}\n\nConfirm this action?`;

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Confirm", callback_data: `confirm_${confirmationId}` },
              { text: "❌ Cancel", callback_data: `cancel_${confirmationId}` },
            ],
          ],
        },
      });
    } catch (err) {
      logger.error("Ban command error", { error: err.message, stack: err.stack });
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not process ban command."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Unban handler (supports bulk)
  bot.command(["unban", "ub"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);

      if (args.length === 0) {
        return ctx.reply("❌ Usage: /unban <alias(es)> or reply to message");
      }

      // Check if replying to a message (single user unban)
      const isReply = ctx.message.reply_to_message != null;

      if (isReply) {
        const userId = await resolveTargetUser(ctx, null);
        await unbanUser(userId);
        const aliasRaw = await getAlias(userId);
        const aliasEscaped = escapeMarkdownV2(aliasRaw);

        return ctx.reply(`✅ User *${aliasEscaped}* has been unbanned.`, {
          parse_mode: "MarkdownV2",
        });
      }

      // Bulk unban by aliases
      const aliases = args;

      // Resolve all aliases to user IDs
      const resolutions = await Promise.allSettled(
        aliases.map(async (alias) => {
          const userId = await findUserIdByAlias(alias);
          if (!userId) throw new Error(`Alias "${alias}" not found`);
          const userAlias = await getAlias(userId);
          return { alias, userId, resolvedAlias: userAlias };
        })
      );

      const successful = resolutions
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      const failed = resolutions
        .filter((r) => r.status === "rejected")
        .map((r, i) => ({ alias: aliases[i], reason: r.reason.message }));

      if (successful.length === 0) {
        const errors = failed.map((f) => `• ${f.alias}: ${f.reason}`).join("\n");
        return ctx.reply(`❌ Failed to resolve any users:\n${errors}`);
      }

      // Process all unbans
      const results = await Promise.allSettled(
        successful.map(async (user) => {
          await unbanUser(user.userId);
          return user.resolvedAlias;
        })
      );

      const unbanned = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      const failedUnbans = results
        .filter((r) => r.status === "rejected")
        .map((r, i) => ({ alias: successful[i].resolvedAlias, reason: r.reason.message }));

      let message = `✅ Successfully unbanned ${unbanned.length} user(s):\n${unbanned.map((a) => `• ${a}`).join("\n")}`;

      if (failedUnbans.length > 0) {
        message += `\n\n❌ Failed to unban:\n${failedUnbans.map((f) => `• ${f.alias}: ${f.reason}`).join("\n")}`;
      }

      if (failed.length > 0) {
        message += `\n\n⚠️ Could not resolve:\n${failed.map((f) => `• ${f.alias}`).join("\n")}`;
      }

      logger.logModeration(ctx.from.id, "unban", successful.map((u) => u.userId).join(", "), {
        count: unbanned.length,
      });

      ctx.reply(message);
    } catch (err) {
      logger.error("Unban command error", { error: err.message, stack: err.stack });
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not process unban command."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Callback handler for bulk ban confirmation
  bot.action(/^(confirm|cancel)_bulk_ban_/, async (ctx) => {
    try {
      const callbackData = ctx.callbackQuery.data;
      const action = callbackData.startsWith("confirm") ? "confirm" : "cancel";
      const confirmationId = callbackData.replace(/^(confirm|cancel)_/, "");

      const pending = pendingBulkBans.get(confirmationId);

      if (!pending) {
        await ctx.answerCbQuery("⏱️ This confirmation has expired.");
        await ctx.editMessageText("⏱️ Bulk ban confirmation expired.");
        return;
      }

      // Check expiry
      if (Date.now() > pending.expiresAt) {
        pendingBulkBans.delete(confirmationId);
        await ctx.answerCbQuery("⏱️ This confirmation has expired.");
        await ctx.editMessageText("⏱️ Bulk ban confirmation expired.");
        return;
      }

      // Verify the user clicking is the admin who initiated
      if (String(ctx.from.id) !== String(pending.adminId)) {
        await ctx.answerCbQuery("❌ Only the initiating admin can confirm this action.");
        return;
      }

      if (action === "cancel") {
        pendingBulkBans.delete(confirmationId);
        await ctx.answerCbQuery("✅ Bulk ban cancelled.");
        await ctx.editMessageText("❌ Bulk ban cancelled.");
        return;
      }

      // Execute bulk bans
      await ctx.answerCbQuery("⏳ Processing bulk bans...");
      await ctx.editMessageText("⏳ Processing bulk bans...");

      const results = await Promise.allSettled(
        pending.users.map(async (user) => {
          await banUser(user.userId, pending.durationMs);
          return user.resolvedAlias;
        })
      );

      const banned = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      const failedBans = results
        .filter((r) => r.status === "rejected")
        .map((r, i) => ({
          alias: pending.users[i].resolvedAlias,
          reason: r.reason.message,
        }));

      let message = `✅ Successfully banned ${banned.length} user(s) for ${pending.durationStr}:\n${banned.map((a) => `• ${a}`).join("\n")}`;

      if (failedBans.length > 0) {
        message += `\n\n❌ Failed to ban:\n${failedBans.map((f) => `• ${f.alias}: ${f.reason}`).join("\n")}`;
      }

      logger.logModeration(pending.adminId, "bulk_ban", pending.users.map((u) => u.userId).join(", "), {
        count: banned.length,
        duration: pending.durationStr,
      });

      pendingBulkBans.delete(confirmationId);
      await ctx.editMessageText(message);
    } catch (err) {
      logger.error("Bulk ban callback error", { error: err.message, stack: err.stack });
      await ctx.answerCbQuery("❌ An error occurred.");
      await ctx.editMessageText(`❌ Error processing bulk ban: ${err.message}`);
    }
  });

  // Cleanup expired confirmations every minute
  setInterval(() => {
    const now = Date.now();
    for (const [id, data] of pendingBulkBans.entries()) {
      if (now > data.expiresAt) {
        pendingBulkBans.delete(id);
      }
    }
  }, 60000);
}
