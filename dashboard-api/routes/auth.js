import express from "express";
import {
  loginWithTelegram,
  refreshToken,
  getMe,
  logoutUser,
  logoutAllDevices,
  createLoginToken,
  checkLoginToken,
  loginWithToken,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { telegramAuthSchema, refreshTokenSchema } from "../utils/validators.js";
import { authRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

/**
 * POST /api/auth/telegram
 * Authenticate with Telegram OAuth data
 */
router.post(
  "/telegram",
  authRateLimiter,
  validateBody(telegramAuthSchema),
  loginWithTelegram
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  "/refresh",
  authRateLimiter,
  validateBody(refreshTokenSchema),
  refreshToken
);

/**
 * GET /api/auth/me
 * Get current user info
 * Requires authentication
 */
router.get("/me", authenticate, getMe);

/**
 * POST /api/auth/logout
 * Logout (invalidate current session)
 * Requires authentication
 */
router.post("/logout", authenticate, logoutUser);

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 * Requires authentication
 */
router.post("/logout-all", authenticate, logoutAllDevices);

/**
 * POST /api/auth/create-login-token
 * Create a new QR code login token
 * No authentication required (creating token before login)
 */
router.post("/create-login-token", createLoginToken);

/**
 * GET /api/auth/check-login-token/:token
 * Check QR code login token status
 * No authentication required (checking token before login)
 */
router.get("/check-login-token/:token", checkLoginToken);

/**
 * POST /api/auth/login-with-token
 * Complete QR code login with authenticated token
 * No authentication required (this IS the login endpoint)
 */
router.post("/login-with-token", authRateLimiter, loginWithToken);

export default router;
