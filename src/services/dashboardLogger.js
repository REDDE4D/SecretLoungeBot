/**
 * Dashboard Logger Service
 *
 * Bridge service that sends bot logs to the dashboard API via HTTP
 * The dashboard API then broadcasts these logs via WebSocket to connected clients
 */

import dotenv from "dotenv";
dotenv.config();

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || "http://localhost:3001/api";
const LOG_QUEUE = [];
const MAX_QUEUE_SIZE = 100;
const BATCH_INTERVAL = 1000; // Send batched logs every second
let batchTimer = null;

/**
 * Sends a log to the dashboard API
 * @param {Object} logData - Log data
 * @returns {Promise<boolean>} Success status
 */
async function sendLogToDashboard(logData) {
  try {
    const response = await fetch(`${DASHBOARD_API_URL}/logs/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logData),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error(`Dashboard logger: HTTP ${response.status} - ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    // Don't spam console if dashboard is down
    if (error.name !== "AbortError" && error.code !== "ECONNREFUSED") {
      console.error("Dashboard logger error:", error.message);
    }
    return false;
  }
}

/**
 * Process the log queue (batch send)
 */
async function processLogQueue() {
  if (LOG_QUEUE.length === 0) return;

  // Take up to 10 logs from queue
  const batch = LOG_QUEUE.splice(0, 10);

  for (const log of batch) {
    await sendLogToDashboard(log);
  }
}

/**
 * Start the batch processing timer
 */
function startBatchTimer() {
  if (!batchTimer) {
    batchTimer = setInterval(processLogQueue, BATCH_INTERVAL);
  }
}

/**
 * Log a bot error
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @param {string} userId - Associated user ID (optional)
 * @param {string} context - Context string (optional)
 */
export function logError(message, details = {}, userId = null, context = null) {
  const logData = {
    type: "error",
    severity: details.critical ? "critical" : "high",
    message,
    details,
    userId,
    context,
  };

  LOG_QUEUE.push(logData);
  startBatchTimer();

  // If queue is too large, process immediately
  if (LOG_QUEUE.length >= MAX_QUEUE_SIZE) {
    processLogQueue();
  }
}

/**
 * Log a warning
 * @param {string} message - Warning message
 * @param {Object} details - Additional details
 * @param {string} userId - Associated user ID (optional)
 * @param {string} context - Context string (optional)
 */
export function logWarning(message, details = {}, userId = null, context = null) {
  const logData = {
    type: "warning",
    severity: "medium",
    message,
    details,
    userId,
    context,
  };

  LOG_QUEUE.push(logData);
  startBatchTimer();
}

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {Object} details - Additional details
 * @param {string} userId - Associated user ID (optional)
 * @param {string} context - Context string (optional)
 */
export function logInfo(message, details = {}, userId = null, context = null) {
  const logData = {
    type: "info",
    severity: "info",
    message,
    details,
    userId,
    context,
  };

  LOG_QUEUE.push(logData);
  startBatchTimer();
}

/**
 * Log a relay failure
 * @param {string} reason - Failure reason (blocked, deleted, rate_limit, etc.)
 * @param {Object} details - Additional details (userId, alias, messageId, etc.)
 */
export function logRelayFailure(reason, details = {}) {
  const logData = {
    type: "relay_failure",
    severity: reason === "blocked" ? "medium" : "low",
    message: `Message relay failed: ${reason}`,
    details: {
      ...details,
      reason,
    },
    userId: details.userId || null,
    context: "message_relay",
  };

  LOG_QUEUE.push(logData);
  startBatchTimer();
}

/**
 * Log a rate limit hit
 * @param {number} retryAfter - Seconds to wait
 * @param {Object} details - Additional details
 */
export function logRateLimit(retryAfter, details = {}) {
  const logData = {
    type: "rate_limit",
    severity: "low",
    message: `Rate limit hit, retry after ${retryAfter}s`,
    details: {
      ...details,
      retryAfter,
    },
    context: "telegram_api",
  };

  LOG_QUEUE.push(logData);
  startBatchTimer();
}

/**
 * Log a user blocking the bot
 * @param {string} userId - User ID
 * @param {string} alias - User alias
 * @param {Object} details - Additional details
 */
export function logUserBlocked(userId, alias, details = {}) {
  const logData = {
    type: "user_blocked",
    severity: "medium",
    message: `User ${alias} (${userId}) blocked the bot`,
    details: {
      ...details,
      alias,
    },
    userId,
    context: "user_management",
  };

  LOG_QUEUE.push(logData);
  startBatchTimer();
}

/**
 * Log system health metrics
 * @param {Object} metrics - Health metrics (memory, uptime, etc.)
 */
export function logSystemHealth(metrics) {
  const logData = {
    type: "system_health",
    severity: "info",
    message: "System health check",
    details: metrics,
    context: "system",
  };

  LOG_QUEUE.push(logData);
  startBatchTimer();
}

/**
 * Log a user action
 * @param {string} action - Action name (join, leave, register, etc.)
 * @param {string} userId - User ID
 * @param {Object} details - Additional details
 */
export function logUserAction(action, userId, details = {}) {
  const logData = {
    type: "user_action",
    severity: "info",
    message: `User action: ${action}`,
    details: {
      ...details,
      action,
    },
    userId,
    context: "user_activity",
  };

  LOG_QUEUE.push(logData);
  startBatchTimer();
}

/**
 * Flush the log queue immediately
 */
export async function flushLogs() {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
  await processLogQueue();
}

/**
 * Shutdown the logger (flush queue and stop timer)
 */
export async function shutdownLogger() {
  console.log("Dashboard logger: Shutting down...");
  await flushLogs();
  console.log("Dashboard logger: Shut down complete");
}

// Start the batch timer on module load
startBatchTimer();

// Export singleton methods
export default {
  logError,
  logWarning,
  logInfo,
  logRelayFailure,
  logRateLimit,
  logUserBlocked,
  logSystemHealth,
  logUserAction,
  flushLogs,
  shutdownLogger,
};
