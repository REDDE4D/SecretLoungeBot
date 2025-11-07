// dashboard-api/controllers/permissionsController.js

import mongoose from "mongoose";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../config/permissions.js";
import * as roleService from "../../src/services/roleService.js";

// Helper to get User model at runtime
const getUser = () => mongoose.model("User");

/**
 * Get all available permissions organized by category
 *
 * @route   GET /api/permissions
 * @returns {object} Permissions organized by category
 */
export async function getAllPermissions(req, res) {
  try {
    // Organize permissions by category
    const permissionsByCategory = {};

    Object.entries(PERMISSIONS).forEach(([key, value]) => {
      const [category, action] = value.split(".");
      if (!permissionsByCategory[category]) {
        permissionsByCategory[category] = [];
      }
      permissionsByCategory[category].push({
        id: value,
        key,
        action,
        description: getPermissionDescription(value),
      });
    });

    res.json({
      success: true,
      data: {
        permissions: permissionsByCategory,
        totalCount: Object.keys(PERMISSIONS).length,
      },
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions",
    });
  }
}

/**
 * Get all roles with their permissions and user counts
 *
 * @route   GET /api/permissions/roles
 * @returns {object} Roles with permissions and user counts (system + custom)
 */
export async function getRoles(req, res) {
  try {
    const User = getUser();

    // Get user counts per system role
    const [ownerCount, adminCount, modCount, whitelistCount, nullCount, systemRolesFromDB] =
      await Promise.all([
        User.countDocuments({ role: "owner" }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "mod" }),
        User.countDocuments({ role: "whitelist" }),
        User.countDocuments({ $or: [{ role: null }, { role: { $exists: false } }] }),
        roleService.getAllSystemRoles(),
      ]);

    // Create map of role counts
    const roleCounts = {
      owner: ownerCount,
      admin: adminCount,
      mod: modCount,
      whitelist: whitelistCount,
      user: nullCount,
    };

    // Build system role data from database
    const systemRoles = systemRolesFromDB.map((role) => ({
      id: role.roleId,
      name: role.name,
      description: role.description,
      userCount: roleCounts[role.roleId] || 0,
      permissions: role.permissions,
      isSystemRole: true,
      isEditable: role.isEditable,
      color: role.color,
      emoji: role.emoji,
    }));

    // Get custom roles from database
    const customRoles = await roleService.getCustomRoles();

    // Get user counts for each custom role
    const customRolesWithCounts = await Promise.all(
      customRoles.map(async (role) => {
        const userCount = await User.countDocuments({
          customRoles: role.roleId,
        });
        return {
          id: role.roleId,
          name: role.name,
          description: role.description,
          userCount,
          permissions: role.permissions,
          isSystemRole: false,
          color: role.color,
          icon: role.icon,
          createdBy: role.createdBy,
          createdAt: role.createdAt,
        };
      })
    );

    // Merge system roles and custom roles
    const allRoles = [...systemRoles, ...customRolesWithCounts];

    res.json({
      success: true,
      data: {
        roles: allRoles,
        totalRoles: allRoles.length,
        systemRoles: systemRoles.length,
        customRoles: customRolesWithCounts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles",
    });
  }
}

/**
 * Get users with a specific role
 *
 * @route   GET /api/permissions/roles/:role/users
 * @param   {string} role - Role ID (admin/mod/whitelist/user or custom role ID)
 * @returns {object} List of users with the role
 */
export async function getUsersByRole(req, res) {
  try {
    const User = getUser();
    const Activity = mongoose.model("Activity");

    const { role } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build query based on role type
    let query;
    let isSystemRole = true;

    if (role === "user") {
      // Regular users have null or no role
      query = { $or: [{ role: null }, { role: { $exists: false } }] };
    } else if (["owner", "admin", "mod", "whitelist"].includes(role)) {
      // System roles
      query = { role };
    } else {
      // Check if it's a custom role
      const customRole = await roleService.getRoleById(role);
      if (!customRole) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }
      // Custom role - query users with this roleId in customRoles array
      query = { customRoles: role };
      isSystemRole = false;
    }

    // Get users
    const [users, total] = await Promise.all([
      User.find(query)
        .select("_id alias icon role customRoles inLobby")
        .sort({ alias: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    // Get user IDs for activity lookup
    const userIds = users.map((user) => user._id);

    // Fetch activity data for all users
    const activities = await Activity.find({ userId: { $in: userIds } })
      .select("userId firstSeen")
      .lean();

    // Create a map of userId to firstSeen
    const activityMap = {};
    activities.forEach((activity) => {
      activityMap[activity.userId] = activity.firstSeen;
    });

    // Format users
    const formattedUsers = users.map((user) => ({
      id: user._id,
      alias: user.alias,
      icon: user.icon,
      role: user.role || "user",
      customRoles: user.customRoles || [],
      inLobby: user.inLobby || false,
      joinedAt: activityMap[user._id] || null,
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        isSystemRole,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching users by role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users for role",
    });
  }
}

/**
 * Create a new custom role
 *
 * @route   POST /api/permissions/roles
 * @body    {name, description, permissions, color, icon}
 * @returns {object} Created role
 */
export async function createRole(req, res) {
  try {
    const { name, description, permissions, color, icon } = req.body;

    // Validate required fields
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Role name must be at least 2 characters",
      });
    }

    // Create role via roleService
    const role = await roleService.createRole(
      {
        name: name.trim(),
        description: description?.trim() || "",
        permissions: permissions || [],
        color: color || "#3B82F6",
        icon: icon || "",
      },
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: {
        role: {
          id: role.roleId,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          color: role.color,
          icon: role.icon,
          isSystemRole: false,
          createdBy: role.createdBy,
          createdAt: role.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create role",
    });
  }
}

/**
 * Update a role (system or custom)
 *
 * @route   PUT /api/permissions/roles/:id
 * @param   {string} id - Role ID
 * @body    {name, description, color, emoji/icon, permissions}
 * @returns {object} Updated role
 */
export async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { name, description, color, icon, emoji, permissions } = req.body;

    // Check if it's a system role
    const systemRoles = ["owner", "admin", "mod", "whitelist", "user"];
    const isSystemRole = systemRoles.includes(id);

    if (isSystemRole) {
      // Update system role
      const updates = {};
      if (description !== undefined) updates.description = description.trim();
      if (color !== undefined) updates.color = color;
      if (emoji !== undefined) updates.emoji = emoji;
      if (permissions !== undefined) updates.permissions = permissions;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No updates provided",
        });
      }

      const role = await roleService.updateSystemRole(id, updates);

      res.json({
        success: true,
        message: "System role updated successfully",
        data: {
          role: {
            id: role.roleId,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            color: role.color,
            emoji: role.emoji,
            isSystemRole: true,
            isEditable: role.isEditable,
            updatedAt: role.updatedAt,
          },
        },
      });
    } else {
      // Update custom role
      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description.trim();
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No updates provided",
        });
      }

      const role = await roleService.updateRole(id, updates);

      res.json({
        success: true,
        message: "Role updated successfully",
        data: {
          role: {
            id: role.roleId,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            color: role.color,
            icon: role.icon,
            isSystemRole: false,
            createdBy: role.createdBy,
            updatedAt: role.updatedAt,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update role",
    });
  }
}

/**
 * Delete a custom role
 *
 * @route   DELETE /api/permissions/roles/:id
 * @param   {string} id - Role ID
 * @query   {boolean} force - Force delete even if users have the role
 * @returns {object} Success message
 */
export async function deleteRole(req, res) {
  try {
    const { id } = req.params;
    const { force } = req.query;

    // Delete role via roleService
    await roleService.deleteRole(id, force === "true");

    res.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete role",
    });
  }
}

/**
 * Update role permissions
 *
 * @route   PUT /api/permissions/roles/:id/permissions
 * @param   {string} id - Role ID
 * @body    {permissions: string[]}
 * @returns {object} Updated role
 */
export async function updateRolePermissions(req, res) {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Permissions must be an array",
      });
    }

    // Check if it's a system role
    const systemRoles = ["owner", "admin", "mod", "whitelist", "user"];
    const isSystemRole = systemRoles.includes(id);

    if (isSystemRole) {
      // Update system role permissions
      const role = await roleService.updateSystemRole(id, { permissions });

      res.json({
        success: true,
        message: "System role permissions updated successfully",
        data: {
          role: {
            id: role.roleId,
            name: role.name,
            permissions: role.permissions,
            isSystemRole: true,
          },
        },
      });
    } else {
      // Update custom role permissions
      const role = await roleService.setRolePermissions(id, permissions);

      res.json({
        success: true,
        message: "Role permissions updated successfully",
        data: {
          role: {
            id: role.roleId,
            name: role.name,
            permissions: role.permissions,
            isSystemRole: false,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error updating role permissions:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update role permissions",
    });
  }
}

/**
 * Helper function to get human-readable permission descriptions
 */
function getPermissionDescription(permissionId) {
  const descriptions = {
    // Dashboard
    "dashboard.access": "Access the dashboard interface",

    // Statistics
    "stats.view_overview": "View dashboard overview statistics",
    "stats.view_users": "View user statistics",
    "stats.view_messages": "View message statistics",
    "stats.view_moderation": "View moderation statistics",
    "stats.export": "Export statistics data",

    // User Management
    "users.view": "View user list",
    "users.view_details": "View detailed user information",
    "users.ban": "Ban users from the lobby",
    "users.mute": "Mute users temporarily",
    "users.kick": "Kick users from the lobby",
    "users.warn": "Issue warnings to users",
    "users.restrict_media": "Restrict media sending for users",
    "users.manage_roles": "Assign and modify user roles",
    "users.export": "Export user data",

    // Settings
    "settings.view": "View bot settings",
    "settings.edit_general": "Edit general settings",
    "settings.edit_invite": "Toggle invite-only mode",
    "settings.edit_slowmode": "Configure slowmode settings",
    "settings.edit_maintenance": "Toggle maintenance mode",
    "settings.edit_welcome": "Configure welcome messages",
    "settings.edit_rules": "Manage lobby rules",
    "settings.edit_spam": "Configure anti-spam settings",

    // Content Management
    "content.view_filters": "View content filters",
    "content.manage_filters": "Create, edit, and delete content filters",
    "content.view_invites": "View invite codes",
    "content.manage_invites": "Create and manage invite codes",
    "content.view_pins": "View pinned messages",
    "content.manage_pins": "Create and delete pinned messages",
    "content.manage_scheduled": "Manage scheduled announcements",

    // Moderation
    "moderation.view_reports": "View user reports",
    "moderation.resolve_reports": "Resolve and act on reports",
    "moderation.view_audit": "View audit log",
    "moderation.export_audit": "Export audit log data",

    // Permissions
    "permissions.view": "View roles and permissions",
    "permissions.manage_roles": "Create and edit custom roles",
    "permissions.assign_permissions": "Assign permissions to roles",
  };

  return descriptions[permissionId] || permissionId;
}
