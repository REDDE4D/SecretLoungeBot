// dashboard-api/routes/users.js

import express from "express";
import * as usersController from "../controllers/usersController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermissions } from "../middleware/rbac.js";

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get paginated list of users with filters
 * @access  Private (requires users.view permission)
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=50] - Items per page (max 100)
 * @query   {string} [search] - Search by alias
 * @query   {string} [role] - Filter by role
 * @query   {boolean} [inLobby] - Filter by lobby membership
 * @query   {string} [status] - Filter by status (online/idle/offline)
 * @query   {string} [sortBy=alias] - Sort field (alias/joinDate/totalMessages)
 * @query   {string} [sortOrder=asc] - Sort order (asc/desc)
 */
router.get(
  "/",
  requirePermissions(["users.view"]),
  usersController.getUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get detailed user information
 * @access  Private (requires users.view_details permission)
 */
router.get(
  "/:id",
  requirePermissions(["users.view_details"]),
  usersController.getUserDetails
);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Private (requires users.manage_roles permission)
 * @body    {string} role - New role (admin/mod/whitelist/null)
 */
router.put(
  "/:id/role",
  requirePermissions(["users.manage_roles"]),
  usersController.updateRole
);

/**
 * @route   POST /api/users/:id/ban
 * @desc    Ban a user
 * @access  Private (requires users.ban permission)
 * @body    {number} [duration] - Duration in seconds (null for permanent)
 * @body    {string} [reason] - Ban reason
 */
router.post(
  "/:id/ban",
  requirePermissions(["users.ban"]),
  usersController.banUser
);

/**
 * @route   POST /api/users/:id/mute
 * @desc    Mute a user
 * @access  Private (requires users.mute permission)
 * @body    {number} [duration] - Duration in seconds (null for permanent)
 * @body    {string} [reason] - Mute reason
 */
router.post(
  "/:id/mute",
  requirePermissions(["users.mute"]),
  usersController.muteUser
);

/**
 * @route   POST /api/users/:id/kick
 * @desc    Kick a user from lobby
 * @access  Private (requires users.kick permission)
 * @body    {string} [reason] - Kick reason
 */
router.post(
  "/:id/kick",
  requirePermissions(["users.kick"]),
  usersController.kickUser
);

/**
 * @route   DELETE /api/users/:id/restrictions
 * @desc    Remove all restrictions from a user
 * @access  Private (requires users.ban or users.mute permission)
 */
router.delete(
  "/:id/restrictions",
  requirePermissions(["users.ban", "users.mute"], { requireAll: false }),
  usersController.removeRestrictions
);

/**
 * @route   PUT /api/users/:id/media-restriction
 * @desc    Toggle media restriction for a user
 * @access  Private (requires users.restrict_media permission)
 * @body    {boolean} restricted - Whether to restrict media
 */
router.put(
  "/:id/media-restriction",
  requirePermissions(["users.restrict_media"]),
  usersController.toggleMediaRestriction
);

/**
 * @route   POST /api/users/:id/warn
 * @desc    Issue a warning to a user
 * @access  Private (requires users.warn permission)
 * @body    {string} [reason] - Warning reason
 */
router.post(
  "/:id/warn",
  requirePermissions(["users.warn"]),
  usersController.warnUser
);

/**
 * @route   GET /api/users/:id/roles
 * @desc    Get user's roles (system role + custom roles)
 * @access  Private (requires users.view_details permission)
 */
router.get(
  "/:id/roles",
  requirePermissions(["users.view_details"]),
  usersController.getUserRoles
);

/**
 * @route   POST /api/users/:id/roles
 * @desc    Assign a custom role to a user
 * @access  Private (requires users.manage_roles permission)
 * @body    {string} roleId - Custom role ID to assign
 */
router.post(
  "/:id/roles",
  requirePermissions(["users.manage_roles"]),
  usersController.assignCustomRole
);

/**
 * @route   DELETE /api/users/:id/roles/:roleId
 * @desc    Remove a custom role from a user
 * @access  Private (requires users.manage_roles permission)
 */
router.delete(
  "/:id/roles/:roleId",
  requirePermissions(["users.manage_roles"]),
  usersController.removeCustomRole
);

export default router;
