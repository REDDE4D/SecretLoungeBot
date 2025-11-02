// src/commands/user/leaderboard.js
import { Activity } from "../../models/Activity.js";
import { User } from "../../models/User.js";
import { getAlias, getIcon } from "../../users/index.js";
import { renderIconHTML } from "../../utils/sanitize.js";

export const meta = {
  commands: ["leaderboard", "top", "lb"],
  category: "user",
  roleRequired: null,
  description: "View top active users",
  usage: "/leaderboard [daily|weekly|alltime]",
  showInMenu: true,
};

export function register(bot) {
  const leaderboardHandler = async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const period = args[0]?.toLowerCase() || "alltime";

      if (!["daily", "weekly", "alltime"].includes(period)) {
        return ctx.reply(
          "Usage: /leaderboard [daily|weekly|alltime]\n\n" +
            "Examples:\n" +
            "/leaderboard daily - Today's top users\n" +
            "/leaderboard weekly - This week's top users\n" +
            "/leaderboard alltime - All-time top users"
        );
      }

      let leaderboard;
      let title;

      if (period === "daily") {
        leaderboard = await getDailyLeaderboard();
        title = "📊 DAILY LEADERBOARD (Today)";
      } else if (period === "weekly") {
        leaderboard = await getWeeklyLeaderboard();
        title = "📊 WEEKLY LEADERBOARD (Last 7 Days)";
      } else {
        leaderboard = await getAllTimeLeaderboard();
        title = "📊 ALL-TIME LEADERBOARD";
      }

      if (!leaderboard || leaderboard.length === 0) {
        return ctx.reply("📊 No activity data available yet.");
      }

      let message = `${title}\n\n`;

      for (let i = 0; i < Math.min(10, leaderboard.length); i++) {
        const entry = leaderboard[i];
        const rank = i + 1;
        const medal = getRankMedal(rank);
        const alias = await getAlias(entry.userId);
        const icon = await getIcon(entry.userId);

        message += `${medal} ${rank}. ${renderIconHTML(icon)} <b>${alias}</b>\n`;
        message += `   💬 ${entry.messages} message${entry.messages !== 1 ? "s" : ""}`;

        if (entry.media > 0) {
          message += `, 📸 ${entry.media} media`;
        }

        message += `\n\n`;
      }

      // Show user's own rank if not in top 10
      const userId = String(ctx.from.id);
      const userRank = leaderboard.findIndex((e) => e.userId === userId);

      if (userRank !== -1 && userRank >= 10) {
        const userEntry = leaderboard[userRank];
        const userAlias = await getAlias(userId);
        const userIcon = await getIcon(userId);

        message += `━━━━━━━━━━━━━━━━\n`;
        message += `<b>Your rank:</b> #${userRank + 1}\n`;
        message += `${renderIconHTML(userIcon)} ${userAlias}\n`;
        message += `💬 ${userEntry.messages} message${userEntry.messages !== 1 ? "s" : ""}`;
        if (userEntry.media > 0) {
          message += `, 📸 ${userEntry.media} media`;
        }
        message += `\n`;
      }

      message += `\n<i>Use /profile to see your full stats</i>`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (err) {
      console.error("Error showing leaderboard:", err);
      await ctx.reply("❌ Error loading leaderboard.");
    }
  };

  bot.command("leaderboard", leaderboardHandler);
  bot.command("top", leaderboardHandler);
  bot.command("lb", leaderboardHandler);
}

/**
 * Get all-time leaderboard based on total messages
 */
async function getAllTimeLeaderboard() {
  try {
    // Get all users in the lobby
    const lobbyUsers = await User.find({ inLobby: true }).lean();
    const lobbyUserIds = lobbyUsers.map((u) => u._id);

    // Get activities for lobby users only
    const activities = await Activity.find({
      userId: { $in: lobbyUserIds },
      totalMessages: { $gt: 0 },
    })
      .sort({ totalMessages: -1 })
      .lean();

    return activities.map((a) => ({
      userId: a.userId,
      messages: a.totalMessages || 0,
      media: a.totalMediaMessages || 0,
    }));
  } catch (err) {
    console.error("Error getting all-time leaderboard:", err);
    return [];
  }
}

/**
 * Get today's leaderboard based on media counts
 */
async function getDailyLeaderboard() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Get all users in the lobby
    const lobbyUsers = await User.find({ inLobby: true }).lean();
    const lobbyUserIds = lobbyUsers.map((u) => u._id);

    // Get activities for lobby users
    const activities = await Activity.find({
      userId: { $in: lobbyUserIds },
    }).lean();

    // Build leaderboard from daily media counts
    const leaderboard = [];

    for (const activity of activities) {
      const dailyMedia = activity.mediaCounts?.byDate?.get(today) || 0;

      // Approximate: assume roughly equal text/media distribution for daily totals
      // Since we only track media by date, we'll use media count as proxy for daily activity
      if (dailyMedia > 0) {
        leaderboard.push({
          userId: activity.userId,
          messages: dailyMedia, // Using media count as activity proxy
          media: dailyMedia,
        });
      }
    }

    // Sort by messages (media count proxy)
    leaderboard.sort((a, b) => b.messages - a.messages);

    return leaderboard;
  } catch (err) {
    console.error("Error getting daily leaderboard:", err);
    return [];
  }
}

/**
 * Get weekly leaderboard based on last 7 days of activity
 */
async function getWeeklyLeaderboard() {
  try {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().slice(0, 10));
    }

    // Get all users in the lobby
    const lobbyUsers = await User.find({ inLobby: true }).lean();
    const lobbyUserIds = lobbyUsers.map((u) => u._id);

    // Get activities for lobby users
    const activities = await Activity.find({
      userId: { $in: lobbyUserIds },
    }).lean();

    // Build leaderboard from weekly media counts
    const leaderboard = [];

    for (const activity of activities) {
      let weeklyMedia = 0;

      for (const date of dates) {
        weeklyMedia += activity.mediaCounts?.byDate?.get(date) || 0;
      }

      if (weeklyMedia > 0) {
        leaderboard.push({
          userId: activity.userId,
          messages: weeklyMedia, // Using media count as activity proxy
          media: weeklyMedia,
        });
      }
    }

    // Sort by messages (media count proxy)
    leaderboard.sort((a, b) => b.messages - a.messages);

    return leaderboard;
  } catch (err) {
    console.error("Error getting weekly leaderboard:", err);
    return [];
  }
}

/**
 * Get medal emoji for leaderboard rank
 */
function getRankMedal(rank) {
  const medals = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  };
  return medals[rank] || "  ";
}
