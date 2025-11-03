import { getAlias, kickUser, findUserIdByAlias } from "../../users/index.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["kick", "k"],
  category: "admin",
  roleRequired: "admin",
  description: "Remove user(s) from lobby (supports bulk: /kick alice bob charlie)",
  usage: "/kick <alias(es)|reply>",
  showInMenu: false,
};

// Store pending confirmations
const pendingBulkKicks = new Map();

export function register(bot) {
  const handler = async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);

      if (args.length === 0 && !ctx.message.reply_to_message) {
        return ctx.reply("❌ Usage: /kick <alias(es)> or reply to message");
      }

      // Check if replying to a message (single user kick)
      const isReply = ctx.message.reply_to_message != null;

      if (isReply) {
        const userId = await resolveTargetUser(ctx, null);
        await kickUser(userId);
        const aliasRaw = await getAlias(userId);
        const aliasEscaped = escapeMarkdownV2(aliasRaw);

        logger.logModeration("kick", ctx.from.id, userId);
        return ctx.reply(`👢 Kicked *${aliasEscaped}* from lobby.`, {
          parse_mode: "MarkdownV2",
        });
      }

      // Parse aliases
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

      // Single user - execute immediately
      if (successful.length === 1) {
        const { userId, resolvedAlias } = successful[0];
        await kickUser(userId);
        const aliasEscaped = escapeMarkdownV2(resolvedAlias);

        logger.logModeration("kick", ctx.from.id, userId);
        return ctx.reply(`👢 Kicked *${aliasEscaped}* from lobby.`, {
          parse_mode: "MarkdownV2",
        });
      }

      // Multiple users - require confirmation
      const confirmationId = `bulk_kick_${Date.now()}_${ctx.from.id}`;
      pendingBulkKicks.set(confirmationId, {
        users: successful,
        adminId: ctx.from.id,
        expiresAt: Date.now() + 60000, // 1 minute expiry
      });

      const userList = successful.map((u) => `• ${u.resolvedAlias}`).join("\n");
      const failedList = failed.length > 0
        ? `\n\n⚠️ Failed to resolve:\n${failed.map((f) => `• ${f.alias}`).join("\n")}`
        : "";

      const message = `⚠️ Bulk Kick Confirmation\n\nYou are about to kick ${successful.length} user(s) from lobby:\n\n${userList}${failedList}\n\nConfirm this action?`;

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
      logger.error("Kick command error", { error: err.message, stack: err.stack });
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not process kick command."), {
        parse_mode: "MarkdownV2",
      });
    }
  };

  bot.command("kick", handler);
  bot.command("k", handler);

  // Callback handler for bulk kick confirmation
  bot.action(/^(confirm|cancel)_bulk_kick_/, async (ctx) => {
    try {
      const callbackData = ctx.callbackQuery.data;
      const action = callbackData.startsWith("confirm") ? "confirm" : "cancel";
      const confirmationId = callbackData.replace(/^(confirm|cancel)_/, "");

      const pending = pendingBulkKicks.get(confirmationId);

      if (!pending) {
        await ctx.answerCbQuery("⏱️ This confirmation has expired.");
        await ctx.editMessageText("⏱️ Bulk kick confirmation expired.");
        return;
      }

      // Check expiry
      if (Date.now() > pending.expiresAt) {
        pendingBulkKicks.delete(confirmationId);
        await ctx.answerCbQuery("⏱️ This confirmation has expired.");
        await ctx.editMessageText("⏱️ Bulk kick confirmation expired.");
        return;
      }

      // Verify the user clicking is the admin who initiated
      if (String(ctx.from.id) !== String(pending.adminId)) {
        await ctx.answerCbQuery("❌ Only the initiating admin can confirm this action.");
        return;
      }

      if (action === "cancel") {
        pendingBulkKicks.delete(confirmationId);
        await ctx.answerCbQuery("✅ Bulk kick cancelled.");
        await ctx.editMessageText("❌ Bulk kick cancelled.");
        return;
      }

      // Execute bulk kicks
      await ctx.answerCbQuery("⏳ Processing bulk kicks...");
      await ctx.editMessageText("⏳ Processing bulk kicks...");

      const results = await Promise.allSettled(
        pending.users.map(async (user) => {
          await kickUser(user.userId);
          return user.resolvedAlias;
        })
      );

      const kicked = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      const failedKicks = results
        .filter((r) => r.status === "rejected")
        .map((r, i) => ({
          alias: pending.users[i].resolvedAlias,
          reason: r.reason.message,
        }));

      let message = `✅ Successfully kicked ${kicked.length} user(s) from lobby:\n${kicked.map((a) => `• ${a}`).join("\n")}`;

      if (failedKicks.length > 0) {
        message += `\n\n❌ Failed to kick:\n${failedKicks.map((f) => `• ${f.alias}: ${f.reason}`).join("\n")}`;
      }

      logger.logModeration(
        "bulk_kick",
        pending.adminId,
        null,
        {
          count: kicked.length,
          userIds: pending.users.map((u) => u.userId),
        }
      );

      pendingBulkKicks.delete(confirmationId);
      await ctx.editMessageText(message);
    } catch (err) {
      logger.error("Bulk kick callback error", { error: err.message, stack: err.stack });
      await ctx.answerCbQuery("❌ An error occurred.");
      await ctx.editMessageText(`❌ Error processing bulk kick: ${err.message}`);
    }
  });

  // Cleanup expired confirmations every minute
  setInterval(() => {
    const now = Date.now();
    for (const [id, data] of pendingBulkKicks.entries()) {
      if (now > data.expiresAt) {
        pendingBulkKicks.delete(id);
      }
    }
  }, 60000);
}
