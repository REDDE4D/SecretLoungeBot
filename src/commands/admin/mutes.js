import { getAlias, muteUser, unmuteUser, findUserIdByAlias } from "../../users/index.js";
import { parseDuration } from "../utils/parsers.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["mute", "m", "unmute", "um"],
  category: "admin",
  roleRequired: "admin",
  description: "Mute or unmute users (supports bulk: /mute alice bob charlie 1h)",
  usage: "/mute <alias(es)|reply> [duration] or /unmute <alias(es)|reply>",
  showInMenu: false,
};

// Store pending confirmations
const pendingBulkMutes = new Map();

export function register(bot) {
  // Mute handler
  bot.command(["mute", "m"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);

      if (args.length === 0) {
        return ctx.reply("❌ Usage: /mute <alias(es)> [duration] or reply to message");
      }

      // Check if replying to a message (single user mute)
      const isReply = ctx.message.reply_to_message != null;

      if (isReply) {
        // Single user mute via reply (existing logic)
        const userId = await resolveTargetUser(ctx, null);
        const durationStr = args[0];
        let durationMs = parseDuration(durationStr);

        if (durationStr && !durationMs) {
          return ctx.reply(
            escapeMarkdownV2("❌ Invalid duration. Use formats like `10m`, `1h`, `2d`."),
            { parse_mode: "MarkdownV2" }
          );
        }

        await muteUser(userId, durationMs);
        const aliasRaw = await getAlias(userId);
        const aliasEscaped = escapeMarkdownV2(aliasRaw);

        return ctx.reply(`🔇 User *${aliasEscaped}* has been muted.`, {
          parse_mode: "MarkdownV2",
        });
      }

      // Parse aliases and duration from args
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
        return ctx.reply("❌ No aliases provided. Usage: /mute <alias(es)> [duration]");
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
        await muteUser(userId, durationMs);
        const duration = durationStr || "permanent";
        const aliasEscaped = escapeMarkdownV2(resolvedAlias);

        logger.logModeration("mute", ctx.from.id, userId, { duration });
        return ctx.reply(`🔇 User *${aliasEscaped}* has been muted.`, {
          parse_mode: "MarkdownV2",
        });
      }

      // Multiple users - require confirmation
      const confirmationId = `bulk_mute_${Date.now()}_${ctx.from.id}`;
      pendingBulkMutes.set(confirmationId, {
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
      const message = `⚠️ Bulk Mute Confirmation\n\nYou are about to mute ${successful.length} user(s) for ${duration}:\n\n${userList}${failedList}\n\nConfirm this action?`;

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
      logger.error("Mute command error", { error: err.message, stack: err.stack });
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not process mute command."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Unmute handler (supports bulk)
  bot.command(["unmute", "um"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);

      if (args.length === 0) {
        return ctx.reply("❌ Usage: /unmute <alias(es)> or reply to message");
      }

      // Check if replying to a message (single user unmute)
      const isReply = ctx.message.reply_to_message != null;

      if (isReply) {
        const userId = await resolveTargetUser(ctx, null);
        await unmuteUser(userId);
        const aliasRaw = await getAlias(userId);
        const aliasEscaped = escapeMarkdownV2(aliasRaw);

        return ctx.reply(`🔊 User *${aliasEscaped}* has been unmuted.`, {
          parse_mode: "MarkdownV2",
        });
      }

      // Bulk unmute by aliases
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

      // Process all unmutes
      const results = await Promise.allSettled(
        successful.map(async (user) => {
          await unmuteUser(user.userId);
          return user.resolvedAlias;
        })
      );

      const unmuted = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      const failedUnmutes = results
        .filter((r) => r.status === "rejected")
        .map((r, i) => ({ alias: successful[i].resolvedAlias, reason: r.reason.message }));

      let message = `✅ Successfully unmuted ${unmuted.length} user(s):\n${unmuted.map((a) => `• ${a}`).join("\n")}`;

      if (failedUnmutes.length > 0) {
        message += `\n\n❌ Failed to unmute:\n${failedUnmutes.map((f) => `• ${f.alias}: ${f.reason}`).join("\n")}`;
      }

      if (failed.length > 0) {
        message += `\n\n⚠️ Could not resolve:\n${failed.map((f) => `• ${f.alias}`).join("\n")}`;
      }

      logger.logModeration(
        "bulk_unmute",
        ctx.from.id,
        null,
        {
          count: unmuted.length,
          userIds: successful.map((u) => u.userId),
        }
      );

      ctx.reply(message);
    } catch (err) {
      logger.error("Unmute command error", { error: err.message, stack: err.stack });
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not process unmute command."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Callback handler for bulk mute confirmation
  bot.action(/^(confirm|cancel)_bulk_mute_/, async (ctx) => {
    try {
      const callbackData = ctx.callbackQuery.data;
      const action = callbackData.startsWith("confirm") ? "confirm" : "cancel";
      const confirmationId = callbackData.replace(/^(confirm|cancel)_/, "");

      const pending = pendingBulkMutes.get(confirmationId);

      if (!pending) {
        await ctx.answerCbQuery("⏱️ This confirmation has expired.");
        await ctx.editMessageText("⏱️ Bulk mute confirmation expired.");
        return;
      }

      // Check expiry
      if (Date.now() > pending.expiresAt) {
        pendingBulkMutes.delete(confirmationId);
        await ctx.answerCbQuery("⏱️ This confirmation has expired.");
        await ctx.editMessageText("⏱️ Bulk mute confirmation expired.");
        return;
      }

      // Verify the user clicking is the admin who initiated
      if (String(ctx.from.id) !== String(pending.adminId)) {
        await ctx.answerCbQuery("❌ Only the initiating admin can confirm this action.");
        return;
      }

      if (action === "cancel") {
        pendingBulkMutes.delete(confirmationId);
        await ctx.answerCbQuery("✅ Bulk mute cancelled.");
        await ctx.editMessageText("❌ Bulk mute cancelled.");
        return;
      }

      // Execute bulk mutes
      await ctx.answerCbQuery("⏳ Processing bulk mutes...");
      await ctx.editMessageText("⏳ Processing bulk mutes...");

      const results = await Promise.allSettled(
        pending.users.map(async (user) => {
          await muteUser(user.userId, pending.durationMs);
          return user.resolvedAlias;
        })
      );

      const muted = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      const failedMutes = results
        .filter((r) => r.status === "rejected")
        .map((r, i) => ({
          alias: pending.users[i].resolvedAlias,
          reason: r.reason.message,
        }));

      let message = `✅ Successfully muted ${muted.length} user(s) for ${pending.durationStr}:\n${muted.map((a) => `• ${a}`).join("\n")}`;

      if (failedMutes.length > 0) {
        message += `\n\n❌ Failed to mute:\n${failedMutes.map((f) => `• ${f.alias}: ${f.reason}`).join("\n")}`;
      }

      logger.logModeration(
        "bulk_mute",
        pending.adminId,
        null,
        {
          count: muted.length,
          duration: pending.durationStr,
          userIds: pending.users.map((u) => u.userId),
        }
      );

      pendingBulkMutes.delete(confirmationId);
      await ctx.editMessageText(message);
    } catch (err) {
      logger.error("Bulk mute callback error", { error: err.message, stack: err.stack });
      await ctx.answerCbQuery("❌ An error occurred.");
      await ctx.editMessageText(`❌ Error processing bulk mute: ${err.message}`);
    }
  });

  // Cleanup expired confirmations every minute
  setInterval(() => {
    const now = Date.now();
    for (const [id, data] of pendingBulkMutes.entries()) {
      if (now > data.expiresAt) {
        pendingBulkMutes.delete(id);
      }
    }
  }, 60000);
}
