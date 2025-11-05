import { getIoInstance } from "../config/socket.js";
import { getOverviewStats } from "./statsService.js";

/**
 * Socket Service - Handles all real-time event emissions
 * This service is used throughout the application to broadcast events to connected clients
 */

/**
 * Emit statistics update to all subscribed clients
 * @param {Object} stats - Statistics object (optional, will fetch if not provided)
 */
export async function emitStatsUpdate(stats = null) {
  try {
    const io = getIoInstance();

    // Fetch stats if not provided
    if (!stats) {
      stats = await getOverviewStats({ period: "day" });
    }

    // Emit to stats subscribers
    io.to("stats-subscribers").emit("stats:update", {
      users: {
        online: stats.users?.online || 0,
        inLobby: stats.users?.inLobby || 0,
      },
      messages: {
        today: stats.messages?.today || 0,
      },
      reports: {
        pending: stats.moderation?.pendingReports || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error emitting stats update:", error);
  }
}

/**
 * Emit new report notification to moderators
 * @param {Object} report - Report object
 */
export function emitNewReport(report) {
  try {
    const io = getIoInstance();

    io.to("mod-room").emit("report:new", {
      reportId: report._id.toString(),
      reporterId: report.reporterId,
      reportedUserId: report.reportedUserId,
      reportedAlias: report.reportedAlias,
      messagePreview: report.messagePreview,
      messageType: report.messageType,
      reason: report.reason,
      timestamp: report.createdAt,
    });

    console.log(`📢 New report notification sent to moderators: ${report._id}`);
  } catch (error) {
    console.error("Error emitting new report:", error);
  }
}

/**
 * Emit moderation action to all relevant users
 * @param {Object} action - Moderation action details
 */
export function emitModerationAction(action) {
  try {
    const io = getIoInstance();

    const payload = {
      action: action.action, // ban, mute, kick, warn, etc.
      moderatorId: action.moderatorId,
      moderatorAlias: action.moderatorAlias,
      targetId: action.targetId,
      targetAlias: action.targetAlias,
      reason: action.reason,
      duration: action.duration,
      timestamp: new Date().toISOString(),
    };

    // Send to admin room
    io.to("admin-room").emit("action:moderation", payload);

    // Send to mod room
    io.to("mod-room").emit("action:moderation", payload);

    console.log(`🔨 Moderation action broadcast: ${action.action} on ${action.targetAlias}`);
  } catch (error) {
    console.error("Error emitting moderation action:", error);
  }
}

/**
 * Emit user joined lobby event
 * @param {Object} user - User object
 */
export function emitUserJoined(user) {
  try {
    const io = getIoInstance();

    io.to("lobby").emit("user:joined", {
      userId: user._id,
      alias: user.alias,
      icon: user.icon,
      timestamp: new Date().toISOString(),
    });

    console.log(`👋 User joined broadcast: ${user.alias}`);
  } catch (error) {
    console.error("Error emitting user joined:", error);
  }
}

/**
 * Emit user left lobby event
 * @param {Object} user - User object
 */
export function emitUserLeft(user) {
  try {
    const io = getIoInstance();

    io.to("lobby").emit("user:left", {
      userId: user._id,
      alias: user.alias,
      timestamp: new Date().toISOString(),
    });

    console.log(`👋 User left broadcast: ${user.alias}`);
  } catch (error) {
    console.error("Error emitting user left:", error);
  }
}

/**
 * Emit spam alert to moderators
 * @param {Object} alert - Spam alert details
 */
export function emitSpamAlert(alert) {
  try {
    const io = getIoInstance();

    const payload = {
      userId: alert.userId,
      alias: alert.alias,
      violationType: alert.violationType, // flood, linkSpam, rapidFire
      count: alert.count,
      autoMuted: alert.autoMuted,
      muteDuration: alert.muteDuration,
      timestamp: new Date().toISOString(),
    };

    // Send to moderators and admins
    io.to("mod-room").emit("spam:alert", payload);

    console.log(`⚠️ Spam alert broadcast: ${alert.alias} - ${alert.violationType}`);
  } catch (error) {
    console.error("Error emitting spam alert:", error);
  }
}

/**
 * Emit audit log entry in real-time
 * @param {Object} log - Audit log entry
 */
export function emitAuditLog(log) {
  try {
    const io = getIoInstance();

    io.to("admin-room").emit("audit:new", {
      id: log._id.toString(),
      action: log.action,
      category: log.category,
      moderatorId: log.moderatorId,
      moderatorAlias: log.moderatorAlias,
      targetId: log.targetId,
      targetAlias: log.targetAlias,
      details: log.details,
      timestamp: log.timestamp,
    });

    console.log(`📝 Audit log broadcast: ${log.action} by ${log.moderatorAlias}`);
  } catch (error) {
    console.error("Error emitting audit log:", error);
  }
}

/**
 * Emit settings change notification
 * @param {Object} change - Settings change details
 */
export function emitSettingsChange(change) {
  try {
    const io = getIoInstance();

    io.to("admin-room").emit("settings:changed", {
      category: change.category,
      setting: change.setting,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changedBy: change.changedBy,
      timestamp: new Date().toISOString(),
    });

    console.log(`⚙️ Settings change broadcast: ${change.category}.${change.setting}`);
  } catch (error) {
    console.error("Error emitting settings change:", error);
  }
}

/**
 * Emit user status change (online/idle/offline)
 * @param {Object} user - User object with status
 */
export function emitUserStatusChange(user, newStatus) {
  try {
    const io = getIoInstance();

    io.to("lobby").emit("user:status", {
      userId: user._id,
      alias: user.alias,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error emitting user status change:", error);
  }
}

/**
 * Start periodic stats updates (every 60 seconds)
 * @returns {NodeJS.Timeout} Interval ID
 */
export function startStatsUpdateInterval() {
  console.log("📊 Starting periodic stats updates (every 60 seconds)");

  const interval = setInterval(async () => {
    await emitStatsUpdate();
  }, 60000); // 60 seconds

  return interval;
}

/**
 * Stop periodic stats updates
 * @param {NodeJS.Timeout} interval - Interval ID to clear
 */
export function stopStatsUpdateInterval(interval) {
  if (interval) {
    clearInterval(interval);
    console.log("📊 Stopped periodic stats updates");
  }
}

/**
 * Broadcast a custom event to a specific room
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function broadcastToRoom(room, event, data) {
  try {
    const io = getIoInstance();
    io.to(room).emit(event, data);
    console.log(`📡 Broadcast to ${room}: ${event}`);
  } catch (error) {
    console.error(`Error broadcasting to ${room}:`, error);
  }
}

/**
 * Get count of connected clients
 * @returns {Promise<number>} Number of connected clients
 */
export async function getConnectedClientsCount() {
  try {
    const io = getIoInstance();
    const sockets = await io.fetchSockets();
    return sockets.length;
  } catch (error) {
    console.error("Error getting connected clients count:", error);
    return 0;
  }
}

/**
 * Get connected clients by room
 * @param {string} room - Room name
 * @returns {Promise<number>} Number of clients in room
 */
export async function getRoomClientsCount(room) {
  try {
    const io = getIoInstance();
    const sockets = await io.in(room).fetchSockets();
    return sockets.length;
  } catch (error) {
    console.error(`Error getting clients count for room ${room}:`, error);
    return 0;
  }
}
