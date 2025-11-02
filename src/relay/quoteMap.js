// src/relay/quoteMap.js
import QuoteLink from "../models/QuoteLink.js";
import RelayedMessage from "../models/RelayedMessage.js";

/**
 * Store a link from a relayed message (in recipient chat) to the original message metadata.
 *
 * @param {number} relayedId - message_id of the *bot's* relayed message in the recipient chat
 * @param {object} data
 *   - userId?: string                // recipient chat id (recommended to pass)
 *   - originalMsgId: number          // original (group/single) message id from sender
 *   - originalItemMsgId?: number     // original item id (media group item); default = originalMsgId
 *   - originalUserId: string         // sender user id
 *   - originalUserChatId?: string    // sender chat id
 *   - content?: string               // preview text/caption (optional)
 *   - alias?: string                 // sender alias (optional)
 * @param {number} ttlMs - time to live in ms (default 2 minutes)
 */
export async function linkRelay(
  relayedId,
  {
    userId = null,
    originalMsgId,
    originalItemMsgId = null,
    originalUserId,
    originalUserChatId = null,
    content = null,
    alias = null,
  },
  ttlMs = 2 * 60 * 1000
) {
  const expiresAt = new Date(Date.now() + ttlMs);
  await QuoteLink.findOneAndUpdate(
    { relayedId: Number(relayedId) },
    {
      relayedId: Number(relayedId),
      userId: userId ? String(userId) : null,
      originalMsgId: Number(originalMsgId),
      originalItemMsgId:
        originalItemMsgId != null
          ? Number(originalItemMsgId)
          : Number(originalMsgId),
      originalUserId: String(originalUserId),
      originalUserChatId: originalUserChatId
        ? String(originalUserChatId)
        : null,
      content,
      alias,
      expiresAt,
    },
    { upsert: true, new: true }
  );
}

/** Lookup by relayed message_id (the one in the recipient chat). */
export async function getQuoteInfo(relayedId) {
  return await QuoteLink.findOne({ relayedId: Number(relayedId) }).lean();
}

/**
 * Typical helper to discover the *original target userId* when admin replies to a relayed message.
 */
export async function resolveTargetFromContext(ctx) {
  const replyId = ctx.message?.reply_to_message?.message_id;
  if (!replyId) return null;
  const quote = await getQuoteInfo(replyId);
  return quote?.originalUserId || null;
}

/**
 * Given a replier and the relayed message_id they replied to,
 * resolve the ORIGINAL message metadata (sender, originalMsgId/item).
 * Falls back to RelayedMessage if QuoteLink is missing/expired.
 */
export async function resolveOriginalFromReply(replierId, replyRelayedId) {
  const q = await getQuoteInfo(replyRelayedId);
  if (q) {
    return {
      originalUserId: q.originalUserId,
      originalUserChatId: q.originalUserChatId || null,
      originalMsgId: q.originalMsgId,
      originalItemMsgId: q.originalItemMsgId || q.originalMsgId,
      alias: q.alias || null,
      content: q.content || null,
    };
  }

  // Fallback: persistent mapping
  const rm = await RelayedMessage.findOne({
    userId: String(replierId),
    messageId: Number(replyRelayedId),
  }).lean();

  if (rm) {
    return {
      originalUserId: rm.originalUserId,
      originalUserChatId: null,
      originalMsgId: rm.originalMsgId,
      originalItemMsgId: rm.originalItemMsgId || rm.originalMsgId,
      alias: null,
      content: null,
    };
  }

  return null;
}

/**
 * Find the relayed message_id in a recipient's chat that corresponds to a given original message.
 * Priority: item-level (originalItemMsgId) → group-level (originalMsgId).
 * Falls back to RelayedMessage if QuoteLink is missing/expired.
 */
export async function findRelayedMessageId(recipientId, original) {
  const uid = String(recipientId);
  const itemId =
    original.originalItemMsgId != null
      ? Number(original.originalItemMsgId)
      : Number(original.originalMsgId);
  const groupId = Number(original.originalMsgId);
  const originUid = String(original.originalUserId);

  // Fast path via QuoteLink (TTL)
  const byItem = await QuoteLink.findOne({
    userId: uid,
    originalItemMsgId: itemId,
  })
    .sort({ relayedId: -1 })
    .lean();
  if (byItem?.relayedId) return byItem.relayedId;

  const byGroup = await QuoteLink.findOne({
    userId: uid,
    originalUserId: originUid,
    originalMsgId: groupId,
  })
    .sort({ relayedId: -1 })
    .lean();
  if (byGroup?.relayedId) return byGroup.relayedId;

  // Fallback via persistent RelayedMessage
  const rmItem = await RelayedMessage.findOne({
    userId: uid,
    originalItemMsgId: itemId,
  })
    .sort({ _id: -1 })
    .lean();
  if (rmItem?.messageId) return rmItem.messageId;

  const rmGroup = await RelayedMessage.findOne({
    userId: uid,
    originalUserId: originUid,
    originalMsgId: groupId,
  })
    .sort({ _id: -1 })
    .lean();
  if (rmGroup?.messageId) return rmGroup.messageId;

  return null;
}

/** Optional public link builder (1:1 chats: return null) */
export function tryBuildMessageLink(/* chatId, messageId */) {
  return null;
}
