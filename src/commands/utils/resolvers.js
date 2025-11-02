/**
 * Shared utilities for resolving users from command context
 */

import { findUserIdByAlias } from "../../users/index.js";
import { resolveTargetFromContext } from "../../relay/quoteMap.js";

/**
 * Resolve target user from alias or reply context
 * @param {object} ctx - Telegraf context
 * @param {string} [aliasOrNothing] - Optional alias to resolve
 * @returns {Promise<string>} User ID
 * @throws {Error} If user cannot be resolved
 */
export async function resolveTargetUser(ctx, aliasOrNothing) {
  const alias = aliasOrNothing?.trim();
  if (alias) {
    const id = await findUserIdByAlias(alias);
    if (!id) throw new Error("❌ Alias not found.");
    return id;
  }

  const replyId = await resolveTargetFromContext(ctx);
  if (replyId) return replyId;

  throw new Error("❌ Reply to a message or provide alias.");
}
