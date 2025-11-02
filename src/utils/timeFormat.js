// src/utils/timeFormat.js

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * @param {Date} date - The date to format
 * @returns {string} Formatted relative time string
 */
export function formatTimeAgo(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return `just now`;
}

/**
 * Format time remaining for temporary restrictions
 * @param {Date} date - The future date to countdown to
 * @returns {string} Formatted time remaining string
 */
export function formatTimeRemaining(date) {
  const now = Date.now();
  const diff = date.getTime() - now;

  if (diff <= 0) return "expired";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}

/**
 * Format duration in milliseconds to human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(ms) {
  if (ms <= 0) return "0 seconds";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? "s" : ""}`);
  if (minutes % 60 > 0 && parts.length < 2) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? "s" : ""}`);
  if (seconds % 60 > 0 && parts.length === 0) parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? "s" : ""}`);

  return parts.join(", ");
}
