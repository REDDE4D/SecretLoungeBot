import { getAlias, setRole } from "../../users/index.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["promote", "demote"],
  category: "admin",
  roleRequired: "admin",
  description: "Promote or demote users",
  usage: "/promote <alias|reply> admin|mod or /demote <alias|reply>",
  showInMenu: false,
};

export function register(bot) {
  // Promote handler
  bot.command("promote", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);

      // First arg might be alias or role (if replying)
      const aliasOrRole = args[0];

      // Try to resolve user (by alias or reply)
      const userId = await resolveTargetUser(ctx, aliasOrRole);

      // Determine where role parameter is
      // If we used alias, args[1] is role
      // If we used reply, args[0] is role
      const hasAlias = aliasOrRole && aliasOrRole.trim().length > 0;
      const roleName = hasAlias ? args[1] : args[0];

      if (!["admin", "mod"].includes(roleName)) {
        return ctx.reply("Usage: /promote <alias|reply> admin|mod");
      }

      const result = await setRole(userId, roleName);

      logger.logModeration("promote", ctx.from.id, userId, { role: roleName });

      ctx.reply(escapeMarkdownV2(result), { parse_mode: "MarkdownV2" });
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });

  // Demote handler
  bot.command("demote", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const aliasOrNothing = args[0];

      const userId = await resolveTargetUser(ctx, aliasOrNothing);
      const result = await setRole(userId, null);

      logger.logModeration("demote", ctx.from.id, userId);

      ctx.reply(escapeMarkdownV2(result), { parse_mode: "MarkdownV2" });
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  });
}
