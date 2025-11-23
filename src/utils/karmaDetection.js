/**
 * Karma Detection Utility
 *
 * Detects karma triggers in messages and extracts karma values.
 * Supports text triggers, emojis, and positive words.
 */

import RelayedMessage from "../models/RelayedMessage.js";

// Text-based karma triggers
const KARMA_TRIGGERS = {
  // Explicit karma
  "+1": 1,
  "-1": -1,
  "++": 1,
  "--": -1,

  // Upvote/downvote emojis
  "👍": 1,
  "👎": -1,
  "⬆️": 1,
  "⬇️": 1,
  "⬆": 1,
  "⬇": -1,

  // Positive word triggers (case-insensitive)
  thanks: 1,
  helpful: 1,
  great: 1,
  awesome: 1,
  amazing: 1,
  excellent: 1,
  perfect: 1,
  "thank you": 1,
  thx: 1,
  ty: 1,

  // Custom reaction emojis (high value)
  "⭐": 1,
  "🌟": 1,
  "❤️": 1,
  "💖": 1,
  "🔥": 1,
  "✨": 1,
};

/**
 * Detects if a message contains a karma trigger
 *
 * @param {string} text - The message text to check
 * @returns {Object|null} - { trigger: string, amount: number } or null
 */
export function detectKarmaTrigger(text) {
  if (!text) return null;

  // Normalize text for checking
  const normalized = text.trim();
  const lowerText = normalized.toLowerCase();

  // Check for exact matches (emojis and symbols)
  if (KARMA_TRIGGERS.hasOwnProperty(normalized)) {
    return {
      trigger: normalized,
      amount: KARMA_TRIGGERS[normalized],
    };
  }

  // Check for case-insensitive word matches
  for (const [trigger, amount] of Object.entries(KARMA_TRIGGERS)) {
    if (trigger.toLowerCase() === lowerText) {
      return {
        trigger: trigger,
        amount: amount,
      };
    }
  }

  // Check if the entire message is just a positive word
  const words = lowerText.split(/\s+/);
  if (words.length === 1 && KARMA_TRIGGERS.hasOwnProperty(words[0])) {
    return {
      trigger: words[0],
      amount: KARMA_TRIGGERS[words[0]],
    };
  }

  // Check for "thank you" phrase
  if (lowerText === "thank you" || lowerText === "thankyou") {
    return {
      trigger: "thank you",
      amount: 1,
    };
  }

  return null;
}

/**
 * Checks if a message is valid for karma giving
 *
 * @param {Object} ctx - Telegraf context
 * @returns {boolean} - True if message can trigger karma
 */
export function isValidKarmaMessage(ctx) {
  // Must be a reply to another message
  if (!ctx.message?.reply_to_message) {
    return false;
  }

  // Must have text content
  if (!ctx.message.text) {
    return false;
  }

  // Cannot give karma to yourself
  const senderId = String(ctx.from.id);
  const replyToId = String(ctx.message.reply_to_message.from?.id);

  if (senderId === replyToId) {
    return false;
  }

  // Cannot give karma to the bot itself
  if (ctx.message.reply_to_message.from?.is_bot) {
    return false;
  }

  return true;
}

/**
 * Extracts karma information from a message context
 *
 * @param {Object} ctx - Telegraf context
 * @returns {Promise<Object|null>} - { giverId, receiverId, messageId, trigger, amount } or null
 */
export async function extractKarmaFromMessage(ctx) {
  // Must be a reply
  if (!ctx.message?.reply_to_message || !ctx.message.text) {
    console.log("Karma: No reply or no text");
    return null;
  }

  const karmaTrigger = detectKarmaTrigger(ctx.message.text);
  console.log("Karma: detectKarmaTrigger result:", karmaTrigger);
  if (!karmaTrigger) {
    console.log("Karma: No trigger detected for text:", ctx.message.text);
    return null;
  }

  const giverId = String(ctx.from.id);
  const repliedMessageId = ctx.message.reply_to_message.message_id;

  console.log("Karma: Looking up RelayedMessage:", { userId: giverId, messageId: repliedMessageId });

  // Look up the original sender from RelayedMessage
  // When replying in the lobby, users reply to the bot's relayed copy
  // We need to find the original sender from the database
  const relayedMsg = await RelayedMessage.findOne({
    userId: giverId, // The person giving karma (recipient of the relayed message)
    messageId: repliedMessageId, // The message ID they're replying to
  }).lean();

  console.log("Karma: RelayedMessage lookup result:", relayedMsg ? "found" : "not found");

  if (!relayedMsg) {
    // Not a relayed message, might be a direct reply (shouldn't happen in lobby)
    console.log("Karma: No RelayedMessage found");
    return null;
  }

  const receiverId = relayedMsg.originalUserId;

  console.log("Karma: Sender and receiver:", { giverId, receiverId });

  // Cannot give karma to yourself
  if (giverId === receiverId) {
    console.log("Karma: Sender and receiver are the same (self-karma blocked)");
    return null;
  }

  const result = {
    giverId,
    receiverId,
    messageId: relayedMsg.originalMsgId,
    trigger: karmaTrigger.trigger,
    amount: karmaTrigger.amount,
  };

  console.log("Karma: Returning karma data:", result);
  return result;
}
