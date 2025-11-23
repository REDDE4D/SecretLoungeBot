// src/utils/actionState.js

/**
 * State management for multi-step button workflows
 * Handles temporary state storage with automatic expiry and cleanup
 */

import logger from "./logger.js";

// Storage for pending actions
const pendingActions = new Map();

// Default expiry time (60 seconds)
const DEFAULT_EXPIRY_MS = 60000;

/**
 * Create a new pending action
 * @param {String} actionType - Type of action (e.g., 'mute', 'ban', 'report_resolve')
 * @param {Number} initiatorId - User ID who initiated the action
 * @param {Object} data - Action-specific data
 * @param {Number} expiryMs - Optional custom expiry time in milliseconds
 * @returns {String} Unique action ID
 */
export function createPendingAction(actionType, initiatorId, data = {}, expiryMs = DEFAULT_EXPIRY_MS) {
  const actionId = `${actionType}_${Date.now()}_${initiatorId}`;

  pendingActions.set(actionId, {
    type: actionType,
    initiatorId: String(initiatorId),
    data,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiryMs,
  });

  logger.info("Pending action created", {
    actionId,
    type: actionType,
    initiatorId,
    expiresIn: `${expiryMs / 1000}s`,
  });

  return actionId;
}

/**
 * Get a pending action by ID
 * @param {String} actionId - Action ID
 * @param {Boolean} removeIfExpired - Whether to remove if expired (default: true)
 * @returns {Object|null} Action data or null if not found/expired
 */
export function getPendingAction(actionId, removeIfExpired = true) {
  const action = pendingActions.get(actionId);

  if (!action) {
    return null;
  }

  // Check if expired
  if (Date.now() > action.expiresAt) {
    if (removeIfExpired) {
      pendingActions.delete(actionId);
      logger.info("Pending action expired and removed", { actionId });
    }
    return null;
  }

  return action;
}

/**
 * Update a pending action's data
 * @param {String} actionId - Action ID
 * @param {Object} updates - Data to merge into existing action data
 * @returns {Boolean} True if updated successfully, false if not found/expired
 */
export function updatePendingAction(actionId, updates) {
  const action = getPendingAction(actionId);

  if (!action) {
    return false;
  }

  action.data = { ...action.data, ...updates };
  pendingActions.set(actionId, action);

  logger.info("Pending action updated", { actionId, updates });
  return true;
}

/**
 * Complete and remove a pending action
 * @param {String} actionId - Action ID
 * @returns {Object|null} Action data or null if not found/expired
 */
export function completePendingAction(actionId) {
  const action = getPendingAction(actionId);

  if (!action) {
    return null;
  }

  pendingActions.delete(actionId);
  logger.info("Pending action completed and removed", { actionId, type: action.type });

  return action;
}

/**
 * Cancel and remove a pending action
 * @param {String} actionId - Action ID
 * @returns {Boolean} True if cancelled successfully, false if not found
 */
export function cancelPendingAction(actionId) {
  const existed = pendingActions.delete(actionId);

  if (existed) {
    logger.info("Pending action cancelled", { actionId });
  }

  return existed;
}

/**
 * Verify that the user attempting to complete an action is the initiator
 * @param {String} actionId - Action ID
 * @param {Number} userId - User ID attempting to complete the action
 * @returns {Boolean} True if user is the initiator, false otherwise
 */
export function verifyInitiator(actionId, userId) {
  const action = getPendingAction(actionId);

  if (!action) {
    return false;
  }

  return String(action.initiatorId) === String(userId);
}

/**
 * Get all pending actions for a specific initiator
 * @param {Number} initiatorId - Initiator user ID
 * @returns {Array} Array of { actionId, action } objects
 */
export function getPendingActionsByInitiator(initiatorId) {
  const now = Date.now();
  const results = [];

  for (const [actionId, action] of pendingActions.entries()) {
    if (
      String(action.initiatorId) === String(initiatorId) &&
      now <= action.expiresAt
    ) {
      results.push({ actionId, action });
    }
  }

  return results;
}

/**
 * Get all pending actions of a specific type
 * @param {String} actionType - Action type
 * @returns {Array} Array of { actionId, action } objects
 */
export function getPendingActionsByType(actionType) {
  const now = Date.now();
  const results = [];

  for (const [actionId, action] of pendingActions.entries()) {
    if (action.type === actionType && now <= action.expiresAt) {
      results.push({ actionId, action });
    }
  }

  return results;
}

/**
 * Clean up expired actions
 * @returns {Number} Number of expired actions removed
 */
export function cleanupExpiredActions() {
  const now = Date.now();
  let removed = 0;

  for (const [actionId, action] of pendingActions.entries()) {
    if (now > action.expiresAt) {
      pendingActions.delete(actionId);
      removed++;
    }
  }

  if (removed > 0) {
    logger.info("Cleaned up expired pending actions", { count: removed });
  }

  return removed;
}

/**
 * Get statistics about pending actions
 * @returns {Object} Statistics object
 */
export function getStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;
  const typeCount = {};

  for (const action of pendingActions.values()) {
    if (now > action.expiresAt) {
      expired++;
    } else {
      active++;
      typeCount[action.type] = (typeCount[action.type] || 0) + 1;
    }
  }

  return {
    total: pendingActions.size,
    active,
    expired,
    typeCount,
  };
}

/**
 * Clear all pending actions (use with caution!)
 * @returns {Number} Number of actions cleared
 */
export function clearAllPendingActions() {
  const count = pendingActions.size;
  pendingActions.clear();

  logger.warn("All pending actions cleared", { count });
  return count;
}

// Automatic cleanup interval (every 60 seconds)
setInterval(() => {
  cleanupExpiredActions();
}, 60000);

// Log stats every 5 minutes in debug mode
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    const stats = getStats();
    if (stats.total > 0) {
      logger.debug("Pending actions stats", stats);
    }
  }, 300000);
}

export default {
  createPendingAction,
  getPendingAction,
  updatePendingAction,
  completePendingAction,
  cancelPendingAction,
  verifyInitiator,
  getPendingActionsByInitiator,
  getPendingActionsByType,
  cleanupExpiredActions,
  getStats,
  clearAllPendingActions,
};
