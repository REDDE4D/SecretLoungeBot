import { getAlias, setRole } from "../../users/index.js";
import { escapeHTML, formatError, formatWarning, formatInfo } from "../../utils/sanitize.js";
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
      // Show deprecation notice
      const deprecationNotice = `<b>⚠️ DEPRECATED ⚠️</b>

This command is deprecated and will be removed in a future version.

<b>Please use the new role commands:</b>
• <code>/setrole @user admin</code> - Promote to admin
• <code>/setrole @user mod</code> - Promote to moderator
• <code>/removerole @user</code> - Remove role
• <code>/clearroles @user</code> - Remove all roles

Type <code>/help</code> for more information.

<i>Continuing with legacy command...</i>`;

      await ctx.reply(deprecationNotice, { parse_mode: "HTML" });

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
        return ctx.reply(
          formatError("Please specify a valid role: admin or mod", "Invalid Usage"),
          { parse_mode: "HTML" }
        );
      }

      const result = await setRole(userId, roleName);

      logger.logModeration("promote", ctx.from.id, userId, { role: roleName, deprecated: true });

      ctx.reply(escapeHTML(result), { parse_mode: "HTML" });
    } catch (err) {
      ctx.reply(
        formatError(err.message || "Could not resolve user."),
        { parse_mode: "HTML" }
      );
    }
  });

  // Demote handler
  bot.command("demote", async (ctx) => {
    try {
      // Show deprecation notice
      const deprecationNotice = `<b>⚠️ DEPRECATED ⚠️</b>

This command is deprecated and will be removed in a future version.

<b>Please use the new role commands:</b>
• <code>/removerole @user &lt;role&gt;</code> - Remove specific role
• <code>/clearroles @user</code> - Remove all roles
• <code>/setrole @user &lt;role&gt;</code> - Assign role

Type <code>/help</code> for more information.

<i>Continuing with legacy command...</i>`;

      await ctx.reply(deprecationNotice, { parse_mode: "HTML" });

      const args = ctx.message.text.trim().split(" ").slice(1);
      const aliasOrNothing = args[0];

      const userId = await resolveTargetUser(ctx, aliasOrNothing);
      const result = await setRole(userId, null);

      logger.logModeration("demote", ctx.from.id, userId, { deprecated: true });

      ctx.reply(escapeHTML(result), { parse_mode: "HTML" });
    } catch (err) {
      ctx.reply(
        formatError(err.message || "Could not resolve user."),
        { parse_mode: "HTML" }
      );
    }
  });
}
