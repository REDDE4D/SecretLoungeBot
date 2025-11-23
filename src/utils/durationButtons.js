// src/utils/durationButtons.js

/**
 * Standardized duration selector buttons for mute/ban commands
 * Provides consistent duration options across all moderation actions
 */

/**
 * Build mute duration selector keyboard
 * @param {String} userId - Target user ID
 * @param {String} context - Context identifier (e.g., 'mute', 'report_mute', 'userinfo_mute')
 * @returns {Array} Inline keyboard array
 */
export function buildMuteDurationSelector(userId, context = "mute") {
  return [
    [
      { text: "10m", callback_data: `${context}_dur:${userId}:600` },
      { text: "30m", callback_data: `${context}_dur:${userId}:1800` },
      { text: "1h", callback_data: `${context}_dur:${userId}:3600` },
      { text: "3h", callback_data: `${context}_dur:${userId}:10800` },
    ],
    [
      { text: "6h", callback_data: `${context}_dur:${userId}:21600` },
      { text: "12h", callback_data: `${context}_dur:${userId}:43200` },
      { text: "24h", callback_data: `${context}_dur:${userId}:86400` },
      { text: "3d", callback_data: `${context}_dur:${userId}:259200` },
    ],
    [
      { text: "7d", callback_data: `${context}_dur:${userId}:604800` },
      { text: "14d", callback_data: `${context}_dur:${userId}:1209600` },
      { text: "30d", callback_data: `${context}_dur:${userId}:2592000` },
    ],
    [
      { text: "♾️ Permanent", callback_data: `${context}_dur:${userId}:0` },
      { text: "❌ Cancel", callback_data: "close_menu" },
    ],
  ];
}

/**
 * Build ban duration selector keyboard
 * @param {String} userId - Target user ID
 * @param {String} context - Context identifier (e.g., 'ban', 'report_ban', 'userinfo_ban')
 * @returns {Array} Inline keyboard array
 */
export function buildBanDurationSelector(userId, context = "ban") {
  return [
    [
      { text: "1h", callback_data: `${context}_dur:${userId}:3600` },
      { text: "6h", callback_data: `${context}_dur:${userId}:21600` },
      { text: "24h", callback_data: `${context}_dur:${userId}:86400` },
      { text: "3d", callback_data: `${context}_dur:${userId}:259200` },
    ],
    [
      { text: "7d", callback_data: `${context}_dur:${userId}:604800` },
      { text: "14d", callback_data: `${context}_dur:${userId}:1209600` },
      { text: "30d", callback_data: `${context}_dur:${userId}:2592000` },
    ],
    [
      { text: "♾️ Permanent Ban", callback_data: `${context}_dur:${userId}:0` },
      { text: "❌ Cancel", callback_data: "close_menu" },
    ],
  ];
}

/**
 * Parse duration from seconds to human-readable format
 * @param {Number} seconds - Duration in seconds (0 = permanent)
 * @returns {String} Human-readable duration
 */
export function formatDuration(seconds) {
  if (seconds === 0 || !seconds) {
    return "Permanent";
  }

  const units = [
    { name: "day", seconds: 86400, short: "d" },
    { name: "hour", seconds: 3600, short: "h" },
    { name: "minute", seconds: 60, short: "m" },
  ];

  for (const unit of units) {
    if (seconds >= unit.seconds && seconds % unit.seconds === 0) {
      const value = seconds / unit.seconds;
      return `${value}${unit.short}`;
    }
  }

  // Fallback for non-standard durations
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  } else if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
}

/**
 * Parse duration string to seconds
 * Supports formats: 10m, 1h, 2d, 1h30m, etc.
 * @param {String} durationStr - Duration string
 * @returns {Number|null} Duration in seconds, or null if invalid
 */
export function parseDuration(durationStr) {
  if (!durationStr || typeof durationStr !== "string") {
    return null;
  }

  const str = durationStr.toLowerCase().trim();

  // Handle "permanent", "perm", "forever", etc.
  if (["permanent", "perm", "forever", "0"].includes(str)) {
    return 0;
  }

  // Parse compound durations (e.g., "1d12h", "1h30m")
  const regex = /(\d+)([dhms])/g;
  let match;
  let totalSeconds = 0;
  let hasMatch = false;

  while ((match = regex.exec(str)) !== null) {
    hasMatch = true;
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "d":
        totalSeconds += value * 86400;
        break;
      case "h":
        totalSeconds += value * 3600;
        break;
      case "m":
        totalSeconds += value * 60;
        break;
      case "s":
        totalSeconds += value;
        break;
    }
  }

  return hasMatch ? totalSeconds : null;
}

/**
 * Calculate expiry timestamp from duration
 * @param {Number} durationSeconds - Duration in seconds (0 = no expiry/permanent)
 * @returns {Date|null} Expiry date or null for permanent
 */
export function calculateExpiry(durationSeconds) {
  if (durationSeconds === 0 || !durationSeconds) {
    return null; // Permanent
  }

  return new Date(Date.now() + durationSeconds * 1000);
}

/**
 * Format expiry date for display
 * @param {Date|null} expiryDate - Expiry date or null for permanent
 * @returns {String} Formatted expiry string
 */
export function formatExpiry(expiryDate) {
  if (!expiryDate) {
    return "Never (Permanent)";
  }

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return expiryDate.toLocaleDateString("en-US", options);
}

/**
 * Get remaining time from expiry date
 * @param {Date|null} expiryDate - Expiry date
 * @returns {String} Remaining time string (e.g., "2h 30m remaining")
 */
export function getRemainingTime(expiryDate) {
  if (!expiryDate) {
    return "Permanent";
  }

  const now = Date.now();
  const expiry = expiryDate.getTime();

  if (expiry <= now) {
    return "Expired";
  }

  const remainingSeconds = Math.floor((expiry - now) / 1000);
  const formatted = formatDuration(remainingSeconds);

  return `${formatted} remaining`;
}

/**
 * Validate duration value
 * @param {Number} seconds - Duration in seconds
 * @param {Object} options - Validation options
 * @param {Number} options.maxDays - Maximum allowed days
 * @param {Boolean} options.allowPermanent - Whether to allow permanent (0)
 * @returns {Object} { valid: Boolean, error: String|null }
 */
export function validateDuration(seconds, options = {}) {
  const { maxDays = 365, allowPermanent = true } = options;

  if (seconds === 0) {
    return {
      valid: allowPermanent,
      error: allowPermanent ? null : "Permanent duration not allowed",
    };
  }

  if (seconds < 0) {
    return {
      valid: false,
      error: "Duration cannot be negative",
    };
  }

  const maxSeconds = maxDays * 86400;
  if (seconds > maxSeconds) {
    return {
      valid: false,
      error: `Duration cannot exceed ${maxDays} days`,
    };
  }

  return {
    valid: true,
    error: null,
  };
}
