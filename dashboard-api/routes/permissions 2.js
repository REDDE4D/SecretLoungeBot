// dashboard-api/routes/permissions.js

import express from "express";
import * as permissionsController from "../controllers/permissionsController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermissions } from "../middleware/rbac.js";

const router = express.Router();

// All permission routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/permissions
 * @desc    Get all available permissions and role mappings
 * @access  Private (requires permissions.view permission)
 */
router.get(
  "/",
  requirePermissions(["permissions.view"]),
  permissionsController.getAllPermissions
);

/**
 * @route   GET /api/permissions/roles
 * @desc    Get all roles with their permissions and user counts
 * @access  Private (requires permissions.view permission)
 */
router.get(
  "/roles",
  requirePermissions(["permissions.view"]),
  permissionsController.getRoles
);

/**
 * @route   GET /api/permissions/roles/:role/users
 * @desc    Get users with a specific role
 * @access  Private (requires permissions.view permission)
 */
router.get(
  "/roles/:role/users",
  requirePermissions(["permissions.view"]),
  permissionsController.getUsersByRole
);

/**
 * @route   POST /api/permissions/roles
 * @desc    Create a new custom role
 * @access  Private (requires permissions.manage_roles permission)
 */
router.post(
  "/roles",
  requirePermissions(["permissions.manage_roles"]),
  permissionsController.createRole
);

/**
 * @route   PUT /api/permissions/roles/:id
 * @desc    Update a custom role
 * @access  Private (requires permissions.manage_roles permission)
 */
router.put(
  "/roles/:id",
  requirePermissions(["permissions.manage_roles"]),
  permissionsController.updateRole
);

/**
 * @route   DELETE /api/permissions/roles/:id
 * @desc    Delete a custom role
 * @access  Private (requires permissions.manage_roles permission)
 */
router.delete(
  "/roles/:id",
  requirePermissions(["permissions.manage_roles"]),
  permissionsController.deleteRole
);

/**
 * @route   PUT /api/permissions/roles/:id/permissions
 * @desc    Update role permissions
 * @access  Private (requires permissions.assign_permissions permission)
 */
router.put(
  "/roles/:id/permissions",
  requirePermissions(["permissions.assign_permissions"]),
  permissionsController.updateRolePermissions
);

export default router;
