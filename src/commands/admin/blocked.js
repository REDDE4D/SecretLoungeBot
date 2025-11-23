import { User } from "../../models/User.js";
import { escapeHTML, formatError, formatSuccess, formatInfo } from "../../utils/sanitize.js";

export const meta = {
  commands: ["blocked"],
  category: "admin",
  roleRequired: "admin",
  description: "View and manage users who have blocked the bot",
  usage: "/blocked [cleanup]",
  showInMenu: true,
};

export function register(botInstance) {
  botInstance.command("blocked", async (ctx) => {
    try {
      const args = ctx.message.text.split(/\s+/).slice(1);
      const action = args[0]?.toLowerCase();

      if (action === "cleanup") {
        // Remove all blocked users from database
        const result = await User.deleteMany({ blockedBot: true });

        return ctx.reply(
          formatSuccess(
            `Cleaned up ${result.deletedCount} blocked users from database.`,
            "Cleanup Complete"
          ),
          { parse_mode: "HTML" }
        );
      }

      // List all blocked users
      const blockedUsers = await User.find({ blockedBot: true })
        .sort({ blockedAt: -1 })
        .lean();

      if (blockedUsers.length === 0) {
        return ctx.reply(
          formatSuccess("No users have blocked the bot.", "All Clear"),
          { parse_mode: "HTML" }
        );
      }

      // Build message with blocked users list
      let message = `<b>🚫 Users Who Blocked Bot (${blockedUsers.length})</b>\n\n`;

      for (const user of blockedUsers) {
        const alias = escapeHTML(user.alias || "Unknown");
        const userId = escapeHTML(user._id);
        const blockedDate = user.blockedAt
          ? new Date(user.blockedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Unknown";

        message += `• <b>${alias}</b> (<code>${userId}</code>)\n`;
        message += `  Blocked: ${blockedDate}\n`;

        // Check if they were in lobby when they blocked
        if (user.inLobby) {
          message += `  ⚠️ <i>Still marked as in lobby (data inconsistency)</i>\n`;
        }

        message += `\n`;
      }

      message += `\n<i>Use <code>/blocked cleanup</code> to remove all blocked users from database.</i>`;

      ctx.reply(message, { parse_mode: "HTML" });
    } catch (err) {
      console.error("Error in /blocked command:", err);
      ctx.reply(
        formatError("Could not retrieve blocked users. Check console for details."),
        { parse_mode: "HTML" }
      );
    }
  });
}
