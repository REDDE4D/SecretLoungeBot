import { getAlias, getAllAliases, restrictMedia, unrestrictMedia } from "../../users/index.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["restrictmedia", "rm", "unrestrictmedia", "urm", "debugmedia", "debuglist", "debugcopy"],
  category: "admin",
  roleRequired: "admin",
  description: "Manage media restrictions and debug relayed media",
  usage: "/restrictmedia <alias|reply> or /debugmedia [count]",
  showInMenu: false,
};

export function register(bot) {
  // Restrict media handler
  bot.command(["restrictmedia", "rm"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const alias = args[0];

      const userId = await resolveTargetUser(ctx, alias);
      await restrictMedia(userId);
      const aliasRaw = await getAlias(userId);
      const aliasEscaped = escapeMarkdownV2(aliasRaw);

      logger.logModeration("restrict_media", ctx.from.id, userId);

      ctx.reply(`📵 *${aliasEscaped}* is now restricted from sending media.`, {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Unrestrict media handler
  bot.command(["unrestrictmedia", "urm"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const alias = args[0];

      const userId = await resolveTargetUser(ctx, alias);
      await unrestrictMedia(userId);
      const aliasRaw = await getAlias(userId);
      const aliasEscaped = escapeMarkdownV2(aliasRaw);

      logger.logModeration("unrestrict_media", ctx.from.id, userId);

      ctx.reply(`📨 *${aliasEscaped}* can now send media again.`, {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Debug media handler - shows recent media with links
  bot.command("debugmedia", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const count = Math.max(1, Math.min(50, parseInt(parts[1] || "10", 10) || 10));

    const { default: RelayedMessage } = await import("../../models/RelayedMessage.js");
    const items = await RelayedMessage.find({ type: { $ne: "text" } })
      .sort({ relayedAt: -1, _id: -1 })
      .limit(count);

    if (!items.length) {
      return ctx.reply(escapeMarkdownV2("📂 No media found."), {
        parse_mode: "MarkdownV2",
      });
    }

    const header = escapeMarkdownV2(`📂 Latest ${items.length} media:`);
    await ctx.reply(header, { parse_mode: "MarkdownV2" });

    for (const it of items) {
      try {
        const alias = await getAlias(it.userId || it.chatId || "");
        const lines = [];
        lines.push(`• Type: ${it.type}`);
        if (alias) lines.push(`• To: ${alias}`);
        lines.push(`• Message: ${it.messageId}`);
        if (it.caption) lines.push(`• Caption: ${it.caption}`);

        if (it.fileId) {
          try {
            const url = await ctx.telegram.getFileLink(it.fileId);
            lines.push(`• Link: ${url.toString()}`);
          } catch (e) {
            lines.push(`• Link: (failed to resolve)`);
          }
        } else {
          lines.push(`• Link: (no fileId)`);
        }

        // Send plain text to avoid MarkdownV2 URL escaping issues
        await ctx.reply(lines.join("\n"));
      } catch (e) {
        await ctx.reply(`(error) ${e.message}`);
      }
    }
  });

  // Debug list handler - compact list without links
  bot.command("debuglist", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const count = Math.max(1, Math.min(50, parseInt(parts[1] || "10", 10) || 10));

    const { default: RelayedMessage } = await import("../../models/RelayedMessage.js");
    const items = await RelayedMessage.find({ type: { $ne: "text" } })
      .sort({ relayedAt: -1, _id: -1 })
      .limit(count);

    if (!items.length) {
      return ctx.reply(escapeMarkdownV2("📂 No media found."), {
        parse_mode: "MarkdownV2",
      });
    }

    // Batch fetch all aliases to avoid N+1 query
    const userIds = [...new Set(items.map(it => it.userId || it.chatId).filter(Boolean))];
    const aliasMap = await getAllAliases(userIds);

    const header = escapeMarkdownV2(`📂 Latest ${items.length} media (list):`);
    await ctx.reply(header, { parse_mode: "MarkdownV2" });

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const userId = it.userId || it.chatId || "";
      const alias = aliasMap.get(userId) || "";
      const line = [
        `#${i + 1}`,
        `type=${it.type}`,
        `to=${alias || it.chatId || it.userId}`,
        `msg=${it.messageId}`,
        it.albumId ? `album=${it.albumId}` : null,
        it.caption
          ? `caption="${it.caption.substring(0, 60)}${it.caption.length > 60 ? "…" : ""}"`
          : null,
        it.fileId ? `(has file_id)` : `(no file_id)`,
        `at=${new Date(it.relayedAt).toLocaleString()}`,
      ]
        .filter(Boolean)
        .join(" | ");

      await ctx.reply(escapeMarkdownV2(line), { parse_mode: "MarkdownV2" });
    }
  });

  // Debug copy handler - copy past message to admin
  bot.command("debugcopy", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const chatId = parts[1];
    const messageId = Number(parts[2]);

    if (!chatId || !messageId) {
      return ctx.reply(
        escapeMarkdownV2("Usage: /debugcopy <chatId> <messageId>"),
        { parse_mode: "MarkdownV2" }
      );
    }

    try {
      await ctx.telegram.copyMessage(ctx.from.id, chatId, messageId);
      await ctx.reply(escapeMarkdownV2("✅ Copied."), {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      await ctx.reply(escapeMarkdownV2(`❌ ${err.message}`), {
        parse_mode: "MarkdownV2",
      });
    }
  });
}
