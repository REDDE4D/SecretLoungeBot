// dashboard-api/services/moderationService.js

import mongoose from "mongoose";

// Helper to get models at runtime
const getReport = () => mongoose.model("Report");
const getAuditLogModel = () => mongoose.model("AuditLog");
const getUser = () => mongoose.model("User");

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
