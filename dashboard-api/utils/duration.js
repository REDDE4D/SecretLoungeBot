// dashboard-api/utils/duration.js

/**
 * Parse duration string to Date object
 * Supports: 30m, 2h, 7d, 4w
 * @param {string} duration - Duration string
 * @returns {Date} Date object for expiry
 */
export function parseDuration(duration) {
  if (!duration) return null;

  const match = duration.match(/^(\d+)([mhdw])$/);
  if (!match) {
    throw new Error(
      "Invalid duration format. Use format like: 30m, 2h, 7d, 4w"
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const now = new Date();
  let expiryDate;

  switch (unit) {
    case "m": // minutes
      expiryDate = new Date(now.getTime() + value * 60 * 1000);
      break;
    case "h": // hours
      expiryDate = new Date(now.getTime() + value * 60 * 60 * 1000);
      break;
    case "d": // days
      expiryDate = new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      break;
    case "w": // weeks
      expiryDate = new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      throw new Error("Invalid duration unit. Use m, h, d, or w");
  }

  return expiryDate;
}

/**
 * Parse duration string to seconds
 * @param {string} duration - Duration string
 * @returns {number} Duration in seconds
 */
export function parseDurationToSeconds(duration) {
  if (!duration) return 0;

  const match = duration.match(/^(\d+)([mhdw])$/);
  if (!match) {
    throw new Error(
      "Invalid duration format. Use format like: 30m, 2h, 7d, 4w"
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "m": // minutes
      return value * 60;
    case "h": // hours
      return value * 60 * 60;
    case "d": // days
      return value * 24 * 60 * 60;
    case "w": // weeks
      return value * 7 * 24 * 60 * 60;
    default:
      throw new Error("Invalid duration unit. Use m, h, d, or w");
  }
}

/**
 * Format Date to human-readable duration from now
 * @param {Date} date - Future date
 * @returns {string} Human-readable duration
 */
export function formatDuration(date) {
  if (!date) return "Permanent";

  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else {
    return `${seconds} second${seconds > 1 ? "s" : ""}`;
  }
}
