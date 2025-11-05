// dashboard-api/utils/models.js

import mongoose from "mongoose";

/**
 * Helper to get registered models safely
 * Use this instead of importing models directly to ensure they're registered with the active connection
 *
 * @param {string} modelName - Name of the model to get
 * @returns {mongoose.Model} The registered Mongoose model
 */
export function getModel(modelName) {
  return mongoose.model(modelName);
}

// Convenience exports for commonly used models
export const getUser = () => getModel("User");
export const getActivity = () => getModel("Activity");
export const getRelayedMessage = () => getModel("RelayedMessage");
export const getReport = () => getModel("Report");
export const getSpamDetection = () => getModel("SpamDetection");
export const getAuditLog = () => getModel("AuditLog");
export const getPoll = () => getModel("Poll");
export const getFilter = () => getModel("Filter");
export const getSetting = () => getModel("Setting");
export const getInvite = () => getModel("Invite");
export const getPinnedMessage = () => getModel("PinnedMessage");
export const getScheduledAnnouncement = () => getModel("ScheduledAnnouncement");
export const getSession = () => getModel("Session");
export const getLoginAttempt = () => getModel("LoginAttempt");
export const getLoginToken = () => getModel("LoginToken");
