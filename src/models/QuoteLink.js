// src/models/QuoteLink.js
import mongoose from "mongoose";

/**
 * Lightweight, short-lived mapping between a *relayed* message_id (in a recipient chat)
 * and the *original* message identifiers from the sender's chat.
 *
 * This is complementary to RelayedMessage (which is persistent). QuoteLink gives
 * quick lookups for reply threading and expires automatically.
 */
const QuoteLinkSchema = new mongoose.Schema(
  {
    // The relayed (bot) message_id in the recipient chat
    relayedId: { type: Number, required: true, index: true },

    // Recipient chat id (who received the relayed message)
    userId: { type: String, default: null, index: true },

    // Original identifiers
    originalUserId: { type: String, required: true, index: true },
    originalUserChatId: { type: String, default: null },

    // The original "group-level" message_id (e.g., first item of album or a single text)
    originalMsgId: { type: Number, required: true, index: true },

    // The exact original item id (for media groups, each item has its own message_id)
    // For single messages, set this == originalMsgId
    originalItemMsgId: { type: Number, default: null, index: true },

    // Optional presentation data
    alias: { type: String, default: null },
    content: { type: String, default: null },

    // TTL field — MongoDB will auto-delete when this time is passed
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

// TTL index (expireAfterSeconds: 0 means expire at 'expiresAt' exactly)
QuoteLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const QuoteLink =
  mongoose.models.QuoteLink || mongoose.model("QuoteLink", QuoteLinkSchema);

export default QuoteLink;
