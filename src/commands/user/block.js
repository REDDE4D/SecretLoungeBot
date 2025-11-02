// src/commands/user/block.js
import Block from "../../models/Block.js";
import { getAlias } from "../../users/index.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["block", "unblock", "blocklist"],
  category: "user",
  roleRequired: null,
  description: "Block/unblock users",
  usage: "/block <alias|reply>, /unblock <alias|reply>, /blocklist",
  showInMenu: true,
};

export function register(bot) {
  // Block command
  bot.command("block", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const args = ctx.message.text.trim().split(" ").slice(1);
      const aliasOrNothing = args[0];

      // Resolve target user
      const targetUserId = await resolveTargetUser(ctx, aliasOrNothing);

      // Prevent self-blocking
      if (targetUserId === userId) {
        return ctx.reply(
          escapeMarkdownV2("❌ You cannot block yourself."),
          { parse_mode: "MarkdownV2" }
        );
      }

      // Check if already blocked
      const existingBlock = await Block.findOne({
        userId,
        blockedUserId: targetUserId,
      });

      if (existingBlock) {
        const targetAlias = await getAlias(targetUserId);
        return ctx.reply(
          escapeMarkdownV2(`❌ You have already blocked ${targetAlias}.`),
          { parse_mode: "MarkdownV2" }
        );
      }

      // Create block
      await Block.create({
        userId,
        blockedUserId: targetUserId,
      });

      const targetAlias = await getAlias(targetUserId);
      logger.info("User blocked", { userId, blockedUserId: targetUserId, blockedAlias: targetAlias });

      ctx.reply(
        escapeMarkdownV2(`✅ You have blocked ${targetAlias}. You will no longer see their messages.`),
        { parse_mode: "MarkdownV2" }
      );
    } catch (err) {
      logger.error("Error in block command", { error: err.message, userId: ctx.from.id });
      ctx.reply(
        escapeMarkdownV2(err.message || "❌ Could not block user."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });

  // Unblock command
  bot.command("unblock", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const args = ctx.message.text.trim().split(" ").slice(1);
      const aliasOrNothing = args[0];

      // Resolve target user
      const targetUserId = await resolveTargetUser(ctx, aliasOrNothing);

      // Check if blocked
      const existingBlock = await Block.findOne({
        userId,
        blockedUserId: targetUserId,
      });

      if (!existingBlock) {
        const targetAlias = await getAlias(targetUserId);
        return ctx.reply(
          escapeMarkdownV2(`❌ You have not blocked ${targetAlias}.`),
          { parse_mode: "MarkdownV2" }
        );
      }

      // Remove block
      await Block.deleteOne({ userId, blockedUserId: targetUserId });

      const targetAlias = await getAlias(targetUserId);
      logger.info("User unblocked", { userId, unblockedUserId: targetUserId, unblockedAlias: targetAlias });

      ctx.reply(
        escapeMarkdownV2(`✅ You have unblocked ${targetAlias}. You will now see their messages.`),
        { parse_mode: "MarkdownV2" }
      );
    } catch (err) {
      logger.error("Error in unblock command", { error: err.message, userId: ctx.from.id });
      ctx.reply(
        escapeMarkdownV2(err.message || "❌ Could not unblock user."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });

  // Blocklist command
  bot.command("blocklist", async (ctx) => {
    try {
      const userId = String(ctx.from.id);

      // Get all blocks for this user
      const blocks = await Block.find({ userId }).sort({ createdAt: -1 });

      if (blocks.length === 0) {
        return ctx.reply(
          escapeMarkdownV2("📋 Your block list is empty."),
          { parse_mode: "MarkdownV2" }
        );
      }

      // Fetch aliases for all blocked users
      const blockedAliases = await Promise.all(
        blocks.map(async (block) => {
          try {
            const alias = await getAlias(block.blockedUserId);
            return `• ${alias}`;
          } catch (err) {
            return `• [User ${block.blockedUserId}]`;
          }
        })
      );

      const message = [
        `*📋 Blocked Users* \\(${blocks.length}\\)`,
        "",
        ...blockedAliases.map(a => escapeMarkdownV2(a)),
        "",
        escapeMarkdownV2("Use /unblock <alias> to unblock a user."),
      ].join("\n");

      ctx.reply(message, { parse_mode: "MarkdownV2" });
    } catch (err) {
      logger.error("Error in blocklist command", { error: err.message, userId: ctx.from.id });
      ctx.reply(
        escapeMarkdownV2("❌ Error retrieving your block list."),
        { parse_mode: "MarkdownV2" }
      );
    }
  });
}
