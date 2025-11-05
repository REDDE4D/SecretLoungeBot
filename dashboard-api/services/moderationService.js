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
    category: "moderation",
    action: "report_resolve",
    targetUserId: report.reportedUserId,
    targetAlias: report.reportedAlias,
    details: `Report resolved with action: ${action}`,
    metadata: {
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
    query.timestamp = {};
    if (startDate) {
      query.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      query.timestamp.$lte = new Date(endDate);
    }
  }

  // Calculate pagination
  const skip = (page - 1) * Math.min(limit, 100);
  const actualLimit = Math.min(limit, 100);

  // Get audit logs
  const logs = await getAuditLogModel().find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(actualLimit)
    .lean();

  // Get total count
  const total = await getAuditLogModel().countDocuments(query);

  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: actualLimit,
      total,
      totalPages: Math.ceil(total / actualLimit),
    },
  };
}
