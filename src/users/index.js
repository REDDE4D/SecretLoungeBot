import { User } from "../models/User.js";
import bot from "../core/bot.js";
import { ROLE_PERMISSIONS } from "../../dashboard-api/config/permissions.js";
import * as roleService from "../services/roleService.js";

export async function registerUser(id, alias = null) {
  // Check if user already exists
  const userExists = await User.findById(id);
  if (userExists) return "❌ You're already registered.";

  // Check if alias is taken (only if alias is provided)
  if (alias) {
    const aliasTaken = await User.findOne({ alias });
    if (aliasTaken) return "❌ Alias already taken.";
  }

  try {
    // Create document - omit alias field if null to work with sparse unique index
    // MongoDB sparse index allows multiple missing fields, but not multiple null values
    const userData = { _id: id };
    if (alias !== null && alias !== undefined) {
      userData.alias = alias;
    }
    await User.create(userData);
    return alias ? `✅ Registered as "${alias}"` : "✅ Registered successfully";
  } catch (err) {
    // Handle duplicate key errors gracefully
    if (err.code === 11000) {
      if (err.keyPattern?.alias) {
        return "❌ Alias already taken.";
      }
      return "❌ Registration failed. Please try again.";
    }
    // Re-throw other errors
    throw err;
  }
}

export async function renameUser(id, newAlias) {
  const taken = await User.findOne({ alias: newAlias });
  if (taken) return "❌ Alias already taken.";

  try {
    // Use $set to add or update the alias field
    const res = await User.updateOne({ _id: id }, { $set: { alias: newAlias } });
    return res.modifiedCount
      ? `✅ Alias updated to "${newAlias}"`
      : "❌ Update failed.";
  } catch (err) {
    // Handle duplicate key errors gracefully
    if (err.code === 11000) {
      return "❌ Alias already taken.";
    }
    // Re-throw other errors
    throw err;
  }
}

export async function joinLobby(id) {
  const user = await User.findById(id);

  // Check if user exists
  if (!user) return "❌ You must register first.";

  // Check if already in lobby
  if (user.inLobby) return "ℹ️ You're already in the lobby.";

  // Join the lobby
  await User.updateOne({ _id: id }, { inLobby: true });
  return "✅ You joined the lobby.";
}

export async function leaveLobby(id) {
  const res = await User.updateOne({ _id: id }, { inLobby: false });
  if (!res.modifiedCount) return "❌ You are not registered.";

  return "👋 You left the lobby.";
}

export async function getLobbyUsers() {
  const users = await User.find({ inLobby: true });
  return users.map((u) => u._id);
}

export async function getAlias(id) {
  const u = await User.findById(id);
  return u?.alias || "Unknown";
}

export async function getAllAliases(ids) {
  const users = await User.find({ _id: { $in: ids } });
  const map = new Map();
  for (const user of users) {
    map.set(user._id, user.alias);
  }
  // Add "Unknown" for missing IDs
  for (const id of ids) {
    if (!map.has(id)) map.set(id, "Unknown");
  }
  return map;
}

export async function findUserIdByAlias(alias) {
  // Don't search for null/undefined/empty aliases
  // This prevents accidentally matching users with null aliases
  if (!alias || (typeof alias === 'string' && alias.trim() === "")) {
    return null;
  }
  const user = await User.findOne({ alias });
  return user?._id || null;
}

export async function setIcon(id, icon) {
  await User.updateOne(
    { _id: id },
    {
      icon: {
        customEmojiId: icon.customEmojiId || null,
        fallback: icon.fallback || "👤",
      },
    }
  );
}

export async function getIcon(id) {
  const u = await User.findById(id);
  if (!u?.icon) return { customEmojiId: null, fallback: "👤" };
  if (typeof u.icon === "string")
    return { customEmojiId: null, fallback: u.icon };
  return {
    customEmojiId: u.icon.customEmojiId || null,
    fallback: u.icon.fallback || "👤",
  };
}

export async function setPreference(id, key, value) {
  await User.updateOne({ _id: id }, { [`preferences.${key}`]: value });
}

export async function getPreference(id, key) {
  const u = await User.findById(id);
  return u?.preferences?.get(key);
}

export async function getRole(id) {
  const u = await User.findById(id);
  return u?.role || null;
}

export async function setRole(id, role) {
  if (!["admin", "mod", "whitelist", null].includes(role))
    return "❌ Invalid role.";
  const res = await User.updateOne({ _id: id }, { role });
  return res.modifiedCount
    ? `✅ Role set to ${role || "none"}.`
    : "❌ User not found.";
}

export async function muteUser(id, ms = 60 * 60 * 1000) {
  await User.updateOne({ _id: id }, { mutedUntil: new Date(Date.now() + ms) });
}

export async function unmuteUser(id) {
  await User.updateOne({ _id: id }, { mutedUntil: null });
}

export async function banUser(id, ms = Infinity) {
  await User.updateOne(
    { _id: id },
    {
      bannedUntil:
        ms === Infinity ? new Date("9999-12-31") : new Date(Date.now() + ms),
    }
  );
}

export async function unbanUser(id) {
  await User.updateOne({ _id: id }, { bannedUntil: null });
}

export async function isInLobby(userId) {
  const u = await User.findById(userId);
  return u?.inLobby || false;
}

export async function isMuted(id) {
  const u = await User.findById(id);
  return u?.mutedUntil && new Date() < u.mutedUntil;
}

export async function isBanned(id) {
  const u = await User.findById(id);
  return u?.bannedUntil && new Date() < u.bannedUntil;
}

export async function addWarning(id) {
  const u = await User.findById(id);
  const count = (u?.warnings || 0) + 1;
  await User.updateOne({ _id: id }, { warnings: count });
  return count;
}

export async function clearWarnings(id) {
  await User.updateOne({ _id: id }, { warnings: 0 });
}

export async function kickUser(id) {
  await User.updateOne({ _id: id }, { inLobby: false });
}

export async function restrictMedia(id) {
  await User.updateOne({ _id: id }, { mediaRestricted: true });
}

export async function unrestrictMedia(id) {
  await User.updateOne({ _id: id }, { mediaRestricted: false });
}

export async function getUserMeta(id) {
  return await User.findById(id);
}

export async function getAllUserMeta() {
  const users = await User.find();
  const map = new Map();
  for (const user of users) {
    map.set(user._id, user);
  }
  return map;
}

/**
 * Get all permissions for a user (system role + custom roles)
 * Merges permissions from system roles and custom roles
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of permission strings
 */
export async function getUserPermissions(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  // Get system role permissions
  const systemPerms = ROLE_PERMISSIONS[user.role] || [];

  // Get custom role permissions
  const customPerms = await roleService.getUserPermissions(userId);

  // Merge and deduplicate
  return [...new Set([...systemPerms, ...customPerms])];
}

export { deleteUserData } from "./deleteUser.js";
