// dashboard-api/services/userService.js

import mongoose from "mongoose";

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

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "user_management",
    action: "role_change",
    targetUserId: userId,
    targetAlias: user.alias,
    details: `Role changed from ${oldRole || "none"} to ${role || "none"}`,
    metadata: { oldRole, newRole: role },
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

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "moderation",
    action: "ban",
    targetUserId: userId,
    targetAlias: user.alias,
    details: reason || "No reason provided",
    metadata: {
      duration,
      bannedUntil,
      permanent: !duration,
    },
  });

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
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const mutedUntil = duration
    ? new Date(Date.now() + duration * 1000)
    : new Date("2099-12-31");

  user.mutedUntil = mutedUntil;
  await user.save();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "moderation",
    action: "mute",
    targetUserId: userId,
    targetAlias: user.alias,
    details: reason || "No reason provided",
    metadata: {
      duration,
      mutedUntil,
      permanent: !duration,
    },
  });

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
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.inLobby = false;
  await user.save();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "moderation",
    action: "kick",
    targetUserId: userId,
    targetAlias: user.alias,
    details: reason || "No reason provided",
  });

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
    await getAuditLog().create({
      moderatorId,
      category: "moderation",
      action: "unrestrict",
      targetUserId: userId,
      targetAlias: user.alias,
      details: "All restrictions removed",
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
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.mediaRestricted = restricted;
  await user.save();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "moderation",
    action: restricted ? "media_restrict" : "media_unrestrict",
    targetUserId: userId,
    targetAlias: user.alias,
    details: restricted
      ? "Media sending restricted"
      : "Media sending allowed",
  });

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
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.warnings = (user.warnings || 0) + 1;
  await user.save();

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "moderation",
    action: "warn",
    targetUserId: userId,
    targetAlias: user.alias,
    details: reason || "No reason provided",
    metadata: {
      warningCount: user.warnings,
    },
  });

  return {
    userId,
    alias: user.alias,
    warnings: user.warnings,
  };
}
