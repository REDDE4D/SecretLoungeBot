// dashboard-api/services/statsService.js

import mongoose from "mongoose";

// Helper to get models safely (after they're registered)
const getUser = () => mongoose.model("User");
const getActivity = () => mongoose.model("Activity");
const getRelayedMessage = () => mongoose.model("RelayedMessage");
const getReport = () => mongoose.model("Report");
const getSpamDetection = () => mongoose.model("SpamDetection");
const getAuditLog = () => mongoose.model("AuditLog");

/**
 * Get dashboard overview statistics
 * @param {string} period - Time period: day, week, month
 * @returns {Promise<Object>} Overview statistics
 */
export async function getOverviewStats(period = "day") {
  const now = new Date();
  const startDate = getStartDate(now, period);

  // Run all queries in parallel for better performance
  const [
    userStats,
    messageStats,
    moderationStats,
    spamStats,
  ] = await Promise.all([
    getUserStats(startDate),
    getMessageStats(startDate),
    getModerationStats(startDate),
    getSpamStats(),
  ]);

  return {
    users: userStats,
    messages: messageStats,
    moderation: moderationStats,
    spam: spamStats,
  };
}

/**
 * Get user statistics
 * @param {Date} startDate - Start date for "new" user counts
 * @returns {Promise<Object>} User statistics
 */
async function getUserStats(startDate) {
  const User = getUser();
  const Activity = getActivity();

  const [total, inLobby, online, newUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ inLobby: true }),
    Activity.countDocuments({ status: "online" }),
    Activity.countDocuments({ firstSeen: { $gte: startDate } }),
  ]);

  return {
    total,
    inLobby,
    online,
    newToday: newUsers,
  };
}

/**
 * Get message statistics
 * @param {Date} startDate - Start date for message counts
 * @returns {Promise<Object>} Message statistics
 */
async function getMessageStats(startDate) {
  const Activity = getActivity();
  const RelayedMessage = getRelayedMessage();

  // Get total message count from Activity collection
  const totalMessagesResult = await Activity.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$totalMessages" },
        textCount: { $sum: "$totalTextMessages" },
        mediaCount: { $sum: "$totalMediaMessages" },
      },
    },
  ]);

  const totals = totalMessagesResult[0] || {
    total: 0,
    textCount: 0,
    mediaCount: 0,
  };

  // Count unique messages in the specified period (group by originalUserId + originalMsgId)
  const periodMessagesResult = await RelayedMessage.aggregate([
    {
      $match: {
        relayedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          userId: "$originalUserId",
          msgId: "$originalMsgId",
        },
      },
    },
    {
      $count: "total",
    },
  ]);
  const periodMessages = periodMessagesResult[0]?.total || 0;

  // Calculate this week's unique messages (for consistency with API spec)
  const weekStart = getStartDate(new Date(), "week");
  const thisWeekMessagesResult = await RelayedMessage.aggregate([
    {
      $match: {
        relayedAt: { $gte: weekStart },
      },
    },
    {
      $group: {
        _id: {
          userId: "$originalUserId",
          msgId: "$originalMsgId",
        },
      },
    },
    {
      $count: "total",
    },
  ]);
  const thisWeekMessages = thisWeekMessagesResult[0]?.total || 0;

  return {
    total: totals.total,
    today: periodMessages,
    thisWeek: thisWeekMessages,
    textCount: totals.textCount,
    mediaCount: totals.mediaCount,
  };
}

/**
 * Get moderation statistics
 * @param {Date} startDate - Start date for action counts
 * @returns {Promise<Object>} Moderation statistics
 */
async function getModerationStats(startDate) {
  const now = new Date();
  const Report = getReport();
  const AuditLog = getAuditLog();
  const User = getUser();

  const [pendingReports, actionsToday, activeBans, activeMutes] =
    await Promise.all([
      Report.countDocuments({ status: "pending" }),
      AuditLog.countDocuments({
        timestamp: { $gte: startDate },
        category: "moderation",
      }),
      User.countDocuments({
        bannedUntil: { $gt: now },
      }),
      User.countDocuments({
        mutedUntil: { $gt: now },
      }),
    ]);

  return {
    pendingReports,
    actionsToday,
    activeBans,
    activeMutes,
  };
}

/**
 * Get spam detection statistics
 * @returns {Promise<Object>} Spam statistics
 */
async function getSpamStats() {
  const now = new Date();
  const SpamDetection = getSpamDetection();

  // Count users with active spam tracking (violations in last 24 hours)
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  const trackedUsers = await SpamDetection.countDocuments({
    $or: [
      { "flood.lastViolation": { $gte: oneDayAgo } },
      { "linkSpam.lastViolation": { $gte: oneDayAgo } },
      { "rapidFire.lastViolation": { $gte: oneDayAgo } },
    ],
  });

  // Count users currently auto-muted by spam detection
  const autoMuted = await SpamDetection.countDocuments({
    autoMutedUntil: { $gt: now },
  });

  // Get total violations count
  const violationsResult = await SpamDetection.aggregate([
    {
      $group: {
        _id: null,
        totalViolations: {
          $sum: {
            $add: [
              "$flood.count",
              "$linkSpam.count",
              "$rapidFire.count",
            ],
          },
        },
      },
    },
  ]);

  const totalViolations = violationsResult[0]?.totalViolations || 0;

  return {
    trackedUsers,
    autoMuted,
    totalViolations,
  };
}

/**
 * Get detailed user statistics
 * @param {string} period - Time period: day, week, month
 * @returns {Promise<Object>} Detailed user statistics
 */
export async function getUsersStats(period = "day") {
  const now = new Date();
  const startDate = getStartDate(now, period);

  const [total, inLobby, registered, newUsers, activeUsers, onlineUsers] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ inLobby: true }),
      User.countDocuments({ alias: { $ne: null } }),
      Activity.countDocuments({ firstSeen: { $gte: startDate } }),
      Activity.countDocuments({ lastActive: { $gte: startDate } }),
      Activity.countDocuments({ status: "online" }),
    ]);

  // Get user growth over time (daily for last 30 days)
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const userGrowth = await Activity.aggregate([
    {
      $match: {
        firstSeen: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$firstSeen" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return {
    total,
    inLobby,
    registered,
    new: newUsers,
    active: activeUsers,
    online: onlineUsers,
    growth: userGrowth,
  };
}

/**
 * Get detailed message statistics
 * @param {string} period - Time period: day, week, month
 * @returns {Promise<Object>} Detailed message statistics
 */
export async function getMessagesStats(period = "day") {
  const now = new Date();
  const startDate = getStartDate(now, period);

  // Get message counts by type in the period
  const messagesByType = await RelayedMessage.aggregate([
    {
      $match: {
        relayedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

  // Count unique messages (by originalUserId + originalMsgId) to avoid duplicates
  const uniqueMessages = await RelayedMessage.aggregate([
    {
      $match: {
        relayedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          userId: "$originalUserId",
          msgId: "$originalMsgId",
        },
      },
    },
    {
      $count: "total",
    },
  ]);

  // Get message volume over time (hourly for last 24h, daily for last 30d)
  const isDay = period === "day";
  const timeFormat = isDay ? "%Y-%m-%d %H:00" : "%Y-%m-%d";
  const messageVolume = await RelayedMessage.aggregate([
    {
      $match: {
        relayedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          time: {
            $dateToString: { format: timeFormat, date: "$relayedAt" },
          },
          userId: "$originalUserId",
          msgId: "$originalMsgId",
        },
      },
    },
    {
      $group: {
        _id: "$_id.time",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Calculate totals from Activity collection for accuracy
  const totalsResult = await Activity.aggregate([
    {
      $group: {
        _id: null,
        totalMessages: { $sum: "$totalMessages" },
        totalReplies: { $sum: "$totalReplies" },
        totalTextMessages: { $sum: "$totalTextMessages" },
        totalMediaMessages: { $sum: "$totalMediaMessages" },
      },
    },
  ]);

  const totals = totalsResult[0] || {
    totalMessages: 0,
    totalReplies: 0,
    totalTextMessages: 0,
    totalMediaMessages: 0,
  };

  return {
    period: {
      total: uniqueMessages[0]?.total || 0,
      byType: messagesByType,
    },
    allTime: {
      total: totals.totalMessages,
      replies: totals.totalReplies,
      text: totals.totalTextMessages,
      media: totals.totalMediaMessages,
    },
    volume: messageVolume,
  };
}

/**
 * Get moderation statistics
 * @returns {Promise<Object>} Moderation statistics
 */
export async function getModerationStatistics() {
  const now = new Date();

  const [
    totalReports,
    pendingReports,
    resolvedReports,
    dismissedReports,
    activeBans,
    activeMutes,
    totalBans,
    totalMutes,
    totalWarnings,
    mediaRestricted,
  ] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: "resolved" }),
    Report.countDocuments({ status: "dismissed" }),
    User.countDocuments({ bannedUntil: { $gt: now } }),
    User.countDocuments({ mutedUntil: { $gt: now } }),
    User.countDocuments({ bannedUntil: { $ne: null } }),
    User.countDocuments({ mutedUntil: { $ne: null } }),
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$warnings" },
        },
      },
    ]),
    User.countDocuments({ mediaRestricted: true }),
  ]);

  // Get recent moderation actions from audit log
  const recentActions = await AuditLog.find({
    category: "moderation",
  })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

  return {
    reports: {
      total: totalReports,
      pending: pendingReports,
      resolved: resolvedReports,
      dismissed: dismissedReports,
    },
    restrictions: {
      activeBans,
      activeMutes,
      totalBans,
      totalMutes,
      mediaRestricted,
    },
    warnings: totalWarnings[0]?.total || 0,
    recentActions,
  };
}

/**
 * Get anti-spam statistics
 * @returns {Promise<Object>} Anti-spam statistics
 */
export async function getSpamStatistics() {
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  // Get all spam detection records with recent activity
  const spamRecords = await SpamDetection.find({
    $or: [
      { "flood.lastViolation": { $gte: oneDayAgo } },
      { "linkSpam.lastViolation": { $gte: oneDayAgo } },
      { "rapidFire.lastViolation": { $gte: oneDayAgo } },
      { autoMutedUntil: { $gt: now } },
    ],
  }).lean();

  // Aggregate statistics
  let totalViolations = 0;
  let floodViolations = 0;
  let linkSpamViolations = 0;
  let rapidFireViolations = 0;
  const autoMutedUsers = [];

  for (const record of spamRecords) {
    totalViolations +=
      (record.flood?.count || 0) +
      (record.linkSpam?.count || 0) +
      (record.rapidFire?.count || 0);
    floodViolations += record.flood?.count || 0;
    linkSpamViolations += record.linkSpam?.count || 0;
    rapidFireViolations += record.rapidFire?.count || 0;

    if (record.autoMutedUntil && record.autoMutedUntil > now) {
      autoMutedUsers.push({
        userId: record.userId,
        mutedUntil: record.autoMutedUntil,
      });
    }
  }

  return {
    trackedUsers: spamRecords.length,
    totalViolations,
    byType: {
      flood: floodViolations,
      linkSpam: linkSpamViolations,
      rapidFire: rapidFireViolations,
    },
    autoMuted: autoMutedUsers.length,
    autoMutedUsers,
  };
}

/**
 * Get activity statistics over time
 * @param {string} period - Time period: day, week, month
 * @returns {Promise<Object>} Activity statistics
 */
export async function getActivityStats(period = "week") {
  const now = new Date();
  const Activity = getActivity();
  const User = getUser();
  const RelayedMessage = getRelayedMessage();
  const startDate = getStartDate(now, period);

  // Get message volume over time (unique messages and media per day)
  const messageVolume = await RelayedMessage.aggregate([
    { $match: { relayedAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$relayedAt" } },
          userId: "$originalUserId",
          msgId: "$originalMsgId",
        },
        type: { $first: "$type" },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        messages: { $sum: 1 },
        media: { $sum: { $cond: [{ $ne: ["$type", "text"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", messages: 1, media: 1 } },
  ]);

  // Get user growth over time
  const userGrowth = await Activity.aggregate([
    { $match: { firstSeen: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$firstSeen" } },
        newUsers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Calculate cumulative totals
  const totalUsers = await User.countDocuments();
  let cumulativeUsers = totalUsers - userGrowth.reduce((sum, day) => sum + day.newUsers, 0);
  const userGrowthWithTotal = userGrowth.map((day) => {
    cumulativeUsers += day.newUsers;
    return { date: day._id, total: cumulativeUsers, active: day.newUsers };
  });

  // Get activity trends by hour (unique messages)
  const activityTrends = await RelayedMessage.aggregate([
    { $match: { relayedAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          hour: { $hour: "$relayedAt" },
          userId: "$originalUserId",
          msgId: "$originalMsgId",
        },
      },
    },
    {
      $group: {
        _id: "$_id.hour",
        messages: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, hour: "$_id", messages: 1 } },
  ]);

  // Calculate summary - use Activity collection for accurate total
  const totalMessagesResult = await Activity.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$totalMessages" },
      },
    },
  ]);
  const totalMessages = totalMessagesResult[0]?.total || 0;
  const daysInPeriod = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  const avgMessagesPerDay = totalMessages / Math.max(daysInPeriod, 1);
  const peakHour = activityTrends.reduce(
    (max, curr) => (curr.messages > max.messages ? curr : max),
    { hour: 0, messages: 0 }
  ).hour;

  return {
    messageVolume,
    userGrowth: userGrowthWithTotal,
    activityTrends,
    summary: { totalMessages, totalUsers, avgMessagesPerDay, peakHour },
  };
}

/**
 * Get start date based on period
 * @param {Date} now - Current date
 * @param {string} period - Time period: day, week, month
 * @returns {Date} Start date
 */
function getStartDate(now, period) {
  const date = new Date(now);

  switch (period) {
    case "day":
      date.setHours(0, 0, 0, 0);
      break;
    case "week":
      date.setDate(date.getDate() - 7);
      date.setHours(0, 0, 0, 0);
      break;
    case "month":
      date.setMonth(date.getMonth() - 1);
      date.setHours(0, 0, 0, 0);
      break;
    default:
      date.setHours(0, 0, 0, 0);
  }

  return date;
}
