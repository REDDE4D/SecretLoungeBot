// src/utils/inviteUtils.js
import crypto from "crypto";

/**
 * Generate a cryptographically secure random invite code
 * @param {number} len - Length of the code (default: 10)
 * @returns {string} URL-safe uppercase random code
 */
export function genCode(len = 10) {
  // URL-safe, upper-case
  return crypto
    .randomBytes(Math.ceil(len * 0.75))
    .toString("base64url")
    .slice(0, len)
    .toUpperCase();
}
