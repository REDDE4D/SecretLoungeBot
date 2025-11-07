import SystemRole from "../models/SystemRole.js";
import { ROLE_PERMISSIONS } from "../../dashboard-api/config/permissions.js";
import logger from "../utils/logger.js";

/**
 * Migration: Create default system roles in database
 * This migration is idempotent - safe to run multiple times
 */
export async function createSystemRoles() {
  try {
    logger.info("Running system roles migration...");

    // Define default system roles with emojis
    const defaultRoles = [
      {
        roleId: "owner",
        name: "Owner",
        description: "Bot owner with full administrative privileges",
        emoji: "🔱", // Trident
        color: "purple",
        permissions: ROLE_PERMISSIONS.owner || ["*"],
        isEditable: false, // Owner role cannot be edited
      },
      {
        roleId: "admin",
        name: "Administrator",
        description: "Full administrative access to all features",
        emoji: "👑", // Crown
        color: "red",
        permissions: ROLE_PERMISSIONS.admin || ["*"],
        isEditable: true,
      },
      {
        roleId: "mod",
        name: "Moderator",
        description: "Can moderate users and view reports",
        emoji: "🛡️", // Shield
        color: "blue",
        permissions: ROLE_PERMISSIONS.mod || [],
        isEditable: true,
      },
      {
        roleId: "whitelist",
        name: "Whitelisted",
        description: "Trusted users with special privileges",
        emoji: "⭐", // Star
        color: "green",
        permissions: ROLE_PERMISSIONS.whitelist || [],
        isEditable: true,
      },
      {
        roleId: "user",
        name: "Regular User",
        description: "Standard lobby member",
        emoji: "", // No emoji for regular users
        color: "gray",
        permissions: [],
        isEditable: true,
      },
    ];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const roleData of defaultRoles) {
      const existing = await SystemRole.findOne({ roleId: roleData.roleId });

      if (!existing) {
        // Create new role
        await SystemRole.create(roleData);
        created++;
        logger.info(`✅ Created system role: ${roleData.roleId} ${roleData.emoji}`);
      } else {
        // Only update if permissions have changed (don't overwrite customizations)
        const permissionsChanged =
          JSON.stringify(existing.permissions.sort()) !==
          JSON.stringify(roleData.permissions.sort());

        if (permissionsChanged && roleData.roleId === "owner") {
          // Always sync owner permissions (security)
          existing.permissions = roleData.permissions;
          await existing.save();
          updated++;
          logger.info(`🔄 Updated owner permissions`);
        } else if (!existing.emoji && roleData.emoji) {
          // Add default emoji if missing
          existing.emoji = roleData.emoji;
          await existing.save();
          updated++;
          logger.info(`➕ Added default emoji to ${roleData.roleId}: ${roleData.emoji}`);
        } else {
          skipped++;
          logger.info(`⏭️  Skipped ${roleData.roleId} (already exists)`);
        }
      }
    }

    logger.info(
      `System roles migration completed: ${created} created, ${updated} updated, ${skipped} skipped`
    );

    return { created, updated, skipped };
  } catch (error) {
    logger.error("System roles migration failed:", error);
    throw error;
  }
}

/**
 * Check if migration has been run
 */
export async function hasSystemRoles() {
  try {
    const count = await SystemRole.countDocuments();
    return count > 0;
  } catch (error) {
    logger.error("Error checking system roles:", error);
    return false;
  }
}
