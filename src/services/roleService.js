// Import mongoose from dashboard-api's database module to use the correct instance
import mongoose from "../../dashboard-api/config/database.js";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getSystemRolePermissions,
  clearPermissionsCache,
} from "../../dashboard-api/config/permissions.js";

// Helper functions to get models at runtime (after database connection)
const getCustomRole = () => mongoose.model("CustomRole");
const getUser = () => mongoose.model("User");
const getSystemRole = () => mongoose.model("SystemRole");

/**
 * Role Service - Handles all custom role CRUD operations and permission management
 */

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

// ---------------------------------------------------------------------------
// SYSTEM ROLE OPERATIONS
// ---------------------------------------------------------------------------

/**
 * Get a system role by ID
 * @param {string} roleId - System role ID (owner, admin, mod, whitelist, user)
 * @returns {Promise<SystemRole|null>}
 */
export async function getSystemRoleById(roleId) {
  const SystemRole = getSystemRole();
  return await SystemRole.getRoleById(roleId);
}

/**
 * Get all system roles
 * @returns {Promise<Array<SystemRole>>}
 */
export async function getAllSystemRoles() {
  const SystemRole = getSystemRole();
  return await SystemRole.getAllSystemRoles();
}

/**
 * Update a system role (emoji, color, permissions)
 * Owner role cannot be modified for security reasons
 * @param {string} roleId - System role ID
 * @param {Object} updates - Fields to update { emoji, color, permissions, description }
 * @returns {Promise<SystemRole>} - Updated system role
 */
export async function updateSystemRole(roleId, updates) {
  const SystemRole = getSystemRole();

  // Protect owner role from modifications
  if (roleId === "owner") {
    throw new Error("Owner role cannot be modified for security reasons");
  }

  const role = await SystemRole.getRoleById(roleId);
  if (!role) {
    throw new Error(`System role "${roleId}" not found`);
  }

  // Validate permissions if provided
  if (updates.permissions) {
    const validPermissions = Object.values(PERMISSIONS);
    for (const permission of updates.permissions) {
      // Allow wildcards
      if (permission === "*" || permission.endsWith(".*")) {
        continue;
      }
      if (!validPermissions.includes(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }
  }

  // Validate color if provided
  if (updates.color && !["red", "blue", "green", "amber", "purple", "pink", "gray"].includes(updates.color)) {
    throw new Error(`Invalid color: ${updates.color}`);
  }

  // Update the role
  const updatedRole = await SystemRole.updateSystemRole(roleId, updates);

  // Clear permissions cache to ensure changes take effect immediately
  clearPermissionsCache();

  return updatedRole;
}

// ---------------------------------------------------------------------------
// CUSTOM ROLE OPERATIONS
// ---------------------------------------------------------------------------

/**
 * Create a new custom role
 * @param {Object} roleData - Role data (name, description, permissions, color, icon)
 * @param {string} createdBy - User ID of the creator
 * @returns {Promise<CustomRole>} - Created role
 */
export async function createRole(roleData, createdBy) {
  const { name, description, permissions, color, icon } = roleData;
  const CustomRole = getCustomRole();

  if (!name || name.trim().length < 2) {
    throw new Error("Role name must be at least 2 characters");
  }

  // Generate roleId from name
  const roleId = CustomRole.generateRoleId(name);

  // Check if role with this ID or name already exists
  const existing = await CustomRole.getRoleByIdOrName(roleId);
  if (existing) {
    throw new Error(`Role with name "${name}" already exists`);
  }

  // Validate permissions
  if (permissions && permissions.length > 0) {
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPerms = permissions.filter(
      (perm) => !validPermissions.includes(perm)
    );
    if (invalidPerms.length > 0) {
      throw new Error(`Invalid permissions: ${invalidPerms.join(", ")}`);
    }
  }

  // Create role
  const role = new CustomRole({
    roleId,
    name: name.trim(),
    description: description?.trim() || "",
    permissions: permissions || [],
    color: color || "#6B7280",
    icon: icon || "👥",
    isSystemRole: false,
    createdBy,
  });

  await role.save();
  return role;
}

/**
 * Update an existing custom role
 * @param {string} roleId - Role ID to update
 * @param {Object} updates - Fields to update (name, description, color, icon)
 * @returns {Promise<CustomRole>} - Updated role
 */
export async function updateRole(roleId, updates) {
  const CustomRole = getCustomRole();
  const role = await CustomRole.findOne({ roleId });

  if (!role) {
    throw new Error(`Role "${roleId}" not found`);
  }

  if (role.isSystemRole) {
    throw new Error("Cannot edit system roles");
  }

  // Update allowed fields
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (trimmed.length < 2) {
      throw new Error("Role name must be at least 2 characters");
    }

    // Check if new name conflicts with existing role
    const existing = await CustomRole.findOne({
      name: { $regex: new RegExp(`^${trimmed}$`, "i") },
      _id: { $ne: role._id },
    });

    if (existing) {
      throw new Error(`Role with name "${trimmed}" already exists`);
    }

    role.name = trimmed;
  }

  if (updates.description !== undefined) {
    role.description = updates.description.trim();
  }

  if (updates.color !== undefined) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
      throw new Error("Invalid color format. Use hex format: #RRGGBB");
    }
    role.color = updates.color;
  }

  if (updates.icon !== undefined) {
    role.icon = updates.icon;
  }

  await role.save();
  return role;
}

/**
 * Delete a custom role
 * @param {string} roleId - Role ID to delete
 * @param {boolean} force - Force delete even if users have this role
 * @returns {Promise<Object>} - Deletion result with user count
 */
export async function deleteRole(roleId, force = false) {
  const CustomRole = getCustomRole();
  const User = getUser();
  const role = await CustomRole.findOne({ roleId });

  if (!role) {
    throw new Error(`Role "${roleId}" not found`);
  }

  if (role.isSystemRole) {
    throw new Error("Cannot delete system roles");
  }

  // Check how many users have this role
  const usersWithRole = await User.countDocuments({ customRoles: roleId });

  if (usersWithRole > 0 && !force) {
    throw new Error(
      `Cannot delete role. ${usersWithRole} user(s) have this role. Use force=true to remove role from all users and delete.`
    );
  }

  // Remove role from all users
  if (usersWithRole > 0) {
    await User.updateMany(
      { customRoles: roleId },
      { $pull: { customRoles: roleId } }
    );
  }

  // Delete the role
  await role.deleteOne();

  return {
    deleted: true,
    roleId,
    usersAffected: usersWithRole,
  };
}

/**
 * Get a role by ID
 * @param {string} roleId - Role ID
 * @returns {Promise<CustomRole|null>}
 */
export async function getRoleById(roleId) {
  const CustomRole = getCustomRole();
  return CustomRole.findOne({ roleId });
}

/**
 * Get a role by name (case-insensitive)
 * @param {string} name - Role name
 * @returns {Promise<CustomRole|null>}
 */
export async function getRoleByName(name) {
  const CustomRole = getCustomRole();
  return CustomRole.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
}

/**
 * Get all roles (system + custom)
 * System roles are fetched from database
 * @returns {Promise<Array>} - Array of all roles
 */
export async function getAllRoles() {
  const CustomRole = getCustomRole();
  const SystemRole = getSystemRole();

  // Fetch both in parallel
  const [systemRoles, customRoles] = await Promise.all([
    SystemRole.getAllSystemRoles(),
    CustomRole.find().sort({ name: 1 }),
  ]);

  // Convert SystemRole documents to plain objects for consistency
  const systemRolesData = systemRoles.map((role) => ({
    roleId: role.roleId,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    color: colorEnumToHex(role.color),
    icon: role.emoji,
    isSystemRole: true,
    isEditable: role.isEditable,
    createdBy: "system",
  }));

  // Convert CustomRole documents to plain objects
  const customRolesData = customRoles.map((role) => ({
    roleId: role.roleId,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    color: role.color,
    icon: role.icon,
    isSystemRole: false,
    isEditable: true,
    createdBy: role.createdBy,
  }));

  return [...systemRolesData, ...customRolesData];
}

/**
 * Convert color enum to hex code
 * @param {string} colorEnum - Color enum value
 * @returns {string} - Hex color code
 */
function colorEnumToHex(colorEnum) {
  const colorMap = {
    red: "#EF4444",
    blue: "#3B82F6",
    green: "#10B981",
    amber: "#F59E0B",
    purple: "#A855F7",
    pink: "#EC4899",
    gray: "#6B7280",
  };
  return colorMap[colorEnum] || "#6B7280";
}

/**
 * Get only custom roles
 * @returns {Promise<Array<CustomRole>>}
 */
export async function getCustomRoles() {
  const CustomRole = getCustomRole();
  return CustomRole.getAllCustomRoles();
}

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

/**
 * Add a permission to a role
 * @param {string} roleId - Role ID
 * @param {string} permissionId - Permission to add
 * @returns {Promise<CustomRole>} - Updated role
 */
export async function addPermissionToRole(roleId, permissionId) {
  const CustomRole = getCustomRole();
  const role = await CustomRole.findOne({ roleId });

  if (!role) {
    throw new Error(`Role "${roleId}" not found`);
  }

  if (role.isSystemRole) {
    throw new Error("Cannot modify system role permissions");
  }

  // Validate permission exists
  const validPermissions = Object.values(PERMISSIONS);
  if (!validPermissions.includes(permissionId)) {
    throw new Error(`Invalid permission: ${permissionId}`);
  }

  // Add permission if not already present
  if (!role.permissions.includes(permissionId)) {
    role.permissions.push(permissionId);
    await role.save();
  }

  return role;
}

/**
 * Remove a permission from a role
 * @param {string} roleId - Role ID
 * @param {string} permissionId - Permission to remove
 * @returns {Promise<CustomRole>} - Updated role
 */
export async function removePermissionFromRole(roleId, permissionId) {
  const CustomRole = getCustomRole();
  const role = await CustomRole.findOne({ roleId });

  if (!role) {
    throw new Error(`Role "${roleId}" not found`);
  }

  if (role.isSystemRole) {
    throw new Error("Cannot modify system role permissions");
  }

  // Remove permission
  role.permissions = role.permissions.filter((perm) => perm !== permissionId);
  await role.save();

  return role;
}

/**
 * Set all permissions for a role (replaces existing)
 * @param {string} roleId - Role ID
 * @param {Array<string>} permissions - New permissions array
 * @returns {Promise<CustomRole>} - Updated role
 */
export async function setRolePermissions(roleId, permissions) {
  const CustomRole = getCustomRole();
  const role = await CustomRole.findOne({ roleId });

  if (!role) {
    throw new Error(`Role "${roleId}" not found`);
  }

  if (role.isSystemRole) {
    throw new Error("Cannot modify system role permissions");
  }

  // Validate all permissions
  const validPermissions = Object.values(PERMISSIONS);
  const invalidPerms = permissions.filter(
    (perm) => !validPermissions.includes(perm)
  );

  if (invalidPerms.length > 0) {
    throw new Error(`Invalid permissions: ${invalidPerms.join(", ")}`);
  }

  role.permissions = permissions;
  await role.save();

  return role;
}

/**
 * Get all permissions for a role
 * @param {string} roleId - Role ID
 * @returns {Promise<Array<string>>} - Array of permission IDs
 */
export async function getRolePermissions(roleId) {
  const systemRoles = ["owner", "admin", "mod", "whitelist", "user"];

  // Check if it's a system role - fetch from database
  if (systemRoles.includes(roleId)) {
    return await getSystemRolePermissions(roleId);
  }

  // Check custom roles
  const CustomRole = getCustomRole();
  const role = await CustomRole.findOne({ roleId });
  return role ? role.permissions : [];
}

// ============================================================================
// USER ASSIGNMENT
// ============================================================================

/**
 * Assign a role to a user
 * - System roles (admin, mod, whitelist) replace the user.role field
 * - Custom roles are added to user.customRoles array
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID to assign
 * @returns {Promise<User>} - Updated user
 */
export async function assignRoleToUser(userId, roleId) {
  const User = getUser();
  const CustomRole = getCustomRole();
  const user = await User.findById(userId);

  if (!user) {
    throw new Error(`User "${userId}" not found`);
  }

  // Check if it's a system role
  const systemRoles = ["admin", "mod", "whitelist"];
  if (systemRoles.includes(roleId)) {
    user.role = roleId;
    await user.save();
    return user;
  }

  // Check if custom role exists
  const role = await CustomRole.findOne({ roleId });
  if (!role) {
    throw new Error(`Role "${roleId}" not found`);
  }

  // Add to customRoles if not already present
  if (!user.customRoles) {
    user.customRoles = [];
  }

  if (!user.customRoles.includes(roleId)) {
    user.customRoles.push(roleId);
    await user.save();
  }

  return user;
}

/**
 * Remove a role from a user
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID to remove
 * @returns {Promise<User>} - Updated user
 */
export async function removeRoleFromUser(userId, roleId) {
  const User = getUser();
  const user = await User.findById(userId);

  if (!user) {
    throw new Error(`User "${userId}" not found`);
  }

  // Check if it's a system role
  const systemRoles = ["admin", "mod", "whitelist"];
  if (systemRoles.includes(roleId)) {
    // Security: prevent removing admin role
    if (roleId === "admin") {
      throw new Error("Cannot remove admin role for security reasons");
    }
    user.role = null;
    await user.save();
    return user;
  }

  // Remove from customRoles
  if (user.customRoles && user.customRoles.includes(roleId)) {
    user.customRoles = user.customRoles.filter((r) => r !== roleId);
    await user.save();
  }

  return user;
}

/**
 * Get all users with a specific role
 * @param {string} roleId - Role ID
 * @returns {Promise<Array<User>>} - Array of users
 */
export async function getUsersWithRole(roleId) {
  const User = getUser();
  // Check if it's a system role
  const systemRoles = ["admin", "mod", "whitelist"];
  if (systemRoles.includes(roleId)) {
    return User.find({ role: roleId });
  }

  // Custom role
  return User.find({ customRoles: roleId });
}

/**
 * Get all permissions for a user (merged from system role + custom roles)
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} - Array of permission IDs
 */
export async function getUserPermissions(userId) {
  const User = getUser();
  const CustomRole = getCustomRole();
  const user = await User.findById(userId);

  if (!user) {
    return [];
  }

  const permissions = new Set();

  // Add system role permissions (fetch from database)
  if (user.role) {
    const systemRolePerms = await getSystemRolePermissions(user.role);
    systemRolePerms.forEach((perm) => permissions.add(perm));
  }

  // Add custom role permissions
  if (user.customRoles && user.customRoles.length > 0) {
    const customRoles = await CustomRole.find({
      roleId: { $in: user.customRoles },
    });

    customRoles.forEach((role) => {
      role.permissions.forEach((perm) => permissions.add(perm));
    });
  }

  return Array.from(permissions);
}

/**
 * Get all roles for a user (system role + custom roles)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - { systemRole: string|null, customRoles: Array<CustomRole> }
 */
export async function getUserRoles(userId) {
  const User = getUser();
  const CustomRole = getCustomRole();
  const user = await User.findById(userId);

  if (!user) {
    return { systemRole: null, customRoles: [] };
  }

  const customRoles = user.customRoles && user.customRoles.length > 0
    ? await CustomRole.find({ roleId: { $in: user.customRoles } })
    : [];

  return {
    systemRole: user.role,
    customRoles,
  };
}

/**
 * Clear all roles from a user (system + custom)
 * @param {string} userId - User ID
 * @param {boolean} includeAdmin - Whether to clear admin role (default: false for security)
 * @returns {Promise<User>} - Updated user
 */
export async function clearUserRoles(userId, includeAdmin = false) {
  const User = getUser();
  const user = await User.findById(userId);

  if (!user) {
    throw new Error(`User "${userId}" not found`);
  }

  // Security: prevent clearing admin role unless explicitly requested
  if (user.role === "admin" && !includeAdmin) {
    throw new Error("Cannot clear admin role. Use includeAdmin=true to force.");
  }

  user.role = null;
  user.customRoles = [];
  await user.save();

  return user;
}
