// src/commands/user/profile.js
import { User } from "../../models/User.js";
import { Activity } from "../../models/Activity.js";
import { getAlias, getIcon } from "../../users/index.js";
import { renderIconHTML } from "../../utils/sanitize.js";
import { isMod, isAdmin } from "../utils/permissions.js";
import { resolveTargetUser } from "../utils/resolvers.js";
import { formatTimeAgo, formatTimeRemaining } from "../../utils/timeFormat.js";
import { getUserAchievements, getAchievementStats } from "../../services/achievementService.js";
import { getKarmaEmoji } from "../../services/karmaService.js";

export const meta = {
  commands: ["profile"],
  category: "user",
  roleRequired: null,
  description: "View user profile and stats",
  usage: "/profile [alias|reply]",
  showInMenu: true,
};

export function register(bot) {
  bot.command("profile", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const targetAlias = args[0];
      const viewerId = String(ctx.from.id);

      let targetUserId;

      // If no alias/reply provided, show own profile
      // If alias or reply provided, resolve target user
      if (!targetAlias && !ctx.message?.reply_to_message) {
        targetUserId = viewerId;
      } else {
        try {
          targetUserId = await resolveTargetUser(ctx, targetAlias);
        } catch (err) {
          // If resolution fails, check if user wants their own profile
          if (!targetAlias && !ctx.message?.reply_to_message) {
            targetUserId = viewerId;
          } else {
            return ctx.reply(err.message || "❌ Could not find user. Reply to a message or provide an alias.");
          }
        }
      }

      // Get user data
      const user = await User.findById(targetUserId).lean();
      if (!user) {
        return ctx.reply("❌ User not registered.");
      }

      const activity = await Activity.findOne({ userId: targetUserId }).lean();
      const icon = await getIcon(targetUserId);
      const alias = await getAlias(targetUserId);

      // Check if viewer is mod/admin to show restricted info
      const isModOrAdmin = (await isMod(viewerId)) || (await isAdmin(viewerId));

      // Build profile message
      let message = `${renderIconHTML(icon)} <b>${alias}</b>\n\n`;

      // Tenure information
      if (activity?.firstSeen) {
        const daysInLobby = Math.floor((Date.now() - activity.firstSeen.getTime()) / (1000 * 60 * 60 * 24));
        const joinDate = activity.firstSeen.toISOString().split("T")[0];
        message += `📅 <b>Joined:</b> ${joinDate} (${daysInLobby} days ago)\n`;
      }

      // Activity status
      if (activity) {
        const statusEmoji = {
          online: "🟢",
          idle: "🟡",
          offline: "⚫",
        };
        message += `${statusEmoji[activity.status] || "❓"} <b>Status:</b> ${activity.status || "unknown"}\n`;

        if (activity.lastActive) {
          const timeAgo = formatTimeAgo(activity.lastActive);
          message += `⏰ <b>Last active:</b> ${timeAgo}\n`;
        }
      }

      message += `\n📊 <b>STATISTICS</b>\n`;

      // Message stats
      const totalMessages = activity?.totalMessages || 0;
      const totalReplies = activity?.totalReplies || 0;
      const totalTextMessages = activity?.totalTextMessages || 0;
      const totalMediaMessages = activity?.totalMediaMessages || 0;

      message += `💬 <b>Total messages:</b> ${totalMessages}\n`;
      message += `↩️ <b>Replies:</b> ${totalReplies}\n`;
      message += `📝 <b>Text messages:</b> ${totalTextMessages}\n`;
      message += `📸 <b>Media messages:</b> ${totalMediaMessages}\n`;

      // Karma (only show if significant - high or negative)
      const karma = user.karma || 0;
      if (karma >= 50 || karma <= -10) {
        const karmaEmoji = getKarmaEmoji(karma);
        const karmaDisplay = karmaEmoji ? `${karmaEmoji} ` : "";
        message += `⚖️ <b>Karma:</b> ${karmaDisplay}${karma}\n`;
      }

      // Leaderboard rank
      const rank = await calculateRank(targetUserId);
      if (rank) {
        message += `\n🏆 <b>Leaderboard rank:</b> #${rank}\n`;
      }

      // Achievements
      const achievements = await getUserAchievements(targetUserId);
      const achievementStats = await getAchievementStats(targetUserId);

      if (achievements.length > 0) {
        message += `\n🎖️ <b>Achievements (${achievementStats.earned}/${achievementStats.total}):</b>\n`;

        // Show latest 5 achievements
        const latestAchievements = achievements.slice(0, 5);
        for (const achievement of latestAchievements) {
          message += `${achievement.icon} ${achievement.name}\n`;
        }

        if (achievements.length > 5) {
          message += `<i>... and ${achievements.length - 5} more</i>\n`;
        }

        message += `\n💯 <b>Achievement Points:</b> ${achievementStats.points}\n`;
      } else {
        message += `\n🎖️ <b>Achievements:</b> None yet - send messages to unlock achievements!\n`;
      }

      // Moderation info (only visible to mods/admins or viewing own profile)
      if (isModOrAdmin || targetUserId === viewerId) {
        message += `\n🛡️ <b>MODERATION</b>\n`;
        message += `⚠️ <b>Warnings:</b> ${user.warnings || 0}/3\n`;

        if (user.role) {
          message += `👑 <b>Role:</b> ${user.role}\n`;
        }

        if (user.bannedUntil) {
          const bannedUntil = user.bannedUntil.getTime();
          if (bannedUntil > Date.now()) {
            const timeLeft = formatTimeRemaining(user.bannedUntil);
            message += `🚫 <b>Banned:</b> ${timeLeft} remaining\n`;
          } else {
            message += `🚫 <b>Banned:</b> Permanent\n`;
          }
        }

        if (user.mutedUntil && user.mutedUntil.getTime() > Date.now()) {
          const timeLeft = formatTimeRemaining(user.mutedUntil);
          message += `🔇 <b>Muted:</b> ${timeLeft} remaining\n`;
        }

        if (user.mediaRestricted) {
          message += `📵 <b>Media restricted</b>\n`;
        }

        if (user.inLobby === false) {
          message += `🚪 <b>Not in lobby</b>\n`;
        }
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (err) {
      console.error("Error showing profile:", err);
      await ctx.reply("❌ Error loading profile.");
    }
  });
}

/**
 * Calculate user's rank on the leaderboard based on total messages
 */
async function calculateRank(userId) {
  try {
    const userActivity = await Activity.findOne({ userId }).lean();
    if (!userActivity || !userActivity.totalMessages) return null;

    const totalMessages = userActivity.totalMessages;

    // Count how many users have more messages
    const higherCount = await Activity.countDocuments({
      totalMessages: { $gt: totalMessages },
    });

    return higherCount + 1;
  } catch (err) {
    console.error("Error calculating rank:", err);
    return null;
  }
}


