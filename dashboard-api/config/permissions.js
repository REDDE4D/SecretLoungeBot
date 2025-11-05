/**
 * Permission matrix for role-based access control
 *
 * Permission format: "category.action"
 *
 * Categories:
 * - dashboard: Dashboard access
 * - stats: Statistics viewing
 * - users: User management
 * - settings: Settings management
 * - content: Content management (filters, invites, pins)
 * - moderation: Moderation tools (reports, audit logs)
 * - permissions: Permission management
 */

export const PERMISSIONS = {
  // Dashboard Access
  DASHBOARD_ACCESS: "dashboard.access",

  // Statistics Permissions
  STATS_VIEW_OVERVIEW: "stats.view_overview",
  STATS_VIEW_USERS: "stats.view_users",
  STATS_VIEW_MESSAGES: "stats.view_messages",
  STATS_VIEW_MODERATION: "stats.view_moderation",
  STATS_EXPORT: "stats.export",

  // User Management Permissions
  USERS_VIEW: "users.view",
  USERS_VIEW_DETAILS: "users.view_details",
  USERS_BAN: "users.ban",
  USERS_MUTE: "users.mute",
  USERS_KICK: "users.kick",
  USERS_WARN: "users.warn",
  USERS_RESTRICT_MEDIA: "users.restrict_media",
  USERS_MANAGE_ROLES: "users.manage_roles",
  USERS_EXPORT: "users.export",

  // Settings Management Permissions
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT_GENERAL: "settings.edit_general",
  SETTINGS_EDIT_INVITE: "settings.edit_invite",
  SETTINGS_EDIT_SLOWMODE: "settings.edit_slowmode",
  SETTINGS_EDIT_MAINTENANCE: "settings.edit_maintenance",
  SETTINGS_EDIT_WELCOME: "settings.edit_welcome",
  SETTINGS_EDIT_RULES: "settings.edit_rules",
  SETTINGS_EDIT_SPAM: "settings.edit_spam",

  // Content Management Permissions
  CONTENT_VIEW_FILTERS: "content.view_filters",
  CONTENT_MANAGE_FILTERS: "content.manage_filters",
  CONTENT_VIEW_INVITES: "content.view_invites",
  CONTENT_MANAGE_INVITES: "content.manage_invites",
  CONTENT_VIEW_PINS: "content.view_pins",
  CONTENT_MANAGE_PINS: "content.manage_pins",
  CONTENT_MANAGE_SCHEDULED: "content.manage_scheduled",

  // Moderation Permissions
  MODERATION_VIEW_REPORTS: "moderation.view_reports",
  MODERATION_RESOLVE_REPORTS: "moderation.resolve_reports",
  MODERATION_VIEW_AUDIT: "moderation.view_audit",
  MODERATION_EXPORT_AUDIT: "moderation.export_audit",

  // Logs Permissions
  LOGS_VIEW_BOT: "logs.view_bot",
  LOGS_EXPORT: "logs.export",

  // Links Permissions
  LINKS_VIEW: "links.view",
  LINKS_MANAGE: "links.manage",

  // Permission Management
  PERMISSIONS_VIEW: "permissions.view",
  PERMISSIONS_MANAGE_ROLES: "permissions.manage_roles",
  PERMISSIONS_ASSIGN: "permissions.assign_permissions",
};

/**
 * Default role to permissions mapping
 */
export const ROLE_PERMISSIONS = {
  admin: [
    // Full access - all permissions
    ...Object.values(PERMISSIONS),
  ],

  mod: [
    // Dashboard access
    PERMISSIONS.DASHBOARD_ACCESS,

    // Stats viewing (all)
    PERMISSIONS.STATS_VIEW_OVERVIEW,
    PERMISSIONS.STATS_VIEW_USERS,
    PERMISSIONS.STATS_VIEW_MESSAGES,
    PERMISSIONS.STATS_VIEW_MODERATION,

    // User viewing and basic moderation
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_VIEW_DETAILS,
    PERMISSIONS.USERS_MUTE,
    PERMISSIONS.USERS_KICK,
    PERMISSIONS.USERS_WARN,
    PERMISSIONS.USERS_RESTRICT_MEDIA,

    // Moderation tools
    PERMISSIONS.MODERATION_VIEW_REPORTS,
    PERMISSIONS.MODERATION_RESOLVE_REPORTS,
    PERMISSIONS.MODERATION_VIEW_AUDIT,

    // Content viewing (no management)
    PERMISSIONS.CONTENT_VIEW_FILTERS,
    PERMISSIONS.CONTENT_VIEW_INVITES,
    PERMISSIONS.CONTENT_VIEW_PINS,

    // Logs viewing
    PERMISSIONS.LOGS_VIEW_BOT,

    // Links viewing and management
    PERMISSIONS.LINKS_VIEW,
    PERMISSIONS.LINKS_MANAGE,

    // Settings viewing only
    PERMISSIONS.SETTINGS_VIEW,
  ],

  whitelist: [
    // No dashboard access by default
    // Can be granted custom permissions
  ],
};

/**
 * Get permissions for a role
 *
 * @param {string} role - User role (admin, mod, whitelist, or null)
 * @param {Array<string>} customPermissions - Optional custom permissions
 * @returns {Array<string>} - Array of permission strings
 */
export function getPermissionsForRole(role, customPermissions = []) {
  if (!role) {
    return customPermissions;
  }

  const rolePerms = ROLE_PERMISSIONS[role] || [];
  return [...new Set([...rolePerms, ...customPermissions])];
}

/**
 * Check if user has a specific permission
 *
 * @param {Array<string>} userPermissions - User's permissions
 * @param {string} requiredPermission - Required permission
 * @returns {boolean} - True if user has permission
 */
export function hasPermission(userPermissions, requiredPermission) {
  // Wildcard permission (admin)
  if (userPermissions.includes("*")) {
    return true;
  }

  // Exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Category wildcard (e.g., "users.*")
  const category = requiredPermission.split(".")[0];
  if (userPermissions.includes(`${category}.*`)) {
    return true;
  }

  return false;
}

/**
 * Check if user has any of the required permissions
 *
 * @param {Array<string>} userPermissions - User's permissions
 * @param {Array<string>} requiredPermissions - Array of required permissions (OR logic)
 * @returns {boolean} - True if user has at least one permission
 */
export function hasAnyPermission(userPermissions, requiredPermissions) {
  return requiredPermissions.some(perm => hasPermission(userPermissions, perm));
}

/**
 * Check if user has all required permissions
 *
 * @param {Array<string>} userPermissions - User's permissions
 * @param {Array<string>} requiredPermissions - Array of required permissions (AND logic)
 * @returns {boolean} - True if user has all permissions
 */
export function hasAllPermissions(userPermissions, requiredPermissions) {
  return requiredPermissions.every(perm => hasPermission(userPermissions, perm));
}
