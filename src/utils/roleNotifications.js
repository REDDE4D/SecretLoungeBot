import bot from "../core/bot.js";
import { escapeHTML } from "./sanitize.js";

/**
 * Send a notification to a user about their role change
 * @param {string} userId - Telegram user ID
 * @param {Object} options - Notification options
 * @param {string|null} options.oldRole - Previous system role (owner/admin/mod/whitelist/null)
 * @param {string|null} options.newRole - New system role (owner/admin/mod/whitelist/null)
 * @param {Object|null} options.customRole - Custom role object { roleId, name, description, permissions, icon }
 * @param {boolean} options.isRemoval - Whether this is a role removal (default: false)
 * @param {boolean} options.isClear - Whether this is clearing all roles (default: false)
 * @returns {Promise<boolean>} True if notification sent successfully, false otherwise
 */
export async function notifyRoleChange(userId, options = {}) {
  const {
    oldRole = null,
    newRole = null,
    customRole = null,
    isRemoval = false,
    isClear = false,
  } = options;

  try {
    let message = "";

    // Handle different notification types
    if (isClear) {
      // All roles cleared
      message = "🔄 <b>Your roles have been cleared</b>\n\n";
      message += "All custom roles and privileges have been removed.";
    } else if (customRole) {
      // Custom role assignment or removal
      const icon = customRole.icon || "👥";
      const roleName = escapeHTML(customRole.name);
      const roleDesc = customRole.description
        ? `\n${escapeHTML(customRole.description)}`
        : "";

      if (isRemoval) {
        message = `➖ <b>Custom role removed</b>\n\n`;
        message += `${icon} <b>${roleName}</b>${roleDesc}`;
      } else {
        message = `✨ <b>You've been assigned a new custom role!</b>\n\n`;
        message += `${icon} <b>${roleName}</b>${roleDesc}`;

        // Add permissions if available
        if (customRole.permissions && customRole.permissions.length > 0) {
          message += `\n\n<b>Permissions:</b>\n`;
          const permissionLabels = customRole.permissions.map((perm) => {
            // Format permission names nicely (e.g., "users.manage_roles" -> "Manage Roles")
            const parts = perm.split(".");
            const label = parts[parts.length - 1]
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            return `• ${label}`;
          });
          message += permissionLabels.join("\n");
        }
      }
    } else if (newRole || oldRole) {
      // System role change
      const roleEmojis = {
        owner: "🔱",
        admin: "👑",
        mod: "🛡️",
        whitelist: "⭐",
      };

      const roleNames = {
        owner: "Owner",
        admin: "Admin",
        mod: "Moderator",
        whitelist: "Whitelist",
      };

      if (isRemoval || !newRole) {
        // Role removed
        const oldRoleEmoji = roleEmojis[oldRole] || "👤";
        const oldRoleName = roleNames[oldRole] || "User";
        message = `➖ <b>Your ${oldRoleName} role has been removed</b>\n\n`;
        message += `${oldRoleEmoji} You are now a regular user.`;
      } else {
        // Role assigned or changed
        const newRoleEmoji = roleEmojis[newRole] || "👤";
        const newRoleName = roleNames[newRole] || "User";

        if (oldRole && oldRole !== newRole) {
          // Role changed
          const oldRoleEmoji = roleEmojis[oldRole] || "👤";
          const oldRoleName = roleNames[oldRole] || "User";
          message = `🔄 <b>Your role has been changed</b>\n\n`;
          message += `${oldRoleEmoji} ${oldRoleName} → ${newRoleEmoji} <b>${newRoleName}</b>`;
        } else {
          // New role assigned
          message = `✨ <b>You've been promoted to ${newRoleName}!</b>\n\n`;
          message += `${newRoleEmoji} You now have ${newRoleName.toLowerCase()} privileges.`;
        }
      }
    } else {
      // No valid role change detected
      console.warn(
        "[RoleNotifications] No valid role change detected:",
        options
      );
      return false;
    }

    // Send the notification
    await bot.telegram.sendMessage(userId, message, { parse_mode: "HTML" });
    console.log(`[RoleNotifications] Notification sent to user ${userId}`);
    return true;
  } catch (error) {
    // User might have blocked the bot or deleted their account
    if (error.response?.error_code === 403) {
      console.log(
        `[RoleNotifications] User ${userId} has blocked the bot, skipping notification`
      );
    } else {
      console.error(
        `[RoleNotifications] Failed to send role notification to user ${userId}:`,
        error.message
      );
    }
    return false;
  }
}
