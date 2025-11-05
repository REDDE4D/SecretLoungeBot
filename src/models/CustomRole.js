import mongoose from "mongoose";
import { PERMISSIONS } from "../../dashboard-api/config/permissions.js";

const customRoleSchema = new mongoose.Schema(
  {
    roleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      // Validate: alphanumeric, underscores, hyphens only
      match: /^[a-z0-9_-]+$/,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
    },
    description: {
      type: String,
      required: false,
      maxlength: 500,
      default: "",
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: function (permissions) {
          // All permissions must exist in PERMISSIONS config
          const validPermissions = Object.values(PERMISSIONS);
          return permissions.every((perm) => validPermissions.includes(perm));
        },
        message: "Invalid permission(s) provided",
      },
    },
    color: {
      type: String,
      default: "#6B7280", // Gray-500
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    icon: {
      type: String,
      default: "👥",
      maxlength: 10,
    },
    isSystemRole: {
      type: Boolean,
      default: false,
      immutable: true, // Cannot be changed after creation
    },
    createdBy: {
      type: String, // User ID
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for faster queries by active custom roles
customRoleSchema.index({ isSystemRole: 1 });

/**
 * Validate that all permissions in the role exist in PERMISSIONS config
 * @returns {boolean} - True if all permissions are valid
 */
customRoleSchema.methods.validatePermissions = function () {
  const validPermissions = Object.values(PERMISSIONS);
  return this.permissions.every((perm) => validPermissions.includes(perm));
};

/**
 * Check if this role can be deleted
 * - System roles cannot be deleted
 * - Roles with users assigned require confirmation
 * @param {number} userCount - Number of users with this role
 * @returns {Object} - { canDelete: boolean, reason: string }
 */
customRoleSchema.methods.canDelete = function (userCount = 0) {
  if (this.isSystemRole) {
    return {
      canDelete: false,
      reason: "System roles cannot be deleted",
    };
  }

  if (userCount > 0) {
    return {
      canDelete: true,
      reason: `This role is assigned to ${userCount} user(s). Deleting will remove it from all users.`,
      requiresConfirmation: true,
    };
  }

  return {
    canDelete: true,
    reason: "This role can be safely deleted",
    requiresConfirmation: false,
  };
};

/**
 * Get role by ID or name (case-insensitive)
 * @param {string} identifier - Role ID or name
 * @returns {Promise<CustomRole|null>}
 */
customRoleSchema.statics.getRoleByIdOrName = async function (identifier) {
  if (!identifier) return null;

  const trimmed = identifier.trim();

  // Try by roleId first
  let role = await this.findOne({ roleId: trimmed.toLowerCase() });

  // If not found, try by name (case-insensitive)
  if (!role) {
    role = await this.findOne({
      name: { $regex: new RegExp(`^${trimmed}$`, "i") },
    });
  }

  return role;
};

/**
 * Get all custom roles (excludes system roles)
 * @returns {Promise<Array<CustomRole>>}
 */
customRoleSchema.statics.getAllCustomRoles = async function () {
  return this.find({ isSystemRole: false }).sort({ name: 1 });
};

/**
 * Generate a unique roleId from a role name
 * @param {string} name - Role name
 * @returns {string} - Generated roleId
 */
customRoleSchema.statics.generateRoleId = function (name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .substring(0, 50); // Limit length
};

export const CustomRole = mongoose.model("CustomRole", customRoleSchema);
