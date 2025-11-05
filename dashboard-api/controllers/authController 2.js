import {
  authenticateWithTelegram,
  refreshAccessToken,
  getCurrentUser,
  logout,
  logoutAll,
} from "../services/authService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import mongoose from "mongoose";

// Helper function to get LoginToken model at runtime (after database connection)
const getLoginToken = () => mongoose.model("LoginToken");

/**
 * POST /api/auth/telegram
 * Authenticate with Telegram OAuth data
 */
export const loginWithTelegram = asyncHandler(async (req, res) => {
  const authData = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers["user-agent"] || "Unknown";

  const result = await authenticateWithTelegram(authData, ipAddress, userAgent);

  res.status(200).json({
    success: true,
    message: "Authentication successful",
    data: result,
  });
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await refreshAccessToken(refreshToken);

  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: result,
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await getCurrentUser(userId);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * POST /api/auth/logout
 * Logout (invalidate current session)
 */
export const logoutUser = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.substring(7); // Remove "Bearer "

  if (token) {
    await logout(token);
  }

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
export const logoutAllDevices = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await logoutAll(userId);

  res.status(200).json({
    success: true,
    message: "Logged out from all devices",
  });
});

/**
 * POST /api/auth/create-login-token
 * Create a new QR code login token
 */
export const createLoginToken = asyncHandler(async (req, res) => {
  // Generate a cryptographically secure random token
  const token = Array.from({ length: 2 }, () =>
    Math.random().toString(36).substring(2, 15)
  ).join('');

  // Token expires in 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const LoginToken = getLoginToken();
  const loginToken = new LoginToken({
    token,
    expiresAt,
    authenticated: false,
  });

  await loginToken.save();

  res.status(201).json({
    success: true,
    data: {
      token,
      expiresAt,
    },
  });
});

/**
 * GET /api/auth/check-login-token/:token
 * Check if a QR code login token has been authenticated
 */
export const checkLoginToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const LoginToken = getLoginToken();
  const loginToken = await LoginToken.findOne({ token });

  if (!loginToken) {
    return res.status(404).json({
      success: false,
      message: "Login token not found or expired",
    });
  }

  if (loginToken.authenticated && loginToken.userData) {
    res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        token: token, // Return token for completing login
      },
    });
  } else {
    res.status(200).json({
      success: true,
      data: {
        authenticated: false,
      },
    });
  }
});

/**
 * POST /api/auth/login-with-token
 * Complete QR code login using authenticated token
 */
export const loginWithToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers["user-agent"] || "Unknown";

  const LoginToken = getLoginToken();
  const loginToken = await LoginToken.findOne({ token });

  if (!loginToken) {
    return res.status(404).json({
      success: false,
      message: "Login token not found or expired",
    });
  }

  if (!loginToken.authenticated || !loginToken.userData) {
    return res.status(400).json({
      success: false,
      message: "Login token not authenticated yet",
    });
  }

  // Import needed services
  const { authenticateWithLoginToken } = await import("../services/authService.js");

  // Complete authentication using the token
  const result = await authenticateWithLoginToken(loginToken, ipAddress, userAgent);

  // Delete the used token
  await loginToken.deleteOne();

  res.status(200).json({
    success: true,
    message: "Authentication successful",
    data: result,
  });
});
