import mongoose from "mongoose";

const systemRoleSchema = new mongoose.Schema(
  {
    roleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      enum: ["owner", "admin", "mod", "whitelist", "user"], // "user" represents regular users
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    emoji: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      default: "gray",
      enum: ["red", "blue", "green", "amber", "purple", "pink", "gray"],
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystemRole: {
      type: Boolean,
      default: true,
      immutable: true, // Cannot be changed after creation
    },
    isEditable: {
      type: Boolean,
      default: true, // Owner role will be set to false
    },
  },
  {
    timestamps: true,
    collection: "systemRoles",
  }
);

// Indexes for fast lookups
systemRoleSchema.index({ roleId: 1 });

// Static method to get role by ID
systemRoleSchema.statics.getRoleById = async function (roleId) {
  return await this.findOne({ roleId });
};

// Static method to get all system roles
systemRoleSchema.statics.getAllSystemRoles = async function () {
  return await this.find({}).sort({ roleId: 1 });
};

// Static method to update role (with protection for owner)
systemRoleSchema.statics.updateSystemRole = async function (roleId, updates) {
  if (roleId === "owner") {
    throw new Error("Owner role cannot be modified");
  }

  const allowedUpdates = ["emoji", "color", "permissions", "description"];
  const filteredUpdates = {};

  for (const key of Object.keys(updates)) {
    if (allowedUpdates.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  }

  return await this.findOneAndUpdate(
    { roleId },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  );
};

// Instance method to check if role can be edited
systemRoleSchema.methods.canEdit = function () {
  return this.isEditable && this.roleId !== "owner";
};

// Instance method to validate permissions
systemRoleSchema.methods.validatePermissions = async function () {
  const { PERMISSIONS } = await import("../../dashboard-api/config/permissions.js");
  const validPermissions = Object.values(PERMISSIONS).flat();

  for (const permission of this.permissions) {
    // Allow wildcards
    if (permission === "*" || permission.endsWith(".*")) {
      continue;
    }
    if (!validPermissions.includes(permission)) {
      throw new Error(`Invalid permission: ${permission}`);
    }
  }
  return true;
};

const SystemRole = mongoose.model("SystemRole", systemRoleSchema);

export default SystemRole;
