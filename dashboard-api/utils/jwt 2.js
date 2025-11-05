import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d";  // 7 days

/**
 * Generate JWT access token
 *
 * @param {Object} payload - Token payload (userId, role, permissions)
 * @returns {string} - Signed JWT token
 */
export function generateAccessToken(payload) {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be at least 32 characters");
  }

  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: "HS256",
  });
}

/**
 * Generate JWT refresh token
 *
 * @param {Object} payload - Token payload (userId)
 * @returns {string} - Signed JWT token
 */
export function generateRefreshToken(payload) {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be at least 32 characters");
  }

  return jwt.sign(payload, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: "HS256",
  });
}

/**
 * Verify and decode JWT access token
 *
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export function verifyAccessToken(token) {
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    return jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch (error) {
    return null;
  }
}

/**
 * Verify and decode JWT refresh token
 *
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export function verifyRefreshToken(token) {
  try {
    const secret = process.env.JWT_REFRESH_SECRET;
    return jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch (error) {
    return null;
  }
}

/**
 * Hash token for storage
 *
 * @param {string} token - Token to hash
 * @returns {Promise<string>} - Hashed token
 */
export async function hashToken(token) {
  // Use SHA256 for faster hashing (tokens are already random)
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Compare token with hash
 *
 * @param {string} token - Plain token
 * @param {string} hash - Stored hash
 * @returns {boolean} - True if match
 */
export function compareTokenHash(token, hash) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return tokenHash === hash;
}

/**
 * Get token expiry timestamp
 *
 * @param {string} type - 'access' or 'refresh'
 * @returns {Date} - Expiry date
 */
export function getTokenExpiry(type = "refresh") {
  const expiry = type === "access" ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY;

  // Parse expiry string (e.g., "15m", "7d")
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * multipliers[unit]);
}
