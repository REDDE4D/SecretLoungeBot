// dashboard-api/routes/batch.js

import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requirePermissions } from "../middleware/rbac.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  batchBan,
  batchUnban,
  batchMute,
  batchUnmute,
  batchKick,
  batchAssignRole,
} from "../controllers/batchController.js";

const router = express.Router();

// All batch routes require authentication
router.use(authenticate);

/**
 * Batch ban users
 * POST /api/batch/ban
 * Body: { userIds: string[], duration: string|null, reason: string }
 * Permissions: users.ban
 */
router.post("/ban", requirePermissions([PERMISSIONS.USERS_BAN]), batchBan);

/**
 * Batch unban users
 * POST /api/batch/unban
 * Body: { userIds: string[] }
 * Permissions: users.ban
 */
router.post("/unban", requirePermissions([PERMISSIONS.USERS_BAN]), batchUnban);

/**
 * Batch mute users
 * POST /api/batch/mute
 * Body: { userIds: string[], duration: string, reason: string }
 * Permissions: users.mute
 */
router.post("/mute", requirePermissions([PERMISSIONS.USERS_MUTE]), batchMute);

/**
 * Batch unmute users
 * POST /api/batch/unmute
 * Body: { userIds: string[] }
 * Permissions: users.mute
 */
router.post("/unmute", requirePermissions([PERMISSIONS.USERS_MUTE]), batchUnmute);

/**
 * Batch kick users from lobby
 * POST /api/batch/kick
 * Body: { userIds: string[], reason: string }
 * Permissions: users.kick
 */
router.post("/kick", requirePermissions([PERMISSIONS.USERS_KICK]), batchKick);

/**
 * Batch assign role to users
 * POST /api/batch/assign-role
 * Body: { userIds: string[], role: string }
 * Permissions: users.manage_roles
 */
router.post(
  "/assign-role",
  requirePermissions([PERMISSIONS.USERS_MANAGE_ROLES]),
  batchAssignRole
);

export default router;
