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
 * Require admin role
 */
export const requireAdmin = requireRole("admin");

/**
 * Require moderator or admin role
 */
export const requireModerator = requireRole(["mod", "admin"]);

/**
 * Allow resource owner or admin
 * Checks if req.user.id matches req.params.id or user is admin
 */
export function requireOwnerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const isOwner = req.user.id === req.params.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
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
