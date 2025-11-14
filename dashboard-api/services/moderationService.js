// dashboard-api/services/moderationService.js

import mongoose from "mongoose";

// Helper to get models at runtime
const getReport = () => mongoose.model("Report");
const getAuditLogModel = () => mongoose.model("AuditLog");
const getUser = () => mongoose.model("User");
const getWarning = () => mongoose.model("Warning");

/**
 * Get reports with filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Reports with pagination
 */
export async function getReports(options = {}) {
  const Report = getReport();

  const {
    page = 1,
    limit = 50,
    status = null,
    reportedUserId = null,
  } = options;

  // Build query
  const query = {};

  if (status) {
    query.status = status;
  }

  if (reportedUserId) {
    query.reportedUserId = reportedUserId;
  }

  // Calculate pagination
  const skip = (page - 1) * Math.min(limit, 100);
  const actualLimit = Math.min(limit, 100);

  // Get reports
  const reports = await Report.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(actualLimit)
    .lean();

  // Get total count
  const total = await Report.countDocuments(query);

  return {
    reports,
    pagination: {
      page: parseInt(page),
      limit: actualLimit,
      total,
      totalPages: Math.ceil(total / actualLimit),
    },
  };
}

/**
 * Get report details
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Report details
 */
export async function getReportDetails(reportId) {
  const report = await Report.findById(reportId).lean();

  if (!report) {
    throw new Error("Report not found");
  }

  return report;
}

/**
 * Resolve a report
 * @param {string} reportId - Report ID
 * @param {string} action - Resolution action
 * @param {string} notes - Resolution notes
 * @param {string} moderatorId - ID of moderator resolving the report
 * @returns {Promise<Object>} Updated report
 */
export async function resolveReport(reportId, action, notes, moderatorId) {
  const Report = getReport();
  const User = getUser();

  const validActions = [
    "none",
    "warned",
    "muted",
    "banned",
    "kicked",
    "media_restricted",
  ];
  if (!validActions.includes(action)) {
    throw new Error("Invalid resolution action");
  }

  const report = await Report.findByIdAndUpdate(
    reportId,
    {
      status: "resolved",
      resolvedBy: moderatorId,
      resolvedAt: new Date(),
      resolutionAction: action,
      resolutionNotes: notes || "",
    },
    { new: true }
  );

  if (!report) {
    throw new Error("Report not found");
  }

  // Get moderator alias for audit log
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLogModel().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "report_resolve",
    targetUserId: report.reportedUserId,
    targetAlias: report.reportedAlias,
    reason: `Report resolved with action: ${action}`,
    details: {
      reportId: report._id.toString(),
      resolutionAction: action,
      notes,
    },
  });

  return report;
}

/**
 * Get audit log with filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Audit logs with pagination
 */
export async function getAuditLog(options = {}) {
  const {
    page = 1,
    limit = 50,
    category = null,
    action = null,
    moderatorId = null,
    targetUserId = null,
    startDate = null,
    endDate = null,
  } = options;

  // Build query
  const query = {};

  if (category) {
    query.category = category;
  }

  if (action) {
    query.action = action;
  }

  if (moderatorId) {
    query.moderatorId = moderatorId;
  }

  if (targetUserId) {
    query.targetUserId = targetUserId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  // Calculate pagination
  const skip = (page - 1) * Math.min(limit, 100);
  const actualLimit = Math.min(limit, 100);

  // Get audit logs
  const logs = await getAuditLogModel()
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(actualLimit)
    .lean();

  // Get total count
  const total = await getAuditLogModel().countDocuments(query);

  // Transform logs to match frontend expectations
  const transformedLogs = logs.map((log) => ({
    _id: log._id,
    action: log.action,
    performedBy: log.moderatorId,
    performedByAlias: log.moderatorAlias || "System",
    targetUserId: log.targetUserId,
    targetAlias: log.targetAlias,
    reason: log.reason || "",
    details: log.details || {},
    timestamp: log.createdAt,
  }));

  return {
    logs: transformedLogs,
    pagination: {
      page: parseInt(page),
      limit: actualLimit,
      total,
      totalPages: Math.ceil(total / actualLimit),
    },
  };
}

/**
 * Get all warnings for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of warnings
 */
export async function getUserWarnings(userId) {
  const Warning = getWarning();
  const User = getUser();

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error("User not found");
  }

  const warnings = await Warning.find({ userId })
    .sort({ timestamp: -1 })
    .lean();

  return {
    userId,
    alias: user.alias || "Unknown",
    totalWarnings: warnings.length,
    warnings: warnings.map((w) => ({
      id: w._id,
      issuedBy: w.issuedBy,
      issuedByAlias: w.issuedByAlias,
      reason: w.reason,
      timestamp: w.timestamp,
    })),
  };
}

/**
 * Remove a specific warning
 * @param {string} warningId - Warning ID
 * @param {string} moderatorId - ID of moderator removing the warning
 * @returns {Promise<Object>} Result with userId and remainingCount
 */
export async function removeWarning(warningId, moderatorId) {
  const Warning = getWarning();
  const User = getUser();

  const warning = await Warning.findById(warningId);
  if (!warning) {
    throw new Error("Warning not found");
  }

  const userId = warning.userId;

  // Remove the warning
  await Warning.deleteOne({ _id: warningId });

  // Update warning count in User model
  const remainingCount = await Warning.countDocuments({ userId });
  await User.updateOne({ _id: userId }, { warnings: remainingCount });

  // Get moderator and user aliases for audit log
  const moderator = await User.findById(moderatorId).lean();
  const targetUser = await User.findById(userId).lean();

  // Log to audit log
  await getAuditLogModel().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "remove_warning",
    targetUserId: userId,
    targetAlias: targetUser?.alias || "Unknown",
    reason: `Warning removed`,
    details: {
      warningId: warningId.toString(),
      originalReason: warning.reason,
      remainingWarnings: remainingCount,
    },
  });

  return { userId, remainingCount };
}

/**
 * Clear all warnings for a specific user
 * @param {string} userId - User ID
 * @param {string} moderatorId - ID of moderator clearing warnings
 * @returns {Promise<void>}
 */
export async function clearUserWarnings(userId, moderatorId) {
  const Warning = getWarning();
  const User = getUser();

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error("User not found");
  }

  // Get warning count before deletion
  const warningCount = await Warning.countDocuments({ userId });

  // Remove all warnings
  await Warning.deleteMany({ userId });

  // Reset warning count in User model
  await User.updateOne({ _id: userId }, { warnings: 0 });

  // Get moderator alias for audit log
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLogModel().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "clear_warnings",
    targetUserId: userId,
    targetAlias: user.alias || "Unknown",
    reason: `All warnings cleared`,
    details: {
      warningsCleared: warningCount,
    },
  });
}

/**
 * Get all warnings across all users with pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Warnings with pagination
 */
export async function getAllWarnings(options = {}) {
  const Warning = getWarning();
  const User = getUser();

  const { page = 1, limit = 50, userId = null } = options;

  // Build query
  const query = {};
  if (userId) {
    query.userId = userId;
  }

  // Calculate pagination
  const skip = (page - 1) * Math.min(limit, 100);
  const actualLimit = Math.min(limit, 100);

  // Get warnings
  const warnings = await Warning.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(actualLimit)
    .lean();

  // Get total count
  const total = await Warning.countDocuments(query);

  // Get user aliases for all warnings
  const userIds = [...new Set(warnings.map((w) => w.userId))];
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((u) => [u._id, u.alias || "Unknown"]));

  // Transform warnings with user aliases
  const transformedWarnings = warnings.map((warning) => ({
    id: warning._id,
    userId: warning.userId,
    userAlias: userMap.get(warning.userId) || "Unknown",
    issuedBy: warning.issuedBy,
    issuedByAlias: warning.issuedByAlias,
    reason: warning.reason,
    timestamp: warning.timestamp,
  }));

  return {
    warnings: transformedWarnings,
    pagination: {
      page: parseInt(page),
      limit: actualLimit,
      total,
      totalPages: Math.ceil(total / actualLimit),
    },
  };
}
