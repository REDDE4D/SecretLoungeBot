// src/commands/user/karma.js
import { User } from "../../models/User.js";
import { getAlias, getIcon } from "../../users/index.js";
import { renderIconHTML, escapeHTML } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import {
  getKarmaStats,
  getKarmaLeaderboard,
  getKarmaEmoji,
} from "../../services/karmaService.js";

export const meta = {
  commands: ["karma", "karmatop"],
  category: "user",
  roleRequired: null,
  description: "View karma stats and leaderboard",
  usage: "/karma [alias|reply] - View karma stats\n/karmatop - View karma leaderboard",
  showInMenu: true,
};

export function register(bot) {
  // /karma command - View karma stats
  bot.command("karma", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const targetAlias = args[0];
      const viewerId = String(ctx.from.id);

      let targetUserId;

      // If no alias/reply provided, show own karma
      // If alias or reply provided, resolve target user
      if (!targetAlias && !ctx.message?.reply_to_message) {
        targetUserId = viewerId;
      } else {
        try {
          targetUserId = await resolveTargetUser(ctx, targetAlias);
        } catch (err) {
          // If resolution fails, check if user wants their own karma
          if (!targetAlias && !ctx.message?.reply_to_message) {
            targetUserId = viewerId;
          } else {
            return ctx.reply(
              err.message ||
                "❌ Could not find user. Reply to a message or provide an alias."
            );
          }
        }
      }

      // Get user data
      const user = await User.findById(targetUserId).lean();
      if (!user || !user.alias) {
        return ctx.reply("❌ User not registered.");
      }

      // Get karma stats
      const stats = await getKarmaStats(targetUserId);
      if (!stats) {
        return ctx.reply("❌ Failed to retrieve karma stats.");
      }

      const icon = await getIcon(targetUserId);
      const alias = await getAlias(targetUserId);
      const isOwnKarma = targetUserId === viewerId;

      // Build karma message
      let message = `${renderIconHTML(icon)} <b>${escapeHTML(alias)}</b>\n\n`;

      // Karma display with emoji
      const karmaDisplay =
        stats.emoji !== ""
          ? `${stats.emoji} <b>${stats.karma}</b>`
          : `<b>${stats.karma}</b>`;
      message += `⚖️ <b>Karma:</b> ${karmaDisplay}\n`;
      message += `📊 <b>Rank:</b> #${stats.rank}\n`;
      message += `📈 <b>Level:</b> ${stats.level}\n\n`;

      // Karma received/given stats
      message += `📥 <b>Karma Received:</b> ${stats.receivedCount} times\n`;
      message += `📤 <b>Karma Given:</b> ${stats.givenCount} times\n`;

      // Daily remaining (only for own karma)
      if (isOwnKarma) {
        message += `\n💫 <b>Daily Karma Remaining:</b> ${stats.dailyRemaining}/10\n`;
      }

      // Top karma givers (who gave this user karma)
      if (stats.topGivers.length > 0) {
        message += `\n🎁 <b>Top Karma Givers:</b>\n`;
        for (const giver of stats.topGivers) {
          const giverAlias = await getAlias(giver._id);
          const sign = giver.total >= 0 ? "+" : "";
          message += `  • ${escapeHTML(giverAlias)}: ${sign}${giver.total} (${giver.count}×)\n`;
        }
      }

      // Top karma receivers (who this user gave karma to)
      if (stats.topReceivers.length > 0) {
        message += `\n🎯 <b>Top Karma Recipients:</b>\n`;
        for (const receiver of stats.topReceivers) {
          const receiverAlias = await getAlias(receiver._id);
          const sign = receiver.total >= 0 ? "+" : "";
          message += `  • ${escapeHTML(receiverAlias)}: ${sign}${receiver.total} (${receiver.count}×)\n`;
        }
      }

      // How to give karma (only for own karma)
      if (isOwnKarma) {
        message += `\n💡 <b>How to give karma:</b>\n`;
        message += `Reply to a message with: +1, -1, 👍, 👎, thanks, or helpful\n`;
        message += `Cooldown: 24h per user • Limit: 10 per day`;
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error in /karma command:", error);
      await ctx.reply("❌ An error occurred while retrieving karma stats.");
    }
  });

  // /karmatop command - Karma leaderboard
  bot.command("karmatop", async (ctx) => {
    try {
      const leaderboard = await getKarmaLeaderboard(10);

      if (leaderboard.length === 0) {
        return ctx.reply("📊 No karma data available yet.");
      }

      let message = `🏆 <b>KARMA LEADERBOARD</b>\n\n`;

      for (const entry of leaderboard) {
        const medal =
          entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : "  ";
        const emojiDisplay = entry.emoji ? `${entry.emoji} ` : "";
        message += `${medal} <b>#${entry.rank}</b> ${emojiDisplay}${escapeHTML(entry.alias)}: <b>${entry.karma}</b>\n`;
      }

      message += `\n💬 Use /karma to view detailed stats`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error in /karmatop command:", error);
      await ctx.reply("❌ An error occurred while retrieving the leaderboard.");
    }
  });
}
