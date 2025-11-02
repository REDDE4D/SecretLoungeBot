// src/commands/user/tenure.js
import { Activity } from "../../models/Activity.js";
import { User } from "../../models/User.js";
import { getAlias, getIcon } from "../../users/index.js";
import { renderIconHTML } from "../../utils/sanitize.js";

export const meta = {
  commands: ["tenure"],
  category: "user",
  roleRequired: null,
  description: "View your lobby tenure",
  usage: "/tenure",
  showInMenu: true,
};

export function register(bot) {
  bot.command("tenure", async (ctx) => {
    try {
      const userId = String(ctx.from.id);

      // Get user and activity data
      const user = await User.findById(userId).lean();
      if (!user) {
        return ctx.reply("❌ You must be registered to use this command. Use /register <alias>");
      }

      const activity = await Activity.findOne({ userId }).lean();
      if (!activity || !activity.firstSeen) {
        return ctx.reply("❌ No activity data found.");
      }

      const alias = await getAlias(userId);
      const icon = await getIcon(userId);

      const joinDate = activity.firstSeen;
      const now = new Date();

      // Calculate tenure
      const daysInLobby = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksInLobby = Math.floor(daysInLobby / 7);
      const monthsInLobby = Math.floor(daysInLobby / 30);
      const yearsInLobby = Math.floor(daysInLobby / 365);

      // Format join date
      const joinDateStr = joinDate.toISOString().split("T")[0];
      const joinTimeStr = joinDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      let message = `${renderIconHTML(icon)} <b>${alias}</b>\n\n`;
      message += `📅 <b>Joined:</b> ${joinDateStr} at ${joinTimeStr}\n\n`;

      message += `🕰️ <b>TENURE</b>\n`;

      if (yearsInLobby > 0) {
        message += `🎂 ${yearsInLobby} year${yearsInLobby > 1 ? "s" : ""}\n`;
      }
      if (monthsInLobby > 0 && yearsInLobby === 0) {
        message += `📆 ${monthsInLobby} month${monthsInLobby > 1 ? "s" : ""}\n`;
      }
      if (weeksInLobby > 0 && monthsInLobby === 0) {
        message += `📅 ${weeksInLobby} week${weeksInLobby > 1 ? "s" : ""}\n`;
      }
      message += `⏳ ${daysInLobby} day${daysInLobby !== 1 ? "s" : ""} total\n`;

      // Tenure milestones
      const milestone = getTenureMilestone(daysInLobby);
      if (milestone) {
        message += `\n${milestone}`;
      }

      // Show stats summary
      if (activity.totalMessages) {
        message += `\n\n📊 <b>QUICK STATS</b>\n`;
        message += `💬 ${activity.totalMessages} total messages\n`;

        const avgPerDay = (activity.totalMessages / Math.max(1, daysInLobby)).toFixed(1);
        message += `📈 ${avgPerDay} messages/day average\n`;
      }

      // Show next milestone
      const nextMilestone = getNextMilestone(daysInLobby);
      if (nextMilestone) {
        message += `\n🎯 <b>Next milestone:</b> ${nextMilestone.name} in ${nextMilestone.daysLeft} day${nextMilestone.daysLeft !== 1 ? "s" : ""}`;
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (err) {
      console.error("Error showing tenure:", err);
      await ctx.reply("❌ Error loading tenure information.");
    }
  });
}

/**
 * Get tenure milestone message
 */
function getTenureMilestone(days) {
  if (days === 0) return "🆕 <b>Welcome to the lobby!</b>";
  if (days === 1) return "🎉 <b>You've been here for a day!</b>";
  if (days === 7) return "🎊 <b>One week milestone!</b>";
  if (days === 14) return "🎉 <b>Two weeks in the lobby!</b>";
  if (days === 30) return "🎂 <b>One month anniversary!</b>";
  if (days === 90) return "🎖️ <b>Three months strong!</b>";
  if (days === 180) return "💎 <b>Half a year milestone!</b>";
  if (days === 365) return "🏆 <b>ONE YEAR ANNIVERSARY!</b>";

  // Multi-year milestones
  const years = Math.floor(days / 365);
  if (days % 365 === 0 && years > 1) {
    return `🎂🎉 <b>${years} YEAR${years > 1 ? "S" : ""} ANNIVERSARY!</b>`;
  }

  return null;
}

/**
 * Calculate next milestone
 */
function getNextMilestone(currentDays) {
  const milestones = [
    { days: 7, name: "1 Week" },
    { days: 14, name: "2 Weeks" },
    { days: 30, name: "1 Month" },
    { days: 60, name: "2 Months" },
    { days: 90, name: "3 Months" },
    { days: 180, name: "6 Months" },
    { days: 365, name: "1 Year" },
    { days: 730, name: "2 Years" },
  ];

  for (const milestone of milestones) {
    if (currentDays < milestone.days) {
      return {
        name: milestone.name,
        daysLeft: milestone.days - currentDays,
      };
    }
  }

  // If past all milestones, show next year anniversary
  const years = Math.floor(currentDays / 365) + 1;
  const nextAnniversary = years * 365;
  return {
    name: `${years} Year${years > 1 ? "s" : ""}`,
    daysLeft: nextAnniversary - currentDays,
  };
}
