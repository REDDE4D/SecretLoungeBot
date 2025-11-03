// src/commands/admin/stats.js
import { User } from "../../models/User.js";
import { Activity } from "../../models/Activity.js";
import RelayedMessage from "../../models/RelayedMessage.js";
import AuditLog from "../../models/AuditLog.js";
import { findUserIdByAlias, getAlias } from "../../users/index.js";
import { escapeHTML } from "../../utils/sanitize.js";
import { formatTimeAgo } from "../../utils/timeFormat.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["stats", "statistics"],
  category: "admin",
  roleRequired: ["admin"],
  description: "View lobby statistics and analytics",
  usage: "/stats, /stats user <alias>, /stats period <day|week|month>",
  showInMenu: false,
};

// Simple in-memory cache with 5-minute TTL
const statsCache = {
  overall: { data: null, timestamp: 0 },
  periods: {},
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(cacheEntry) {
  return cacheEntry.data && Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

/**
 * Get overall lobby statistics
 */
async function getOverallStats() {
  // Check cache
  if (isCacheValid(statsCache.overall)) {
    return statsCache.overall.data;
  }

  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Parallel queries for performance
  const [
    totalUsers,
    lobbyMembers,
    totalMessages,
    messagesToday,
    messagesThisWeek,
    messagesThisMonth,
    textMessages,
    mediaMessages,
    topContributors,
    recentActivity,
    moderationStats,
  ] = await Promise.all([
    // Total registered users
    User.countDocuments(),

    // Active lobby members
    User.countDocuments({ inLobby: true }),

    // Total messages ever
    RelayedMessage.estimatedDocumentCount(),

    // Messages today
    RelayedMessage.countDocuments({ relayedAt: { $gte: oneDayAgo } }),

    // Messages this week
    RelayedMessage.countDocuments({ relayedAt: { $gte: oneWeekAgo } }),

    // Messages this month
    RelayedMessage.countDocuments({ relayedAt: { $gte: oneMonthAgo } }),

    // Text messages
    RelayedMessage.countDocuments({ type: "text" }),

    // Media messages
    RelayedMessage.countDocuments({ type: { $ne: "text" } }),

    // Top 5 contributors by message count (last 30 days)
    Activity.find({ "totalMessages": { $gt: 0 } })
      .sort({ totalMessages: -1 })
      .limit(5)
      .lean(),

    // Recent activity status
    Activity.countDocuments({ status: { $in: ["online", "idle"] } }),

    // Moderation action counts (last 30 days)
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: oneMonthAgo } } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Get aliases for top contributors
  const contributorIds = topContributors.map((a) => a.userId);
  const contributorAliases = await Promise.all(
    contributorIds.map((id) => getAlias(id))
  );

  const topContributorsWithAliases = topContributors.map((contrib, idx) => ({
    alias: contributorAliases[idx],
    messages: contrib.totalMessages,
  }));

  // Calculate percentages
  const textPercent =
    totalMessages > 0 ? ((textMessages / totalMessages) * 100).toFixed(1) : 0;
  const mediaPercent =
    totalMessages > 0 ? ((mediaMessages / totalMessages) * 100).toFixed(1) : 0;

  // Format moderation stats
  const modActions = moderationStats.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const stats = {
    users: {
      total: totalUsers,
      inLobby: lobbyMembers,
      lobbyPercent: totalUsers > 0 ? ((lobbyMembers / totalUsers) * 100).toFixed(1) : 0,
    },
    messages: {
      total: totalMessages,
      today: messagesToday,
      thisWeek: messagesThisWeek,
      thisMonth: messagesThisMonth,
      text: textMessages,
      media: mediaMessages,
      textPercent,
      mediaPercent,
    },
    activity: {
      activeNow: recentActivity,
      topContributors: topContributorsWithAliases,
    },
    moderation: modActions,
  };

  // Cache the result
  statsCache.overall = {
    data: stats,
    timestamp: Date.now(),
  };

  return stats;
}

/**
 * Get user-specific statistics
 */
async function getUserStats(userId) {
  const [user, activity, userMessages, userAuditLogs] = await Promise.all([
    User.findById(userId).lean(),
    Activity.findOne({ userId }).lean(),
    RelayedMessage.countDocuments({ originalUserId: userId }),
    AuditLog.countDocuments({ targetUserId: userId }),
  ]);

  if (!user) {
    return null;
  }

  const alias = user.alias || "Unknown";
  const joinedAgo = user.createdAt ? formatTimeAgo(user.createdAt) : "Unknown";

  return {
    alias,
    userId,
    inLobby: user.inLobby,
    role: user.role || "user",
    joinedAgo,
    createdAt: user.createdAt,
    messages: {
      total: activity?.totalMessages || 0,
      text: activity?.totalTextMessages || 0,
      media: activity?.totalMediaMessages || 0,
      replies: activity?.totalReplies || 0,
    },
    messagesRelayed: userMessages, // Messages sent by this user
    status: activity?.status || "offline",
    lastActive: activity?.lastActive ? formatTimeAgo(activity.lastActive) : "Never",
    moderationActions: userAuditLogs, // Times this user was moderated
    warnings: user.warnings || 0,
    isMuted: user.mutedUntil && user.mutedUntil > new Date(),
    isBanned: user.bannedUntil && user.bannedUntil > new Date(),
    mediaRestricted: user.mediaRestricted || false,
  };
}

/**
 * Get time-period statistics
 */
async function getPeriodStats(period) {
  // Check cache
  const cacheKey = period;
  if (
    statsCache.periods[cacheKey] &&
    isCacheValid(statsCache.periods[cacheKey])
  ) {
    return statsCache.periods[cacheKey].data;
  }

  const now = new Date();
  let startDate;

  switch (period) {
    case "day":
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case "week":
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000);
  }

  const [messages, newUsers, moderationActions, topUsers] = await Promise.all([
    // Messages in period
    RelayedMessage.countDocuments({ relayedAt: { $gte: startDate } }),

    // New user registrations
    User.countDocuments({ createdAt: { $gte: startDate } }),

    // Moderation actions in period
    AuditLog.countDocuments({ createdAt: { $gte: startDate } }),

    // Top users by message count in period
    RelayedMessage.aggregate([
      { $match: { relayedAt: { $gte: startDate } } },
      { $group: { _id: "$originalUserId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  // Get aliases for top users
  const topUserIds = topUsers.map((u) => u._id);
  const topUserAliases = await Promise.all(
    topUserIds.map((id) => getAlias(id))
  );

  const topUsersWithAliases = topUsers.map((user, idx) => ({
    alias: topUserAliases[idx],
    messages: user.count,
  }));

  const stats = {
    period,
    startDate,
    messages,
    newUsers,
    moderationActions,
    topUsers: topUsersWithAliases,
  };

  // Cache the result
  if (!statsCache.periods[cacheKey]) {
    statsCache.periods[cacheKey] = { data: null, timestamp: 0 };
  }
  statsCache.periods[cacheKey] = {
    data: stats,
    timestamp: Date.now(),
  };

  return stats;
}

/**
 * Format overall stats for display
 */
function formatOverallStats(stats) {
  let message = "📊 <b>LOBBY STATISTICS</b>\n\n";

  // Users
  message += "<b>👥 Users</b>\n";
  message += `  Total Registered: <b>${stats.users.total}</b>\n`;
  message += `  In Lobby: <b>${stats.users.inLobby}</b> (${stats.users.lobbyPercent}%)\n`;
  message += `  Active Now: <b>${stats.activity.activeNow}</b>\n\n`;

  // Messages
  message += "<b>💬 Messages</b>\n";
  message += `  Total: <b>${stats.messages.total.toLocaleString()}</b>\n`;
  message += `  Today: <b>${stats.messages.today}</b>\n`;
  message += `  This Week: <b>${stats.messages.thisWeek}</b>\n`;
  message += `  This Month: <b>${stats.messages.thisMonth}</b>\n\n`;

  message += "<b>📝 Message Types</b>\n";
  message += `  Text: <b>${stats.messages.text.toLocaleString()}</b> (${stats.messages.textPercent}%)\n`;
  message += `  Media: <b>${stats.messages.media.toLocaleString()}</b> (${stats.messages.mediaPercent}%)\n\n`;

  // Top contributors
  if (stats.activity.topContributors.length > 0) {
    message += "<b>🏆 Top Contributors (All Time)</b>\n";
    stats.activity.topContributors.forEach((contrib, idx) => {
      message += `  ${idx + 1}. ${escapeHTML(contrib.alias)} - <b>${contrib.messages}</b> messages\n`;
    });
    message += "\n";
  }

  // Moderation stats
  const modCount = Object.keys(stats.moderation).length;
  if (modCount > 0) {
    message += "<b>🛡️ Moderation Actions (Last 30 Days)</b>\n";
    const sortedMod = Object.entries(stats.moderation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedMod.forEach(([action, count]) => {
      message += `  ${action}: <b>${count}</b>\n`;
    });
  }

  return message;
}

/**
 * Format user stats for display
 */
function formatUserStats(stats) {
  let message = `📊 <b>USER STATISTICS</b>\n\n`;
  message += `<b>User:</b> ${escapeHTML(stats.alias)}\n`;
  message += `<b>Status:</b> ${stats.status}\n`;
  message += `<b>Role:</b> ${stats.role}\n`;
  message += `<b>In Lobby:</b> ${stats.inLobby ? "Yes" : "No"}\n`;
  message += `<b>Joined:</b> ${stats.joinedAgo}\n`;
  message += `<b>Last Active:</b> ${stats.lastActive}\n\n`;

  message += `<b>💬 Messages</b>\n`;
  message += `  Total: <b>${stats.messages.total}</b>\n`;
  message += `  Text: <b>${stats.messages.text}</b>\n`;
  message += `  Media: <b>${stats.messages.media}</b>\n`;
  message += `  Replies: <b>${stats.messages.replies}</b>\n\n`;

  message += `<b>📤 Messages Relayed:</b> <b>${stats.messagesRelayed}</b>\n\n`;

  if (stats.warnings > 0 || stats.moderationActions > 0) {
    message += `<b>🛡️ Moderation</b>\n`;
    message += `  Warnings: <b>${stats.warnings}</b>/3\n`;
    message += `  Times Moderated: <b>${stats.moderationActions}</b>\n`;
    if (stats.isMuted) message += `  <i>Currently Muted</i>\n`;
    if (stats.isBanned) message += `  <i>Currently Banned</i>\n`;
    if (stats.mediaRestricted) message += `  <i>Media Restricted</i>\n`;
  }

  return message;
}

/**
 * Format period stats for display
 */
function formatPeriodStats(stats) {
  const periodName = stats.period.charAt(0).toUpperCase() + stats.period.slice(1);

  let message = `📊 <b>STATISTICS - LAST ${periodName.toUpperCase()}</b>\n\n`;

  message += `<b>💬 Messages:</b> <b>${stats.messages}</b>\n`;
  message += `<b>👥 New Users:</b> <b>${stats.newUsers}</b>\n`;
  message += `<b>🛡️ Moderation Actions:</b> <b>${stats.moderationActions}</b>\n\n`;

  if (stats.topUsers.length > 0) {
    message += `<b>🏆 Top Contributors</b>\n`;
    stats.topUsers.forEach((user, idx) => {
      message += `  ${idx + 1}. ${escapeHTML(user.alias)} - <b>${user.messages}</b> messages\n`;
    });
  }

  return message;
}

export function register(bot) {
  bot.command(["stats", "statistics"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(/\s+/).slice(1);

      // No args: show overall stats
      if (args.length === 0) {
        const stats = await getOverallStats();
        const message = formatOverallStats(stats);
        return ctx.replyWithHTML(message);
      }

      const subcommand = args[0].toLowerCase();

      // User-specific stats: /stats user <alias>
      if (subcommand === "user") {
        if (!args[1]) {
          return ctx.reply("Usage: /stats user <alias>");
        }

        const alias = args.slice(1).join(" ");
        const userId = await findUserIdByAlias(alias);

        if (!userId) {
          return ctx.reply(`❌ User "${alias}" not found.`);
        }

        const stats = await getUserStats(userId);
        if (!stats) {
          return ctx.reply("❌ Could not retrieve user statistics.");
        }

        const message = formatUserStats(stats);
        return ctx.replyWithHTML(message);
      }

      // Period stats: /stats period <day|week|month>
      if (subcommand === "period") {
        const period = args[1]?.toLowerCase() || "day";

        if (!["day", "week", "month"].includes(period)) {
          return ctx.reply("Usage: /stats period <day|week|month>");
        }

        const stats = await getPeriodStats(period);
        const message = formatPeriodStats(stats);
        return ctx.replyWithHTML(message);
      }

      // Assume it's a period if it's day/week/month directly
      if (["day", "week", "month"].includes(subcommand)) {
        const stats = await getPeriodStats(subcommand);
        const message = formatPeriodStats(stats);
        return ctx.replyWithHTML(message);
      }

      // Unknown subcommand
      return ctx.reply(
        "📊 <b>STATISTICS USAGE</b>\n\n" +
          "<b>View overall statistics:</b>\n" +
          "/stats\n\n" +
          "<b>View user statistics:</b>\n" +
          "/stats user &lt;alias&gt;\n\n" +
          "<b>View period statistics:</b>\n" +
          "/stats period &lt;day|week|month&gt;\n" +
          "/stats day\n" +
          "/stats week\n" +
          "/stats month",
        { parse_mode: "HTML" }
      );
    } catch (err) {
      logger.error("Stats command error:", err);
      ctx.reply("❌ Error retrieving statistics.");
    }
  });
}
