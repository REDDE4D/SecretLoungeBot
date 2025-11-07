import { BotLog } from "../models/BotLog.js";
import { broadcastToRoom } from "../services/socketService.js";

/**
 * POST /api/logs/event
 * Log a bot event and broadcast via WebSocket
 */
export async function logBotEvent(req, res) {
  try {
    const {
      type, // 'error', 'warning', 'info', 'relay_failure', 'rate_limit', 'user_blocked', 'system_health'
      severity, // 'critical', 'high', 'medium', 'low', 'info'
      message,
      details,
      userId,
      context,
    } = req.body;

    // Validate required fields
    if (!type || !severity || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: type, severity, message",
      });
    }

    // Create log entry
    const logEntry = new BotLog({
      type,
      severity,
      message,
      details: details || {},
      userId: userId || null,
      context: context || null,
      timestamp: new Date(),
    });

    // Save to database
    await logEntry.save();

    // Broadcast to appropriate room based on severity
    const rooms = [];
    if (severity === "critical" || severity === "high") {
      rooms.push("admin-room");
    }
    if (type === "relay_failure" || type === "user_blocked") {
      rooms.push("mod-room");
    }
    // Always send to logs room
    rooms.push("logs-room");

    const payload = {
      id: logEntry._id.toString(),
      type: logEntry.type,
      severity: logEntry.severity,
      message: logEntry.message,
      details: logEntry.details,
      userId: logEntry.userId,
      context: logEntry.context,
      timestamp: logEntry.timestamp,
    };

    // Emit to all relevant rooms
    rooms.forEach(room => {
      broadcastToRoom(room, "bot:log", payload);
    });

    res.json({
      success: true,
      logId: logEntry._id.toString(),
    });
  } catch (error) {
    console.error("Error logging bot event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to log event",
      error: error.message,
    });
  }
}

/**
 * GET /api/logs
 * Get recent bot logs
 */
export async function getRecentLogs(req, res) {
  try {
    const {
      type,
      severity,
      limit = 100,
      offset = 0,
      since,
    } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (since) query.timestamp = { $gte: new Date(since) };

    // Execute query
    const logs = await BotLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Get total count
    const total = await BotLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + logs.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
      error: error.message,
    });
  }
}

/**
 * DELETE /api/logs/old
 * Clear old logs (older than retention period)
 */
export async function clearOldLogs(req, res) {
  try {
    const retentionDays = parseInt(req.query.days) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await BotLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} logs older than ${retentionDays} days`,
    });
  } catch (error) {
    console.error("Error clearing old logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear old logs",
      error: error.message,
    });
  }
}
