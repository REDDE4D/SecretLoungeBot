// dashboard-api/controllers/moderationController.js

import * as moderationService from "../services/moderationService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { z } from "zod";

/**
 * GET /api/moderation/reports
 * Get reports with filters
 */
export const getReports = asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50,
    status: req.query.status || null,
    reportedUserId: req.query.reportedUserId || null,
  };

  const result = await moderationService.getReports(options);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/moderation/reports/:id
 * Get report details
 */
export const getReportDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await moderationService.getReportDetails(id);

  res.json({
    success: true,
    data: report,
  });
});

/**
 * PUT /api/moderation/reports/:id/resolve
 * Resolve a report
 */
export const resolveReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    action: z.enum([
      "none",
      "warned",
      "muted",
      "banned",
      "kicked",
      "media_restricted",
    ]),
    notes: z.string().optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const { action, notes } = validation.data;

  const report = await moderationService.resolveReport(
    id,
    action,
    notes,
    req.user.id
  );

  res.json({
    success: true,
    message: "Report resolved",
    data: report,
  });
});

/**
 * GET /api/moderation/audit-logs
 * Get audit log with filters
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50,
    category: req.query.category || null,
    action: req.query.action || null,
    moderatorId: req.query.moderatorId || null,
    targetUserId: req.query.targetUserId || null,
    startDate: req.query.startDate || null,
    endDate: req.query.endDate || null,
  };

  const result = await moderationService.getAuditLog(options);

  res.json({
    success: true,
    data: result,
  });
});
