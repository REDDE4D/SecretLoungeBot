// dashboard-api/controllers/exportController.js

import { User } from "../../src/models/User.js";
import { Activity } from "../../src/models/Activity.js";
import AuditLog from "../../src/models/AuditLog.js";
import {
  convertToCSV,
  convertToJSON,
  prepareUsersForExport,
  prepareAuditLogsForExport,
  getUsersExportColumns,
  getAuditLogsExportColumns,
} from "../utils/export.js";

/**
 * Export users data
 *
 * @route   GET /api/export/users
 * @query   format - csv or json (default: csv)
 * @query   filters - role, inLobby, status (same as user list filters)
 * @returns {file} CSV or JSON file download
 */
export async function exportUsers(req, res) {
  try {
    const { format = "csv", role, inLobby, status, search } = req.query;

    // Build filter query (same logic as user list)
    const filter = {};

    if (role) {
      filter.role = role === "regular" ? null : role;
    }

    if (inLobby !== undefined) {
      filter.inLobby = inLobby === "true";
    }

    if (search) {
      filter.$or = [
        { alias: { $regex: search, $options: "i" } },
        { _id: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch users
    const users = await User.find(filter).lean();

    // Fetch activity data for all users
    const userIds = users.map((u) => u._id);
    const activities = await Activity.find({ _id: { $in: userIds } }).lean();

    // Create map of activities
    const activityMap = {};
    activities.forEach((activity) => {
      activityMap[activity._id] = activity;
    });

    // Filter by status if provided
    let enrichedUsers = users.map((user) => ({
      ...user,
      activity: activityMap[user._id] || null,
    }));

    if (status) {
      enrichedUsers = enrichedUsers.filter(
        (user) => (user.activity?.status || "offline") === status
      );
    }

    // Prepare data for export
    const exportData = prepareUsersForExport(enrichedUsers);

    // Generate file based on format
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="users_export_${Date.now()}.json"`
      );
      res.send(convertToJSON(exportData, true));
    } else {
      // Default to CSV
      const columns = getUsersExportColumns();
      const csv = convertToCSV(exportData, columns);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="users_export_${Date.now()}.csv"`
      );
      res.send(csv);
    }
  } catch (error) {
    console.error("Error exporting users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export users",
    });
  }
}

/**
 * Export audit logs
 *
 * @route   GET /api/export/audit-logs
 * @query   format - csv or json (default: csv)
 * @query   filters - action, moderatorId, startDate, endDate
 * @returns {file} CSV or JSON file download
 */
export async function exportAuditLogs(req, res) {
  try {
    const {
      format = "csv",
      action,
      moderatorId,
      startDate,
      endDate,
      search,
    } = req.query;

    // Build filter query
    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (moderatorId) {
      filter.moderatorId = moderatorId;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    if (search) {
      filter.$or = [
        { moderatorAlias: { $regex: search, $options: "i" } },
        { targetAlias: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch audit logs (limit to 10000 for performance)
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    // Prepare data for export
    const exportData = prepareAuditLogsForExport(logs);

    // Generate file based on format
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit_logs_export_${Date.now()}.json"`
      );
      res.send(convertToJSON(exportData, true));
    } else {
      // Default to CSV
      const columns = getAuditLogsExportColumns();
      const csv = convertToCSV(exportData, columns);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit_logs_export_${Date.now()}.csv"`
      );
      res.send(csv);
    }
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export audit logs",
    });
  }
}

/**
 * Export reports data
 *
 * @route   GET /api/export/reports
 * @query   format - csv or json (default: csv)
 * @query   status - pending, resolved, dismissed
 * @returns {file} CSV or JSON file download
 */
export async function exportReports(req, res) {
  try {
    const { format = "csv", status } = req.query;
    const { Report } = await import("../../src/models/Report.js");

    // Build filter query
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Fetch reports
    const reports = await Report.find(filter).sort({ createdAt: -1 }).lean();

    // Prepare data for export
    const exportData = reports.map((report) => ({
      id: report._id,
      createdAt: new Date(report.createdAt).toISOString(),
      reporter: report.reporterAlias || report.reporterId,
      reporterId: report.reporterId,
      reportedUser: report.reportedAlias,
      reportedUserId: report.reportedUserId,
      messagePreview: report.messagePreview || "N/A",
      messageType: report.messageType || "text",
      reason: report.reason || "N/A",
      status: report.status,
      resolvedAt: report.resolvedAt
        ? new Date(report.resolvedAt).toISOString()
        : "N/A",
      resolvedBy: report.resolvedByAlias || report.resolvedBy || "N/A",
      resolutionAction: report.resolutionAction || "N/A",
      resolutionNotes: report.resolutionNotes || "N/A",
    }));

    // Column definitions for reports
    const columns = [
      { key: "id", label: "Report ID" },
      { key: "createdAt", label: "Created At" },
      { key: "reporter", label: "Reporter" },
      { key: "reporterId", label: "Reporter ID" },
      { key: "reportedUser", label: "Reported User" },
      { key: "reportedUserId", label: "Reported User ID" },
      { key: "messagePreview", label: "Message Preview" },
      { key: "messageType", label: "Message Type" },
      { key: "reason", label: "Reason" },
      { key: "status", label: "Status" },
      { key: "resolvedAt", label: "Resolved At" },
      { key: "resolvedBy", label: "Resolved By" },
      { key: "resolutionAction", label: "Resolution Action" },
      { key: "resolutionNotes", label: "Resolution Notes" },
    ];

    // Generate file based on format
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="reports_export_${Date.now()}.json"`
      );
      res.send(convertToJSON(exportData, true));
    } else {
      // Default to CSV
      const csv = convertToCSV(exportData, columns);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="reports_export_${Date.now()}.csv"`
      );
      res.send(csv);
    }
  } catch (error) {
    console.error("Error exporting reports:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export reports",
    });
  }
}
