/**
 * Centralized Telegram Error Handler
 *
 * Handles Telegram API errors across the application:
 * - 403 Forbidden: Bot was blocked by user
 * - 400 Bad Request: Message too long, deleted message, etc.
 * - 429 Too Many Requests: Rate limiting
 */

import { User } from "../models/User.js";
import { logError, logWarning, logRelayFailure, logRateLimit, logUserBlocked } from "../services/dashboardLogger.js";

/**
 * Detects if error is due to user blocking the bot
 * @param {Error} error - Telegram API error
 * @returns {boolean}
 */
export function isUserBlockedError(error) {
  if (!error || !error.message) return false;

  const message = error.message.toLowerCase();
  return (
    error.response?.error_code === 403 ||
    message.includes("bot was blocked") ||
    message.includes("user is deactivated") ||
    message.includes("blocked by the user") ||
    message.includes("forbidden")
  );
}

/**
 * Detects if error is due to message being too long
 * @param {Error} error - Telegram API error
 * @returns {boolean}
 */
export function isMessageTooLongError(error) {
  if (!error || !error.message) return false;

  return (
    error.response?.error_code === 400 &&
    error.message.toLowerCase().includes("message is too long")
  );
}

/**
 * Detects if error is due to rate limiting
 * @param {Error} error - Telegram API error
 * @returns {Object|null} - { retryAfter: number } or null
 */
export function isRateLimitError(error) {
  if (!error || !error.message) return null;

  if (error.response?.error_code === 429) {
    return {
      retryAfter: error.response.parameters?.retry_after || 30,
    };
  }

  return null;
}

/**
 * Detects if error is due to message/chat not found (deleted)
 * @param {Error} error - Telegram API error
 * @returns {boolean}
 */
export function isNotFoundError(error) {
  if (!error || !error.message) return false;

  const message = error.message.toLowerCase();
  return (
    error.response?.error_code === 400 &&
    (message.includes("message to delete not found") ||
      message.includes("message not found") ||
      message.includes("chat not found") ||
      message.includes("message to reply not found"))
  );
}

/**
 * Handles user blocking the bot
 * - Marks user as blocked in database
 * - Removes from lobby
 * - Logs to dashboard
 *
 * @param {string} userId - User ID
 * @param {string} context - Context where error occurred
 * @returns {Promise<void>}
 */
export async function handleUserBlocked(userId, context = "unknown") {
  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.log(`Cannot handle blocked user ${userId}: User not found in database`);
      return;
    }

    const alias = user.alias || "Unknown";

    // Check if already marked as blocked
    if (user.blockedBot) {
      // Already handled
      return;
    }

    // Mark as blocked and remove from lobby
    user.blockedBot = true;
    user.blockedAt = new Date();
    const wasInLobby = user.inLobby;

    if (wasInLobby) {
      console.log(`🚫 User ${alias} (${userId}) blocked bot, removing from lobby`);
      user.inLobby = false;
    }

    await user.save();

    // Log to dashboard
    logUserBlocked(userId, alias, {
      context,
      wasInLobby: user.inLobby,
    });

    console.log(`✅ Marked user ${alias} (${userId}) as blocked`);
  } catch (error) {
    console.error(`Error handling blocked user ${userId}:`, error.message);
    logError(`Failed to handle blocked user ${userId}`, {
      error: error.message,
      context,
    });
  }
}

/**
 * Centralized Telegram error handler
 *
 * @param {Error} error - Telegram API error
 * @param {string} userId - Associated user ID (optional)
 * @param {string} context - Context where error occurred
 * @param {Object} details - Additional details for logging
 * @returns {Promise<Object>} - { handled: boolean, reason: string, shouldRetry: boolean, retryAfter: number }
 */
export async function handleTelegramError(error, userId = null, context = "unknown", details = {}) {
  // User blocked the bot
  if (isUserBlockedError(error)) {
    if (userId) {
      await handleUserBlocked(userId, context);
    }

    logRelayFailure("blocked", {
      userId,
      context,
      ...details,
    });

    return {
      handled: true,
      reason: "user_blocked",
      shouldRetry: false,
    };
  }

  // Rate limit
  const rateLimitInfo = isRateLimitError(error);
  if (rateLimitInfo) {
    logRateLimit(rateLimitInfo.retryAfter, {
      userId,
      context,
      ...details,
    });

    return {
      handled: true,
      reason: "rate_limit",
      shouldRetry: true,
      retryAfter: rateLimitInfo.retryAfter,
    };
  }

  // Message too long
  if (isMessageTooLongError(error)) {
    logWarning("Message too long", {
      userId,
      context,
      ...details,
    });

    return {
      handled: true,
      reason: "message_too_long",
      shouldRetry: false,
    };
  }

  // Message/chat not found (deleted)
  if (isNotFoundError(error)) {
    logRelayFailure("not_found", {
      userId,
      context,
      ...details,
      errorMessage: error.message,
    });

    return {
      handled: true,
      reason: "not_found",
      shouldRetry: false,
    };
  }

  // Unknown error - log as error
  logError(`Telegram API error in ${context}`, {
    userId,
    context,
    errorCode: error.response?.error_code,
    errorMessage: error.message,
    ...details,
  });

  return {
    handled: false,
    reason: "unknown",
    shouldRetry: false,
  };
}

/**
 * Wrapper for Telegram API calls with automatic error handling
 *
 * @param {Function} apiCall - Async function to call Telegram API
 * @param {string} userId - Associated user ID (optional)
 * @param {string} context - Context of the API call
 * @param {Object} details - Additional details for logging
 * @returns {Promise<Object>} - { success: boolean, result: any, error: any }
 */
export async function safeTelegramCall(apiCall, userId = null, context = "unknown", details = {}) {
  try {
    const result = await apiCall();
    return {
      success: true,
      result,
      error: null,
    };
  } catch (error) {
    const handleResult = await handleTelegramError(error, userId, context, details);

    return {
      success: false,
      result: null,
      error,
      ...handleResult,
    };
  }
}

export default {
  isUserBlockedError,
  isMessageTooLongError,
  isRateLimitError,
  isNotFoundError,
  handleUserBlocked,
  handleTelegramError,
  safeTelegramCall,
};
