// dashboard-api/utils/export.js

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Array of column definitions { key, label }
 * @returns {string} CSV string
 */
export function convertToCSV(data, columns) {
  if (!data || data.length === 0) {
    return "";
  }

  // Create header row
  const headers = columns.map((col) => escapeCSVField(col.label)).join(",");

  // Create data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value = getNestedValue(item, col.key);
        return escapeCSVField(value);
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Escape CSV field (handle quotes, commas, newlines)
 * @param {any} value - Field value
 * @returns {string} Escaped value
 */
function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return "";
  }

  // Convert to string
  let stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
  }

  return stringValue;
}

/**
 * Get nested object value by dot notation path
 * @param {object} obj - Object to get value from
 * @param {string} path - Dot notation path (e.g., "icon.fallback")
 * @returns {any} Value at path
 */
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Convert data to JSON format
 * @param {Array} data - Data to convert
 * @param {boolean} pretty - Whether to pretty-print
 * @returns {string} JSON string
 */
export function convertToJSON(data, pretty = false) {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

/**
 * Format date for export
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatExportDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

/**
 * Format boolean for export
 * @param {boolean} value - Boolean value
 * @returns {string} "Yes" or "No"
 */
export function formatExportBoolean(value) {
  return value ? "Yes" : "No";
}

/**
 * Format user role for export
 * @param {string} role - User role
 * @returns {string} Capitalized role or "Regular User"
 */
export function formatExportRole(role) {
  if (!role) return "Regular User";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Format duration (seconds to human readable)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Human readable duration
 */
export function formatExportDuration(seconds) {
  if (!seconds) return "N/A";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(" ") : "< 1m";
}

/**
 * Prepare users data for export
 * @param {Array} users - Users with activity data
 * @returns {Array} Prepared data for export
 */
export function prepareUsersForExport(users) {
  return users.map((user) => ({
    id: user._id,
    alias: user.alias || "Not set",
    icon: user.icon?.fallback || "👤",
    role: formatExportRole(user.role),
    inLobby: formatExportBoolean(user.inLobby),
    status: user.activity?.status || "offline",
    joinedAt: user.createdAt ? formatExportDate(user.createdAt) : "N/A",
    lastActive: user.activity?.lastActive
      ? formatExportDate(user.activity.lastActive)
      : "N/A",
    totalMessages: user.activity?.totalMessages || 0,
    totalReplies: user.activity?.totalReplies || 0,
    totalTextMessages: user.activity?.totalTextMessages || 0,
    totalMediaMessages: user.activity?.totalMediaMessages || 0,
    warnings: user.warnings || 0,
    isBanned: formatExportBoolean(user.bannedUntil && new Date(user.bannedUntil) > new Date()),
    bannedUntil: user.bannedUntil ? formatExportDate(user.bannedUntil) : "N/A",
    isMuted: formatExportBoolean(user.mutedUntil && new Date(user.mutedUntil) > new Date()),
    mutedUntil: user.mutedUntil ? formatExportDate(user.mutedUntil) : "N/A",
    mediaRestricted: formatExportBoolean(user.mediaRestricted),
  }));
}

/**
 * Prepare audit logs for export
 * @param {Array} logs - Audit log entries
 * @returns {Array} Prepared data for export
 */
export function prepareAuditLogsForExport(logs) {
  return logs.map((log) => ({
    id: log._id,
    timestamp: formatExportDate(log.timestamp),
    action: log.action,
    moderator: log.moderatorAlias || log.moderatorId,
    moderatorId: log.moderatorId,
    targetUser: log.targetAlias || log.targetId || "N/A",
    targetId: log.targetId || "N/A",
    details: log.details || "N/A",
    ipAddress: log.ipAddress || "N/A",
    userAgent: log.userAgent || "N/A",
  }));
}

/**
 * Get column definitions for users export
 * @returns {Array} Column definitions
 */
export function getUsersExportColumns() {
  return [
    { key: "id", label: "User ID" },
    { key: "alias", label: "Alias" },
    { key: "icon", label: "Icon" },
    { key: "role", label: "Role" },
    { key: "inLobby", label: "In Lobby" },
    { key: "status", label: "Status" },
    { key: "joinedAt", label: "Joined At" },
    { key: "lastActive", label: "Last Active" },
    { key: "totalMessages", label: "Total Messages" },
    { key: "totalReplies", label: "Total Replies" },
    { key: "totalTextMessages", label: "Text Messages" },
    { key: "totalMediaMessages", label: "Media Messages" },
    { key: "warnings", label: "Warnings" },
    { key: "isBanned", label: "Banned" },
    { key: "bannedUntil", label: "Banned Until" },
    { key: "isMuted", label: "Muted" },
    { key: "mutedUntil", label: "Muted Until" },
    { key: "mediaRestricted", label: "Media Restricted" },
  ];
}

/**
 * Get column definitions for audit logs export
 * @returns {Array} Column definitions
 */
export function getAuditLogsExportColumns() {
  return [
    { key: "id", label: "ID" },
    { key: "timestamp", label: "Timestamp" },
    { key: "action", label: "Action" },
    { key: "moderator", label: "Moderator" },
    { key: "moderatorId", label: "Moderator ID" },
    { key: "targetUser", label: "Target User" },
    { key: "targetId", label: "Target ID" },
    { key: "details", label: "Details" },
    { key: "ipAddress", label: "IP Address" },
    { key: "userAgent", label: "User Agent" },
  ];
}
