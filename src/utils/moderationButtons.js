// src/utils/moderationButtons.js

/**
 * Reusable button builders for moderation commands
 * Provides standardized inline keyboards for common moderation workflows
 */

/**
 * Build action buttons for user moderation
 * Context-aware: Shows different buttons based on user's current state
 * @param {String} userId - Target user ID
 * @param {Object} userState - Current user state (muted, banned, mediaRestricted)
 * @returns {Array} Inline keyboard array
 */
export function buildUserActionButtons(userId, userState = {}) {
  const { isMuted, isBanned, isMediaRestricted } = userState;

  const buttons = [];

  // Row 1: Primary moderation actions
  const row1 = [];
  row1.push({ text: "⚠️ Warn", callback_data: `userinfo:warn:${userId}` });

  if (isMuted) {
    row1.push({ text: "🔊 Unmute", callback_data: `userinfo:unmute:${userId}` });
  } else {
    row1.push({ text: "🔇 Mute", callback_data: `userinfo:mute:${userId}` });
  }

  row1.push({ text: "👢 Kick", callback_data: `userinfo:kick:${userId}` });

  // Row 2: Ban and media restriction
  const row2 = [];
  if (isBanned) {
    row2.push({ text: "✅ Unban", callback_data: `userinfo:unban:${userId}` });
  } else {
    row2.push({ text: "🚫 Ban", callback_data: `userinfo:ban:${userId}` });
  }

  if (isMediaRestricted) {
    row2.push({ text: "📷 Allow Media", callback_data: `userinfo:unrestrict_media:${userId}` });
  } else {
    row2.push({ text: "📵 Restrict Media", callback_data: `userinfo:restrict_media:${userId}` });
  }

  // Row 3: Quick actions submenu
  const row3 = [
    { text: "⚡ Quick Actions ▼", callback_data: `userinfo:quick_menu:${userId}` },
  ];

  buttons.push(row1, row2, row3);
  return buttons;
}

/**
 * Build quick actions submenu
 * @param {String} userId - Target user ID
 * @returns {Array} Inline keyboard array
 */
export function buildQuickActionsMenu(userId) {
  return [
    [
      { text: "⏱️ Mute 1h", callback_data: `userinfo:quick_mute:${userId}:3600` },
      { text: "⏱️ Mute 24h", callback_data: `userinfo:quick_mute:${userId}:86400` },
    ],
    [
      { text: "⏱️ Mute 7d", callback_data: `userinfo:quick_mute:${userId}:604800` },
      { text: "🗑️ Clear Warnings", callback_data: `userinfo:clear_warnings:${userId}` },
    ],
    [
      { text: "📋 View Audit Log", callback_data: `userinfo:audit_log:${userId}` },
    ],
    [
      { text: "« Back to Info", callback_data: `userinfo:back:${userId}` },
    ],
  ];
}

/**
 * Build confirmation buttons (Confirm/Cancel)
 * @param {String} action - Action type
 * @param {String} confirmId - Unique confirmation ID
 * @returns {Array} Inline keyboard array
 */
export function buildConfirmationButtons(action, confirmId) {
  return [
    [
      { text: "✅ Confirm", callback_data: `confirm_${action}_${confirmId}` },
      { text: "❌ Cancel", callback_data: `cancel_${action}_${confirmId}` },
    ],
  ];
}

/**
 * Build navigation buttons (Back/Close)
 * @param {String} backAction - Callback data for back button
 * @param {Boolean} includeClose - Whether to include close button
 * @returns {Array} Inline keyboard array
 */
export function buildNavigationButtons(backAction, includeClose = true) {
  const buttons = [];

  if (backAction) {
    buttons.push({ text: "« Back", callback_data: backAction });
  }

  if (includeClose) {
    buttons.push({ text: "✖️ Close", callback_data: "close_menu" });
  }

  return buttons.length > 0 ? [buttons] : [];
}

/**
 * Build report resolution action buttons
 * @param {String} reportId - Report ID
 * @returns {Array} Inline keyboard array
 */
export function buildReportActionButtons(reportId) {
  return [
    [
      { text: "⚠️ Warn", callback_data: `report:action:${reportId}:warn` },
      { text: "🔇 Mute", callback_data: `report:action:${reportId}:mute` },
      { text: "👢 Kick", callback_data: `report:action:${reportId}:kick` },
    ],
    [
      { text: "🚫 Ban", callback_data: `report:action:${reportId}:ban` },
      { text: "📵 Restrict Media", callback_data: `report:action:${reportId}:restrict_media` },
    ],
    [
      { text: "❌ Dismiss", callback_data: `report:action:${reportId}:dismiss` },
    ],
    [
      { text: "✍️ Add Notes", callback_data: `report:notes:${reportId}` },
      { text: "« Back to List", callback_data: "reports:list:1" },
    ],
  ];
}

/**
 * Build warning management buttons
 * @param {String} warningId - Warning ID
 * @returns {Array} Inline keyboard array (single row with remove button)
 */
export function buildWarningActionButton(warningId) {
  return { text: "🗑️ Remove", callback_data: `warning:remove:${warningId}` };
}

/**
 * Build clear all warnings button
 * @param {String} userId - User ID
 * @param {Number} warningCount - Number of warnings to clear
 * @returns {Array} Inline keyboard array
 */
export function buildClearAllWarningsButton(userId, warningCount) {
  return [
    [
      {
        text: `🧽 Clear All ${warningCount} Warning${warningCount !== 1 ? "s" : ""}`,
        callback_data: `warnings:clear_all:${userId}`,
      },
    ],
  ];
}

/**
 * Build post-warn quick action buttons
 * @param {String} userId - Target user ID
 * @param {String} warningId - Warning ID that was just issued
 * @returns {Array} Inline keyboard array
 */
export function buildPostWarnActions(userId, warningId) {
  return [
    [
      { text: "📋 View All Warnings", callback_data: `warnings:view:${userId}` },
      { text: "❌ Remove This Warning", callback_data: `warning:remove:${warningId}` },
    ],
    [
      { text: "⏱️ Add Cooldown", callback_data: `warn:cooldown_menu:${userId}` },
      { text: "🗑️ Delete Recent Message", callback_data: `warn:delete_msg:${userId}` },
    ],
  ];
}

/**
 * Build cooldown duration selector
 * @param {String} userId - Target user ID
 * @returns {Array} Inline keyboard array
 */
export function buildCooldownDurationMenu(userId) {
  return [
    [
      { text: "10m", callback_data: `cooldown:apply:${userId}:600` },
      { text: "30m", callback_data: `cooldown:apply:${userId}:1800` },
      { text: "1h", callback_data: `cooldown:apply:${userId}:3600` },
      { text: "2h", callback_data: `cooldown:apply:${userId}:7200` },
    ],
    [
      { text: "6h", callback_data: `cooldown:apply:${userId}:21600` },
      { text: "12h", callback_data: `cooldown:apply:${userId}:43200` },
      { text: "24h", callback_data: `cooldown:apply:${userId}:86400` },
    ],
    [
      { text: "« Cancel", callback_data: "close_menu" },
    ],
  ];
}

/**
 * Parse callback data into components
 * @param {String} callbackData - Callback data string
 * @returns {Object} Parsed components { prefix, action, params }
 */
export function parseCallbackData(callbackData) {
  const parts = callbackData.split(":");
  return {
    prefix: parts[0],
    action: parts[1],
    params: parts.slice(2),
  };
}

/**
 * Format action for display
 * @param {String} action - Action type
 * @returns {String} Formatted action name
 */
export function formatActionName(action) {
  const actionMap = {
    warn: "⚠️ Warning",
    mute: "🔇 Mute",
    unmute: "🔊 Unmute",
    kick: "👢 Kick",
    ban: "🚫 Ban",
    unban: "✅ Unban",
    restrict_media: "📵 Media Restriction",
    unrestrict_media: "📷 Media Unrestriction",
    dismiss: "❌ Dismissal",
  };

  return actionMap[action] || action;
}
