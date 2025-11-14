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

/**
 * @route   GET /api/moderation/warnings/:userId
 * @desc    Get all warnings for a specific user
 * @access  Private (requires users.warn permission)
 */
router.get(
  "/warnings/:userId",
  requirePermissions(["users.warn"]),
  moderationController.getUserWarnings
);

/**
 * @route   DELETE /api/moderation/warnings/:warningId
 * @desc    Remove a specific warning
 * @access  Private (requires users.warn permission)
 */
router.delete(
  "/warnings/:warningId",
  requirePermissions(["users.warn"]),
  moderationController.removeWarning
);

/**
 * @route   DELETE /api/moderation/warnings/user/:userId
 * @desc    Clear all warnings for a specific user
 * @access  Private (requires users.warn permission)
 */
router.delete(
  "/warnings/user/:userId",
  requirePermissions(["users.warn"]),
  moderationController.clearUserWarnings
);

/**
 * @route   GET /api/moderation/warnings
 * @desc    Get all warnings across all users
 * @access  Private (requires users.warn permission)
 */
router.get(
  "/warnings",
  requirePermissions(["users.warn"]),
  moderationController.getAllWarnings
);

export default router;
