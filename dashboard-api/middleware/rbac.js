import { hasPermission, hasAnyPermission, hasAllPermissions } from "../config/permissions.js";

/**
 * Require specific permission(s)
 *
 * @param {string|Array<string>} permissions - Required permission(s)
 * @param {string} mode - 'any' or 'all' (default: 'any')
 * @returns {Function} - Express middleware
 */
export function requirePermission(permissions, mode = "any") {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userPermissions = req.user.permissions || [];

    let hasAccess = false;

    if (mode === "all") {
      hasAccess = hasAllPermissions(userPermissions, requiredPermissions);
    } else {
      hasAccess = hasAnyPermission(userPermissions, requiredPermissions);
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        required: requiredPermissions,
      });
    }

    next();
  };
}

/**
 * Require specific role(s)
 *
 * @param {string|Array<string>} roles - Required role(s)
 * @returns {Function} - Express middleware
 */
export function requireRole(roles) {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role;

    if (!requiredRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient role",
        required: requiredRoles,
        current: userRole,
      });
    }

    next();
  };
}

/**
 * Require owner role
 */
export const requireOwner = requireRole("owner");

/**
 * Require admin or owner role
 */
export const requireAdmin = requireRole(["admin", "owner"]);

/**
 * Require moderator, admin, or owner role
 */
export const requireModerator = requireRole(["mod", "admin", "owner"]);

/**
 * Allow resource owner or admin/bot owner
 * Checks if req.user.id matches req.params.id or user is admin/owner
 */
export function requireOwnerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const isResourceOwner = req.user.id === req.params.id;
  const isAdmin = req.user.role === "admin";
  const isBotOwner = req.user.role === "owner";

  if (!isResourceOwner && !isAdmin && !isBotOwner) {
    return res.status(403).json({
      success: false,
      message: "You can only access your own resources",
    });
  }

  next();
}

/**
 * Alias for requirePermission (backwards compatibility)
 */
export const requirePermissions = requirePermission;
