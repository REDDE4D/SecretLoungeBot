// dashboard-api/services/settingsService.js

import mongoose from "mongoose";

// Helper to get models at runtime
const getSetting = () => mongoose.model("Setting");
const getAuditLog = () => mongoose.model("AuditLog");

/**
 * Get all settings
 * @returns {Promise<Object>} Settings
 */
export async function getSettings() {
  const Setting = getSetting();

  let settings = await Setting.findById("global").lean();

  // Create default settings if they don't exist
  if (!settings) {
    settings = await Setting.create({ _id: "global" });
    settings = settings.toObject();
  }

  // Provide default spam detection config structure
  const defaultSpamConfig = {
    flood: {
      enabled: false,
      maxMessages: 5,
      timeWindow: 10,
      muteDuration: 300,
    },
    linkSpam: {
      enabled: false,
      maxLinks: 3,
      timeWindow: 60,
    },
    rapidFire: {
      enabled: false,
      maxMessages: 10,
      timeWindow: 60,
    },
  };

  const spamConfig = settings.spamDetectionConfig || {};
  const mergedSpamConfig = {
    flood: { ...defaultSpamConfig.flood, ...(spamConfig.flood || {}) },
    linkSpam: { ...defaultSpamConfig.linkSpam, ...(spamConfig.linkSpam || {}) },
    rapidFire: { ...defaultSpamConfig.rapidFire, ...(spamConfig.rapidFire || {}) },
  };

  return {
    inviteOnly: settings.inviteOnly,
    slowmode: {
      enabled: settings.slowmodeEnabled,
      seconds: settings.slowmodeSeconds,
    },
    maintenance: {
      enabled: settings.maintenanceMode,
      message: settings.maintenanceMessage,
    },
    welcome: {
      enabled: settings.welcomeEnabled,
      message: settings.welcomeMessage,
    },
    rules: settings.rules || [],
    spam: mergedSpamConfig,
  };
}

/**
 * Update invite-only mode
 * @param {boolean} enabled - Enable invite-only mode
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Updated setting
 */
export async function updateInviteMode(enabled, moderatorId) {
  const Setting = getSetting();
  const AuditLog = getAuditLog();

  const settings = await Setting.findByIdAndUpdate(
    "global",
    { inviteOnly: enabled },
    { upsert: true, new: true }
  );

  // Log to audit log
  await AuditLog.create({
    moderatorId,
    category: "settings",
    action: enabled ? "invite_mode_enable" : "invite_mode_disable",
    details: `Invite-only mode ${enabled ? "enabled" : "disabled"}`,
    metadata: { inviteOnly: enabled },
  });

  return { inviteOnly: settings.inviteOnly };
}

/**
 * Update slowmode settings
 * @param {boolean} enabled - Enable slowmode
 * @param {number} seconds - Delay in seconds
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Updated setting
 */
export async function updateSlowmode(enabled, seconds, moderatorId) {
  const Setting = getSetting();
  const AuditLog = getAuditLog();

  if (seconds < 1 || seconds > 3600) {
    throw new Error("Slowmode seconds must be between 1 and 3600");
  }

  const settings = await Setting.findByIdAndUpdate(
    "global",
    { slowmodeEnabled: enabled, slowmodeSeconds: seconds },
    { upsert: true, new: true }
  );

  // Log to audit log
  await AuditLog.create({
    moderatorId,
    category: "settings",
    action: enabled ? "slowmode_enable" : "slowmode_disable",
    details: `Slowmode ${enabled ? "enabled" : "disabled"}${enabled ? ` (${seconds}s)` : ""}`,
    metadata: { enabled, seconds },
  });

  return {
    enabled: settings.slowmodeEnabled,
    seconds: settings.slowmodeSeconds,
  };
}

/**
 * Update maintenance mode
 * @param {boolean} enabled - Enable maintenance mode
 * @param {string} message - Maintenance message
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Updated setting
 */
export async function updateMaintenance(enabled, message, moderatorId) {
  const Setting = getSetting();
  const AuditLog = getAuditLog();

  const settings = await Setting.findByIdAndUpdate(
    "global",
    { maintenanceMode: enabled, maintenanceMessage: message },
    { upsert: true, new: true }
  );

  // Log to audit log
  await AuditLog.create({
    moderatorId,
    category: "settings",
    action: enabled ? "maintenance_enable" : "maintenance_disable",
    details: `Maintenance mode ${enabled ? "enabled" : "disabled"}`,
    metadata: { enabled, message },
  });

  return {
    enabled: settings.maintenanceMode,
    message: settings.maintenanceMessage,
  };
}

/**
 * Update welcome message settings
 * @param {boolean} enabled - Enable welcome message
 * @param {string} message - Welcome message
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Updated setting
 */
export async function updateWelcome(enabled, message, moderatorId) {
  const Setting = getSetting();
  const AuditLog = getAuditLog();

  const settings = await Setting.findByIdAndUpdate(
    "global",
    { welcomeEnabled: enabled, welcomeMessage: message },
    { upsert: true, new: true }
  );

  // Log to audit log
  await AuditLog.create({
    moderatorId,
    category: "settings",
    action: "welcome_update",
    details: `Welcome message ${enabled ? "enabled" : "disabled"}`,
    metadata: { enabled, message },
  });

  return {
    enabled: settings.welcomeEnabled,
    message: settings.welcomeMessage,
  };
}

/**
 * Update rules
 * @param {Array} rules - Array of rule objects with emoji and text
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Updated rules
 */
export async function updateRules(rules, moderatorId) {
  const Setting = getSetting();
  const AuditLog = getAuditLog();

  const settings = await Setting.findByIdAndUpdate(
    "global",
    { rules },
    { upsert: true, new: true }
  );

  // Log to audit log
  await AuditLog.create({
    moderatorId,
    category: "settings",
    action: "rules_update",
    details: `Rules updated (${rules.length} rules)`,
    metadata: { rulesCount: rules.length },
  });

  return { rules: settings.rules };
}

/**
 * Update spam detection configuration
 * @param {Object} spamConfig - Spam detection configuration
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Updated spam config
 */
export async function updateSpamConfig(spamConfig, moderatorId) {
  const Setting = getSetting();
  const AuditLog = getAuditLog();

  const settings = await Setting.findByIdAndUpdate(
    "global",
    { spamDetectionConfig: spamConfig },
    { upsert: true, new: true }
  );

  // Log to audit log
  await AuditLog.create({
    moderatorId,
    category: "settings",
    action: "spam_config_update",
    details: "Spam detection configuration updated",
    metadata: spamConfig,
  });

  return { spam: settings.spamDetectionConfig };
}
