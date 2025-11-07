import mongoose from "mongoose";
import { verifyTelegramAuth, extractUserInfo } from "../utils/telegram.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  getTokenExpiry,
} from "../utils/jwt.js";
import { getPermissionsForRole, PERMISSIONS } from "../config/permissions.js";
import {
  logLogin,
  logLoginFailure,
  logLogout,
  logTokenRefresh,
  logBruteForceBlock,
} from "../utils/authAudit.js";
import * as roleService from "../../src/services/roleService.js";

// Helper functions to get models at runtime (after registration)
const getUser = () => mongoose.model("User");
const getSession = () => mongoose.model("Session");
const getLoginAttempt = () => mongoose.model("LoginAttempt");

/**
 * Get all permissions for a user (system role + custom roles)
 * @param {string} userId - User ID
 * @param {string} userRole - User's system role
 * @returns {Promise<string[]>} Array of permission strings
 */
async function getUserPermissions(userId, userRole) {
  // Get system role permissions
  const systemPerms = await getPermissionsForRole(userRole);

  // Get custom role permissions
  const customPerms = await roleService.getUserPermissions(userId);

  // Merge and deduplicate
  return [...new Set([...systemPerms, ...customPerms])];
}

/**
 * Check if user has dashboard access (via system role or custom permissions)
 * @param {string} userId - User ID
 * @param {string} userRole - User's system role
 * @returns {Promise<boolean>} True if user has dashboard access
 */
async function hasDashboardAccess(userId, userRole) {
  // Owner, admin, and mod roles have access by default
  if (userRole === "owner" || userRole === "admin" || userRole === "mod") {
    return true;
  }

  // Check if user has dashboard.access permission via custom roles
  const customPerms = await roleService.getUserPermissions(userId);
  return customPerms.includes(PERMISSIONS.DASHBOARD_ACCESS);
}

/**
 * Authenticate user with Telegram OAuth data
 *
 * @param {Object} authData - Telegram auth data
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<Object>} - { user, accessToken, refreshToken, expiresIn }
 */
export async function authenticateWithTelegram(authData, ipAddress, userAgent) {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    throw new Error("BOT_TOKEN not configured");
  }

  // Get models at runtime
  const User = getUser();
  const Session = getSession();
  const LoginAttempt = getLoginAttempt();

  try {
    // Verify Telegram auth data
    if (!verifyTelegramAuth(authData, botToken)) {
      await LoginAttempt.recordFailure(ipAddress, "ip");
      await logLoginFailure(null, ipAddress, "Invalid Telegram auth data", userAgent);
      throw new Error("Invalid Telegram authentication data");
    }

    // Extract user info
    const telegramUser = extractUserInfo(authData);
    const userId = telegramUser.id;

    // Check if this is the bot owner - owners bypass rate limiting
    const isOwner = String(userId) === String(process.env.ADMIN_ID);

    // Check rate limits only for non-owners
    if (!isOwner) {
      // Check if IP is blocked due to too many failed attempts
      const ipBlockCheck = await LoginAttempt.isBlocked(ipAddress, "ip");
      if (ipBlockCheck.blocked) {
        await logBruteForceBlock(
          ipAddress,
          "ip",
          ipBlockCheck.attempts,
          ipBlockCheck.minutesLeft
        );
        throw new Error(
          `Too many failed login attempts. Please try again in ${ipBlockCheck.minutesLeft} minute(s).`
        );
      }

      // Check if user is blocked
      const userBlockCheck = await LoginAttempt.isBlocked(userId, "user");
      if (userBlockCheck.blocked) {
        await logBruteForceBlock(
          userId,
          "user",
          userBlockCheck.attempts,
          userBlockCheck.minutesLeft
        );
        throw new Error(
          `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${userBlockCheck.minutesLeft} minute(s).`
        );
      }
    }

    // Get user from database
    let user = await User.findById(userId);

    if (!user) {
      // Only record failures for non-owners
      if (!isOwner) {
        await LoginAttempt.recordFailure(ipAddress, "ip");
        await LoginAttempt.recordFailure(userId, "user");
      }
      await logLoginFailure(userId, ipAddress, "User not registered", userAgent);
      throw new Error("User not registered. Please register via the bot first.");
    }

    // Update Telegram user info on login
    user.username = telegramUser.username;
    user.firstName = telegramUser.firstName;
    user.lastName = telegramUser.lastName;
    await user.save();

    // Check if user has dashboard access permission
    const userRole = user.role || null;

    // Check if user has dashboard access (system role or custom permissions)
    const hasAccess = await hasDashboardAccess(userId, userRole);
    if (!hasAccess) {
      // Only record failures for non-owners
      if (!isOwner) {
        await LoginAttempt.recordFailure(ipAddress, "ip");
        await LoginAttempt.recordFailure(userId, "user");
      }
      await logLoginFailure(userId, ipAddress, "No dashboard permission", userAgent);
      throw new Error("You do not have permission to access the dashboard");
    }

    // Get user permissions (system + custom roles)
    const permissions = await getUserPermissions(userId, userRole);

    // Generate tokens
    const tokenPayload = {
      userId: user._id,
      role: userRole,
      permissions,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Hash tokens for storage
    const accessTokenHash = await hashToken(accessToken);
    const refreshTokenHash = await hashToken(refreshToken);

    // Create session
    const session = new Session({
      userId: user._id,
      accessTokenHash,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt: getTokenExpiry("refresh"),
    });

    await session.save();

    // Clean up old sessions (limit to 5)
    await Session.cleanupUserSessions(user._id);

    // Reset login attempts on successful login
    await LoginAttempt.resetAttempts(ipAddress, "ip");
    await LoginAttempt.resetAttempts(userId, "user");

    // Log successful login
    await logLogin(userId, ipAddress, userAgent);

    return {
      user: {
        id: user._id,
        alias: user.alias,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole,
        permissions,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  } catch (error) {
    // If it's already an authentication error, re-throw it
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 *
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} - { accessToken, expiresIn }
 */
export async function refreshAccessToken(refreshToken) {
  // Get models at runtime
  const User = getUser();
  const Session = getSession();

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    throw new Error("Invalid or expired refresh token");
  }

  // Hash token for session lookup
  const tokenHash = await hashToken(refreshToken);

  // Find active session
  const session = await Session.findByRefreshToken(tokenHash);

  if (!session) {
    throw new Error("Session not found or expired");
  }

  // Get user
  const user = await User.findById(session.userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Check permissions
  const userRole = user.role || null;

  // Check if user still has dashboard access
  const hasAccess = await hasDashboardAccess(session.userId, userRole);
  if (!hasAccess) {
    throw new Error("You no longer have permission to access the dashboard");
  }

  // Get user permissions (system + custom roles)
  const permissions = await getUserPermissions(session.userId, userRole);

  // Generate new access token
  const tokenPayload = {
    userId: user._id,
    role: userRole,
    permissions,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newAccessTokenHash = await hashToken(newAccessToken);

  // Update session with new access token
  session.accessTokenHash = newAccessTokenHash;
  session.lastActivity = new Date();
  await session.save();

  // Log token refresh
  await logTokenRefresh(session.userId, session.ipAddress);

  return {
    accessToken: newAccessToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

/**
 * Get current user info
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User info
 */
export async function getCurrentUser(userId) {
  const User = getUser();

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const userRole = user.role || null;
  const permissions = await getUserPermissions(userId, userRole);

  return {
    id: user._id,
    alias: user.alias,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: userRole,
    permissions,
    inLobby: user.inLobby,
    joinDate: user.createdAt,
  };
}

/**
 * Logout user (invalidate session)
 *
 * @param {string} accessToken - Access token
 * @returns {Promise<void>}
 */
export async function logout(accessToken) {
  const Session = getSession();

  const tokenHash = await hashToken(accessToken);

  // Find and delete session
  const session = await Session.findByAccessToken(tokenHash);

  if (session) {
    // Log logout before deleting session
    await logLogout(session.userId, session.ipAddress, false);
    await session.deleteOne();
  }
}

/**
 * Logout from all devices (invalidate all sessions)
 *
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function logoutAll(userId) {
  const Session = getSession();

  // Get first session for IP logging
  const sessions = await Session.getUserSessions(userId);
  const ipAddress = sessions.length > 0 ? sessions[0].ipAddress : "unknown";

  // Log logout all
  await logLogout(userId, ipAddress, true);

  await Session.invalidateAllUserSessions(userId);
}

/**
 * Authenticate user with QR code login token
 * This bypasses Telegram hash verification since the bot already authenticated the user
 *
 * @param {Object} loginToken - LoginToken document from database
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<Object>} - { user, accessToken, refreshToken, expiresIn }
 */
export async function authenticateWithLoginToken(loginToken, ipAddress, userAgent) {
  // Get models at runtime
  const User = getUser();
  const Session = getSession();
  const LoginAttempt = getLoginAttempt();

  if (!loginToken.authenticated || !loginToken.userData) {
    throw new Error("Login token not authenticated");
  }

  const userId = loginToken.userId;

  // Check if this is the bot owner - owners bypass rate limiting
  const isOwner = String(userId) === String(process.env.ADMIN_ID);

  // Check rate limits only for non-owners
  if (!isOwner) {
    // Check if IP is blocked due to too many failed attempts
    const ipBlockCheck = await LoginAttempt.isBlocked(ipAddress, "ip");
    if (ipBlockCheck.blocked) {
      await logBruteForceBlock(
        ipAddress,
        "ip",
        ipBlockCheck.attempts,
        ipBlockCheck.minutesLeft
      );
      throw new Error(
        `Too many failed login attempts. Please try again in ${ipBlockCheck.minutesLeft} minute(s).`
      );
    }
  }

  // Get user from database
  let user = await User.findById(userId);

  if (!user) {
    // Only record failures for non-owners
    if (!isOwner) {
      await LoginAttempt.recordFailure(ipAddress, "ip");
      await LoginAttempt.recordFailure(userId, "user");
    }
    await logLoginFailure(userId, ipAddress, "User not registered", userAgent);
    throw new Error("User not registered. Please register via the bot first.");
  }

  // Update Telegram user info from login token data
  if (loginToken.userData) {
    user.username = loginToken.userData.username || null;
    user.firstName = loginToken.userData.firstName || loginToken.userData.first_name || null;
    user.lastName = loginToken.userData.lastName || loginToken.userData.last_name || null;
    await user.save();
  }

  // Check if user has dashboard access permission
  const userRole = user.role || null;

  // Check if user has dashboard access (system role or custom permissions)
  const hasAccess = await hasDashboardAccess(userId, userRole);
  if (!hasAccess) {
    // Only record failures for non-owners
    if (!isOwner) {
      await LoginAttempt.recordFailure(ipAddress, "ip");
      await LoginAttempt.recordFailure(userId, "user");
    }
    await logLoginFailure(userId, ipAddress, "No dashboard permission", userAgent);
    throw new Error("You do not have permission to access the dashboard");
  }

  // Get user permissions (system + custom roles)
  const permissions = await getUserPermissions(userId, userRole);

  // Generate tokens
  const tokenPayload = {
    userId: user._id,
    role: userRole,
    permissions,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ userId: user._id });

  // Hash tokens for storage
  const accessTokenHash = await hashToken(accessToken);
  const refreshTokenHash = await hashToken(refreshToken);

  // Create session
  const session = new Session({
    userId: user._id,
    accessTokenHash,
    refreshTokenHash,
    ipAddress,
    userAgent,
    expiresAt: getTokenExpiry("refresh"),
  });

  await session.save();

  // Clean up old sessions (limit to 5)
  await Session.cleanupUserSessions(user._id);

  // Reset login attempts on successful login
  await LoginAttempt.resetAttempts(ipAddress, "ip");
  await LoginAttempt.resetAttempts(userId, "user");

  // Log successful login
  await logLogin(userId, ipAddress, userAgent);

  return {
    user: {
      id: user._id,
      alias: user.alias,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: userRole,
      permissions,
    },
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}
