// dashboard-api/routes/moderation.js

import express from "express";
import * as moderationController from "../controllers/moderationController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermissions } from "../middleware/rbac.js";

const router = express.Router();

// All moderation routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/moderation/reports
 * @desc    Get reports with filters
 * @access  Private (requires moderation.view_reports permission)
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=50] - Items per page
 * @query   {string} [status] - Filter by status (pending/resolved/dismissed)
 * @query   {string} [reportedUserId] - Filter by reported user ID
 */
router.get(
  "/reports",
  requirePermissions(["moderation.view_reports"]),
  moderationController.getReports
);

/**
 * @route   GET /api/moderation/reports/:id
 * @desc    Get report details
 * @access  Private (requires moderation.view_reports permission)
 */
router.get(
  "/reports/:id",
  requirePermissions(["moderation.view_reports"]),
  moderationController.getReportDetails
);

/**
 * @route   PUT /api/moderation/reports/:id/resolve
 * @desc    Resolve a report
 * @access  Private (requires moderation.resolve_reports permission)
 * @body    {string} action - Resolution action (none/warned/muted/banned/kicked/media_restricted)
 * @body    {string} [notes] - Resolution notes
 */
router.put(
  "/reports/:id/resolve",
  requirePermissions(["moderation.resolve_reports"]),
  moderationController.resolveReport
);

/**
 * @route   GET /api/moderation/audit-logs
 * @desc    Get audit log with filters
 * @access  Private (requires moderation.view_audit permission)
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=50] - Items per page
 * @query   {string} [category] - Filter by category
 * @query   {string} [action] - Filter by action
 * @query   {string} [moderatorId] - Filter by moderator ID
 * @query   {string} [targetUserId] - Filter by target user ID
 * @query   {string} [startDate] - Filter by start date (ISO 8601)
 * @query   {string} [endDate] - Filter by end date (ISO 8601)
 */
router.get(
  "/audit-logs",
  requirePermissions(["moderation.view_audit"]),
  moderationController.getAuditLogs
);

export default router;
