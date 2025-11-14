// dashboard-api/services/userService.js

import mongoose from "mongoose";
import bot from "../../src/core/bot.js";
import { escapeHTML } from "../../src/utils/sanitize.js";
import * as roleService from "../../src/services/roleService.js";
import { notifyRoleChange } from "../../src/utils/roleNotifications.js";

// Helper to get models at runtime
const getUser = () => mongoose.model("User");
const getActivity = () => mongoose.model("Activity");
const getReport = () => mongoose.model("Report");
const getAuditLog = () => mongoose.model("AuditLog");

/**
 * Get paginated list of users with filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Users list with pagination
 */
export async function getUsers(options = {}) {
  const User = getUser();
  const Activity = getActivity();

  const {
    page = 1,
    limit = 50,
    search = "",
    role = null,
    inLobby = null,
    status = null,
    sortBy = "alias",
    sortOrder = "asc",
  } = options;

  // Build query
  const query = {};

  // Search filter (alias or username in Telegram data)
  if (search) {
    query.alias = { $regex: search, $options: "i" };
  }

  // Role filter
  if (role) {
    query.role = role;
  }

  // Lobby membership filter
  if (inLobby !== null) {
    query.inLobby = inLobby === "true" || inLobby === true;
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Calculate pagination
  const skip = (page - 1) * Math.min(limit, 100);
  const actualLimit = Math.min(limit, 100);

  // Get users
  const users = await User.find(query)
    .sort(sort)
    .skip(skip)
    .limit(actualLimit)
    .lean();

  // Get activity data for all users in parallel
  const userIds = users.map((u) => u._id);
  const activities = await Activity.find({ userId: { $in: userIds } }).lean();
  const activityMap = new Map(activities.map((a) => [a.userId, a]));

  // Filter by status if provided (after fetching, since status is in Activity collection)
  let filteredUsers = users;
  if (status) {
    filteredUsers = users.filter((user) => {
      const activity = activityMap.get(user._id);
      return activity && activity.status === status;
    });
  }

  // Enrich users with activity data
  const enrichedUsers = filteredUsers.map((user) => {
    const activity = activityMap.get(user._id);
    const now = new Date();

    return {
      id: user._id,
      alias: user.alias,
      icon: user.icon,
      role: user.role,
      customRoles: user.customRoles || [],
      inLobby: user.inLobby,
      status: activity?.status || "offline",
      joinDate: activity?.firstSeen || null,
      totalMessages: activity?.totalMessages || 0,
      warnings: user.warnings,
      isBanned: user.bannedUntil && user.bannedUntil > now,
      isMuted: user.mutedUntil && user.mutedUntil > now,
      mediaRestricted: user.mediaRestricted,
      bannedUntil: user.bannedUntil,
      mutedUntil: user.mutedUntil,
    };
  });

  // Get total count for pagination
  const total = await User.countDocuments(query);

  return {
    users: enrichedUsers,
    pagination: {
      page: parseInt(page),
      limit: actualLimit,
      total,
      totalPages: Math.ceil(total / actualLimit),
    },
  };
}

/**
 * Get detailed user information
 * @param {string} userId - Telegram user ID
 * @returns {Promise<Object>} User details
 */
export async function getUserDetails(userId) {
  const User = getUser();
  const Activity = getActivity();
  const Report = getReport();

  const user = await User.findById(userId).lean();

  if (!user) {
    throw new Error("User not found");
  }

  const activity = await Activity.findOne({ userId }).lean();
  const now = new Date();

  // Get user's reports (both as reporter and reported)
  const [reportsBy, reportsAgainst] = await Promise.all([
    Report.countDocuments({ reporterId: userId }),
    Report.countDocuments({ reportedUserId: userId }),
  ]);

  return {
    id: user._id,
    alias: user.alias,
    icon: user.icon,
    role: user.role,
    inLobby: user.inLobby,
    status: activity?.status || "offline",
    joinDate: activity?.firstSeen || null,
    lastActive: activity?.lastActive || null,
    totalMessages: activity?.totalMessages || 0,
    totalReplies: activity?.totalReplies || 0,
    totalTextMessages: activity?.totalTextMessages || 0,
    totalMediaMessages: activity?.totalMediaMessages || 0,
    warnings: user.warnings,
    isBanned: user.bannedUntil && user.bannedUntil > now,
    isMuted: user.mutedUntil && user.mutedUntil > now,
    mediaRestricted: user.mediaRestricted,
    bannedUntil: user.bannedUntil,
    mutedUntil: user.mutedUntil,
    reports: {
      submitted: reportsBy,
      received: reportsAgainst,
    },
  };
}

/**
 * Update user role
 * @param {string} userId - Telegram user ID
 * @param {string} role - New role (admin, mod, whitelist, or null)
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Updated user
 */
export async function updateUserRole(userId, role, moderatorId) {
  const User = getUser();

  const validRoles = ["admin", "mod", "whitelist", null];
  if (!validRoles.includes(role)) {
    throw new Error("Invalid role");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  // Get moderator alias
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "role_change",
    targetUserId: userId,
    targetAlias: user.alias,
    reason: `Role changed from ${oldRole || "none"} to ${role || "none"}`,
    details: { oldRole, newRole: role },
  });

  // Notify user about role change
  await notifyRoleChange(userId, {
    oldRole,
    newRole: role,
  });

  return {
    userId,
    role,
    alias: user.alias,
  };
}

/**
 * Ban a user
 * @param {string} userId - Telegram user ID
 * @param {number} duration - Duration in seconds (null for permanent)
 * @param {string} reason - Ban reason
 * @param {string} moderatorId - ID of moderator making the ban
 * @returns {Promise<Object>} Ban result
 */
export async function banUser(userId, duration, reason, moderatorId) {
  const User = getUser();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const bannedUntil = duration
    ? new Date(Date.now() + duration * 1000)
    : new Date("2099-12-31");

  user.bannedUntil = bannedUntil;
  user.inLobby = false; // Remove from lobby when banned
  await user.save();

  // Get moderator alias
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "ban",
    targetUserId: userId,
    targetAlias: user.alias,
    reason: reason || "No reason provided",
    details: {
      duration,
      bannedUntil,
      permanent: !duration,
    },
  });

  // Notify user
  try {
    const durationText = duration
      ? `until ${bannedUntil.toLocaleString()}`
      : "permanently";
    const reasonText = reason ? `\nReason: ${escapeHTML(reason)}` : "";
    await bot.telegram.sendMessage(
      userId,
      `🚫 <b>You have been banned ${durationText}</b>${reasonText}`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Failed to notify user about ban:", error);
  }

  return {
    userId,
    alias: user.alias,
    bannedUntil,
    permanent: !duration,
  };
}

/**
 * Mute a user
 * @param {string} userId - Telegram user ID
 * @param {number} duration - Duration in seconds (null for permanent)
 * @param {string} reason - Mute reason
 * @param {string} moderatorId - ID of moderator making the mute
 * @returns {Promise<Object>} Mute result
 */
export async function muteUser(userId, duration, reason, moderatorId) {
  const User = getUser();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const mutedUntil = duration
    ? new Date(Date.now() + duration * 1000)
    : new Date("2099-12-31");

  user.mutedUntil = mutedUntil;
  await user.save();

  // Get moderator alias
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "mute",
    targetUserId: userId,
    targetAlias: user.alias,
    reason: reason || "No reason provided",
    details: {
      duration,
      mutedUntil,
      permanent: !duration,
    },
  });

  // Notify user
  try {
    const durationText = duration
      ? `until ${mutedUntil.toLocaleString()}`
      : "permanently";
    const reasonText = reason ? `\nReason: ${escapeHTML(reason)}` : "";
    await bot.telegram.sendMessage(
      userId,
      `🔇 <b>You have been muted ${durationText}</b>${reasonText}`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Failed to notify user about mute:", error);
  }

  return {
    userId,
    alias: user.alias,
    mutedUntil,
    permanent: !duration,
  };
}

/**
 * Kick a user from the lobby
 * @param {string} userId - Telegram user ID
 * @param {string} reason - Kick reason
 * @param {string} moderatorId - ID of moderator making the kick
 * @returns {Promise<Object>} Kick result
 */
export async function kickUser(userId, reason, moderatorId) {
  const User = getUser();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.inLobby = false;
  await user.save();

  // Get moderator alias
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "kick",
    targetUserId: userId,
    targetAlias: user.alias,
    reason: reason || "No reason provided",
    details: {},
  });

  // Notify user
  try {
    const reasonText = reason ? `\nReason: ${escapeHTML(reason)}` : "";
    await bot.telegram.sendMessage(
      userId,
      `👢 <b>You have been kicked from the lobby</b>${reasonText}\n\nYou can rejoin using /join`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Failed to notify user about kick:", error);
  }

  return {
    userId,
    alias: user.alias,
    kicked: true,
  };
}

/**
 * Remove all restrictions from a user
 * @param {string} userId - Telegram user ID
 * @param {string} moderatorId - ID of moderator removing restrictions
 * @returns {Promise<Object>} Result
 */
export async function removeRestrictions(userId, moderatorId) {
  const User = getUser();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const hadRestrictions =
    user.bannedUntil || user.mutedUntil || user.mediaRestricted;

  user.bannedUntil = null;
  user.mutedUntil = null;
  user.mediaRestricted = false;
  await user.save();

  // Log to audit log
  if (hadRestrictions) {
    // Get moderator alias
    const moderator = await User.findById(moderatorId).lean();

    await getAuditLog().create({
      moderatorId,
      moderatorAlias: moderator?.alias || "System",
      action: "unrestrict",
      targetUserId: userId,
      targetAlias: user.alias,
      reason: "All restrictions removed",
      details: {},
    });
  }

  return {
    userId,
    alias: user.alias,
    restrictionsRemoved: hadRestrictions,
  };
}

/**
 * Toggle media restriction for a user
 * @param {string} userId - Telegram user ID
 * @param {boolean} restricted - Whether to restrict media
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Result
 */
export async function toggleMediaRestriction(userId, restricted, moderatorId) {
  const User = getUser();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.mediaRestricted = restricted;
  await user.save();

  // Get moderator alias
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: restricted ? "media_restrict" : "media_unrestrict",
    targetUserId: userId,
    targetAlias: user.alias,
    reason: restricted
      ? "Media sending restricted"
      : "Media sending allowed",
    details: { restricted },
  });

  // Notify user
  try {
    const message = restricted
      ? "🖼️ <b>Your media sending privileges have been restricted</b>\n\nYou can only send text messages."
      : "✅ <b>Your media sending privileges have been restored</b>\n\nYou can now send media again.";
    await bot.telegram.sendMessage(userId, message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Failed to notify user about media restriction:", error);
  }

  return {
    userId,
    alias: user.alias,
    mediaRestricted: restricted,
  };
}

/**
 * Issue a warning to a user
 * @param {string} userId - Telegram user ID
 * @param {string} reason - Warning reason
 * @param {string} moderatorId - ID of moderator issuing warning
 * @returns {Promise<Object>} Warning result
 */
export async function warnUser(userId, reason, moderatorId) {
  const User = getUser();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.warnings = (user.warnings || 0) + 1;
  await user.save();

  // Get moderator alias
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "warn",
    targetUserId: userId,
    targetAlias: user.alias,
    reason: reason || "No reason provided",
    details: {
      warningCount: user.warnings,
    },
  });

  // Notify user
  try {
    const reasonText = reason ? `\nReason: ${escapeHTML(reason)}` : "";
    await bot.telegram.sendMessage(
      userId,
      `⚠️ <b>You have received a warning</b>${reasonText}\n\nTotal warnings: ${user.warnings}`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Failed to notify user about warning:", error);
  }

  return {
    userId,
    alias: user.alias,
    warnings: user.warnings,
  };
}

/**
 * Get user's roles (system role + custom roles)
 * @param {string} userId - Telegram user ID
 * @returns {Promise<Object>} User roles with details
 */
export async function getUserRoles(userId) {
  const User = getUser();

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error("User not found");
  }

  // Get custom role details
  const customRoles = await roleService.getUserRoles(userId);

  return {
    userId,
    alias: user.alias,
    systemRole: user.role || null,
    customRoles: customRoles.customRoles || [],
  };
}

/**
 * Assign a custom role to a user
 * @param {string} userId - Telegram user ID
 * @param {string} roleId - Custom role ID to assign
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Result
 */
export async function assignCustomRole(userId, roleId, moderatorId) {
  const User = getUser();

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error("User not found");
  }

  // Use roleService to assign the role
  await roleService.assignRoleToUser(userId, roleId);

  // Get role details for the response
  const role = await roleService.getRoleById(roleId);

  // Get moderator alias
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "custom_role_assign",
    targetUserId: userId,
    targetAlias: user.alias,
    reason: `Custom role "${role?.name || roleId}" assigned`,
    details: { roleId, roleName: role?.name },
  });

  // Notify user about custom role assignment
  if (role) {
    await notifyRoleChange(userId, {
      customRole: {
        roleId: role.roleId,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        icon: role.icon,
      },
    });
  }

  return {
    userId,
    alias: user.alias,
    roleId,
    roleName: role?.name || roleId,
  };
}

/**
 * Remove a custom role from a user
 * @param {string} userId - Telegram user ID
 * @param {string} roleId - Custom role ID to remove
 * @param {string} moderatorId - ID of moderator making the change
 * @returns {Promise<Object>} Result
 */
export async function removeCustomRole(userId, roleId, moderatorId) {
  const User = getUser();

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error("User not found");
  }

  // Get role details before removing
  const role = await roleService.getRoleById(roleId);

  // Use roleService to remove the role
  await roleService.removeRoleFromUser(userId, roleId);

  // Get moderator alias
  const moderator = await User.findById(moderatorId).lean();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    moderatorAlias: moderator?.alias || "System",
    action: "custom_role_remove",
    targetUserId: userId,
    targetAlias: user.alias,
    reason: `Custom role "${role?.name || roleId}" removed`,
    details: { roleId, roleName: role?.name },
  });

  // Notify user about custom role removal
  if (role) {
    await notifyRoleChange(userId, {
      customRole: {
        roleId: role.roleId,
        name: role.name,
        description: role.description,
        icon: role.icon,
      },
      isRemoval: true,
    });
  }

  return {
    userId,
    alias: user.alias,
    roleId,
    roleName: role?.name || roleId,
  };
}
