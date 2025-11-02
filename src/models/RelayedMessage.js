// models/RelayedMessage.js
import mongoose from "mongoose";

const RelayedMessageSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // recipient chat id
  chatId: { type: String }, // alias for recipient chat id (same as userId; keep for clarity)
  messageId: { type: Number, required: true },
  originalUserId: { type: String },
  originalMsgId: { type: Number }, // original message ID from sender
  type: {
    type: String,
    enum: [
      "text",
      "photo",
      "video",
      "document",
      "audio",
      "voice",
      "animation",
      "sticker",
      "other",
    ],
    default: "text",
  },
  fileId: { type: String }, // Telegram file_id (for getFileLink)
  caption: { type: String }, // final caption sent
  albumId: { type: String }, // media_group_id if applicable
  relayedAt: { type: Date, default: Date.now },
  originalItemMsgId: { type: Number },
  expiresAt: { type: Date, required: true }, // TTL for automatic deletion
});

RelayedMessageSchema.index({ userId: 1, originalUserId: 1, originalMsgId: 1 });
RelayedMessageSchema.index({ userId: 1, originalItemMsgId: 1 });

// TTL index: automatically delete documents when expiresAt is reached
RelayedMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for history command - finding recent messages efficiently
RelayedMessageSchema.index({ relayedAt: -1 });

// Index for history command filtering by time
RelayedMessageSchema.index({ originalUserId: 1, relayedAt: -1 });

export default mongoose.model("RelayedMessage", RelayedMessageSchema);
