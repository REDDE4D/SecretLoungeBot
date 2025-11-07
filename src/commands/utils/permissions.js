import { getRole, getUserPermissions, ensureOwnerRole } from "../../users/index.js";
import { hasPermission as checkPermission } from "../../../dashboard-api/config/permissions.js";

const OWNER_ID = process.env.ADMIN_ID;

/**
 * Role-based permission middleware for commands
 * @param {string|string[]} requiredRole - 'admin', 'mod', 'owner', ['admin', 'mod'], or null for public
 * @returns {Function} Middleware function
 */
export function requireRole(requiredRole) {
  return async (ctx, next) => {
    // Ensure owner has the owner role in database
    await ensureOwnerRole(ctx.from.id);

    // Public command - no role check needed
    if (!requiredRole) {
      return next();
    }

    const userRole = await getRole(ctx.from.id);
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Owner role has access to everything
    if (userRole === "owner") {
      return next();
    }

    // Check if user has required role
    if (!allowedRoles.includes(userRole)) {
      // Silently ignore unauthorized access
      return;
    }

    return next();
  };
}

/**
 * Wraps a command handler with role checking
 * @param {string|string[]} requiredRole - Required role(s)
 * @param {Function} handler - Command handler function
 * @returns {Function} Wrapped handler with role check
 */
export function withRole(requiredRole, handler) {
  return async (ctx) => {
    // Ensure owner has the owner role in database
    await ensureOwnerRole(ctx.from.id);

    // Public command - no role check needed
    if (!requiredRole) {
      return handler(ctx);
    }

    const userRole = await getRole(ctx.from.id);
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Owner role has access to everything
    if (userRole === "owner") {
      return handler(ctx);
    }

    // Check if user has required role
    if (!allowedRoles.includes(userRole)) {
      // Silently ignore unauthorized access
      return;
    }

    return handler(ctx);
  };
}

/**
 * Check if a command is allowed for a specific role
 * Used for custom permission logic within commands
 */
export async function hasRole(userId, role) {
  const userRole = await getRole(userId);

  if (Array.isArray(role)) {
    return role.includes(userRole);
  }

  return userRole === role;
}

/**
 * Check if user is the bot owner
 */
export function isOwner(userId) {
  return String(userId) === String(OWNER_ID);
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId) {
  return hasRole(userId, "admin");
}

/**
 * Check if user is mod, admin, or owner
 */
export async function isMod(userId) {
  return hasRole(userId, ["owner", "admin", "mod"]);
}

/**
 * Check if user has a specific permission (via system role or custom roles)
 * @param {string} userId - User ID
 * @param {string} permission - Permission string (e.g., "users.ban")
 * @returns {Promise<boolean>} True if user has the permission
 */
export async function hasPermission(userId, permission) {
  // Ensure owner has the owner role in database
  await ensureOwnerRole(userId);

  // Check if user has owner role (owner has all permissions)
  const userRole = await getRole(userId);
  if (userRole === "owner") {
    return true;
  }

  // Get all user permissions (system + custom roles)
  const userPermissions = await getUserPermissions(userId);

  // Check if user has the permission
  return checkPermission(userPermissions, permission);
}

/**
 * Permission-based middleware for commands
 * @param {string|string[]} requiredPermission - Permission(s) required to run command
 * @returns {Function} Middleware function
 */
export function requirePermission(requiredPermission) {
  return async (ctx, next) => {
    // Owner bypasses all permission checks
    if (isOwner(ctx.from.id)) {
      return next();
    }

    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];

    // Check if user has any of the required permissions
    const userPermissions = await getUserPermissions(ctx.from.id);
    const hasAccess = permissions.some((perm) =>
      checkPermission(userPermissions, perm)
    );

    if (!hasAccess) {
      // Silently ignore unauthorized access
      return;
    }

    return next();
  };
}

/**
 * Wraps a command handler with permission checking
 * @param {string|string[]} requiredPermission - Required permission(s)
 * @param {Function} handler - Command handler function
 * @returns {Function} Wrapped handler with permission check
 */
export function withPermission(requiredPermission, handler) {
  return async (ctx) => {
    // Owner bypasses all permission checks
    if (isOwner(ctx.from.id)) {
      return handler(ctx);
    }

    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];

    // Check if user has any of the required permissions
    const userPermissions = await getUserPermissions(ctx.from.id);
    const hasAccess = permissions.some((perm) =>
      checkPermission(userPermissions, perm)
    );

    if (!hasAccess) {
      // Silently ignore unauthorized access
      return;
    }

    return handler(ctx);
  };
}
