import { getRole } from "../../users/index.js";

const OWNER_ID = process.env.ADMIN_ID;

/**
 * Role-based permission middleware for commands
 * @param {string|string[]} requiredRole - 'admin', 'mod', 'owner', ['admin', 'mod'], or null for public
 * @returns {Function} Middleware function
 */
export function requireRole(requiredRole) {
  return async (ctx, next) => {
    // Public command - no role check needed
    if (!requiredRole) {
      return next();
    }

    // Owner-only check
    if (requiredRole === "owner" || (Array.isArray(requiredRole) && requiredRole.includes("owner"))) {
      if (String(ctx.from.id) !== String(OWNER_ID)) {
        return;
      }
      return next();
    }

    const userRole = await getRole(ctx.from.id);
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

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
    // Public command - no role check needed
    if (!requiredRole) {
      return handler(ctx);
    }

    // Owner-only check
    if (requiredRole === "owner" || (Array.isArray(requiredRole) && requiredRole.includes("owner"))) {
      if (String(ctx.from.id) !== String(OWNER_ID)) {
        return;
      }
      return handler(ctx);
    }

    const userRole = await getRole(ctx.from.id);
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

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
 * Check if user is mod or admin
 */
export async function isMod(userId) {
  return hasRole(userId, ["mod", "admin"]);
}
