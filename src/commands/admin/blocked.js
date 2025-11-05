import { User } from "../../models/User.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";

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

        const escapedCount = escapeMarkdownV2(result.deletedCount.toString());
        return ctx.reply(
          `🧹 Cleaned up ${escapedCount} blocked users from database\\.`,
          { parse_mode: "MarkdownV2" }
        );
      }

      // List all blocked users
      const blockedUsers = await User.find({ blockedBot: true })
        .sort({ blockedAt: -1 })
        .lean();

      if (blockedUsers.length === 0) {
        return ctx.reply("✅ No users have blocked the bot.", {
          parse_mode: "MarkdownV2",
        });
      }

      // Build message with blocked users list
      let message = `🚫 *Users Who Blocked Bot* \\(${escapeMarkdownV2(blockedUsers.length.toString())}\\)\n\n`;

      for (const user of blockedUsers) {
        const alias = escapeMarkdownV2(user.alias || "Unknown");
        const userId = escapeMarkdownV2(user._id);
        const blockedDate = user.blockedAt
          ? new Date(user.blockedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Unknown";
        const escapedDate = escapeMarkdownV2(blockedDate);

        message += `• ${alias} \\(\`${userId}\`\\)\n`;
        message += `  Blocked: ${escapedDate}\n`;

        // Check if they were in lobby when they blocked
        if (user.inLobby) {
          message += `  ⚠️ Still marked as in lobby \\(data inconsistency\\)\n`;
        }

        message += `\n`;
      }

      message += `\nUse \`/blocked cleanup\` to remove all blocked users from database\\.`;

      ctx.reply(message, { parse_mode: "MarkdownV2" });
    } catch (err) {
      console.error("Error in /blocked command:", err);
      ctx.reply("❌ Error retrieving blocked users. Check console for details.");
    }
  });
}
