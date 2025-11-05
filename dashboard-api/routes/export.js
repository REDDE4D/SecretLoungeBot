// dashboard-api/routes/export.js

import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requirePermissions } from "../middleware/rbac.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  exportUsers,
  exportAuditLogs,
  exportReports,
} from "../controllers/exportController.js";

const router = express.Router();

// All export routes require authentication
router.use(authenticate);

/**
 * Export users to CSV or JSON
 * GET /api/export/users?format=csv&role=admin&inLobby=true
 * Permissions: users.export
 */
router.get("/users", requirePermissions([PERMISSIONS.USERS_EXPORT]), exportUsers);

/**
 * Export audit logs to CSV or JSON
 * GET /api/export/audit-logs?format=csv&action=ban&startDate=2025-01-01
 * Permissions: moderation.export_audit
 */
router.get(
  "/audit-logs",
  requirePermissions([PERMISSIONS.MODERATION_EXPORT_AUDIT]),
  exportAuditLogs
);

/**
 * Export reports to CSV or JSON
 * GET /api/export/reports?format=csv&status=pending
 * Permissions: moderation.view_reports
 */
router.get(
  "/reports",
  requirePermissions([PERMISSIONS.MODERATION_VIEW_REPORTS]),
  exportReports
);

export default router;
