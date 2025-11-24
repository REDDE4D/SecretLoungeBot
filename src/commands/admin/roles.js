import { getAlias, setRole } from "../../users/index.js";
import {
  escapeHTML,
  formatError,
  formatWarning,
  formatInfo,
} from "../../utils/sanitize.js";
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
      const isReply = ctx.message.reply_to_message != null;

      let userId;
      let roleName;

      if (isReply) {
        // Reply mode: first arg is role
        userId = await resolveTargetUser(ctx, null);
        roleName = args[0];
      } else {
        // Alias mode: first arg is alias, second is role
        const alias = args[0];
        userId = await resolveTargetUser(ctx, alias);
        roleName = args[1];
      }

      if (!["admin", "mod"].includes(roleName)) {
        return ctx.reply(
          formatError(
            "Please specify a valid role: admin or mod",
            "Invalid Usage"
          ),
          { parse_mode: "HTML" }
        );
      }

      const result = await setRole(userId, roleName);

      logger.logModeration("promote", ctx.from.id, userId, {
        role: roleName,
        deprecated: true,
      });

      ctx.reply(escapeHTML(result), { parse_mode: "HTML" });
    } catch (err) {
      ctx.reply(formatError(err.message || "Could not resolve user."), {
        parse_mode: "HTML",
      });
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
      const isReply = ctx.message.reply_to_message != null;

      let userId;

      if (isReply) {
        // Reply mode: no alias needed
        userId = await resolveTargetUser(ctx, null);
      } else {
        // Alias mode: first arg is alias
        const alias = args[0];
        userId = await resolveTargetUser(ctx, alias);
      }

      const result = await setRole(userId, null);

      logger.logModeration("demote", ctx.from.id, userId, { deprecated: true });

      ctx.reply(escapeHTML(result), { parse_mode: "HTML" });
    } catch (err) {
      ctx.reply(formatError(err.message || "Could not resolve user."), {
        parse_mode: "HTML",
      });
    }
  });
}
