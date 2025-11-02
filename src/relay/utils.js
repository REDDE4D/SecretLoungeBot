/**
 * Shared utility functions for the relay system
 */

import { getUserMeta } from "../users/index.js";

/**
 * Check if a value is a valid Telegram message ID
 * @param {*} x - Value to check
 * @returns {boolean}
 */
export function isValidReplyId(x) {
  return Number.isInteger(x) && x > 0;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Calculate message retention period based on sender's compliance status.
 * - Default: 24 hours for privacy
 * - Extended: 7 days if sender has warnings or is banned (for moderation)
 * @param {string} senderId - User ID
 * @returns {Promise<Date>} Expiration date
 */
export async function calculateExpiresAt(senderId) {
  const user = await getUserMeta(senderId);
  const hasWarnings = user?.warnings > 0;
  const isBanned = user?.bannedUntil && user.bannedUntil > new Date();

  // Keep messages from warned/banned users for 7 days for moderation purposes
  const ttlHours = (hasWarnings || isBanned) ? 168 : 24; // 168h = 7 days
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
}

/**
 * Unified sender with backoff + reply fallback.
 * - Retries 429 with retry_after delay (plus jitter).
 * - If 400 due to bad reply target, retries once without reply.
 * @param {object} telegram - Telegram instance
 * @param {Function} method - Telegram API method to call
 * @param {object} args - Arguments for the method
 * @param {object} options - Options including maxRetries
 * @returns {Promise<any>} Result from Telegram API
 */
export async function sendWithRetry(telegram, method, args, { maxRetries = 2 } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt <= maxRetries) {
    try {
      return await method(args);
    } catch (err) {
      const code = err?.response?.error_code;
      const desc = err?.response?.description || err?.message || "";
      // Handle rate limit
      if (code === 429 && err.response?.parameters?.retry_after) {
        const delay = (err.response.parameters.retry_after + 0.2) * 1000;
        await sleep(delay);
        attempt++;
        continue;
      }
      // If bad reply target, retry once without reply_to_message_id
      if (
        code === 400 &&
        /reply|repl|message to reply|not found|can't parse/i.test(desc) &&
        args?.reply_to_message_id
      ) {
        const { reply_to_message_id, ...rest } = args;
        try {
          return await method(rest);
        } catch (e2) {
          lastErr = e2;
          break;
        }
      }
      lastErr = err;
      break;
    }
  }
  throw lastErr;
}
