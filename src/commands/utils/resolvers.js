/**
 * Shared utilities for resolving users from command context
 */

import { findUserIdByAlias } from "../../users/index.js";
import { resolveTargetFromContext } from "../../relay/quoteMap.js";
import { User } from "../../models/User.js";

/**
 * Resolve target user from alias, Telegram ID, or reply context
 * @param {object} ctx - Telegraf context
 * @param {string} [aliasOrIdOrNothing] - Optional alias or Telegram ID to resolve
 * @returns {Promise<string>} User ID
 * @throws {Error} If user cannot be resolved
 */
export async function resolveTargetUser(ctx, aliasOrIdOrNothing) {
  const input = aliasOrIdOrNothing?.trim();
  if (input) {
    // Check if input is a numeric Telegram ID
    if (/^\d+$/.test(input)) {
      // It's a numeric ID - verify user exists
      const user = await User.findById(input);
      if (!user) throw new Error("User ID not found.");
      return input;
    }

    // Try to find by alias
    const id = await findUserIdByAlias(input);
    if (!id) throw new Error("Alias not found.");
    return id;
  }

  const replyId = await resolveTargetFromContext(ctx);
  if (replyId) return replyId;

  throw new Error("Reply to a message or provide an alias/user ID.");
}
