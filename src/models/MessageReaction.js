// models/MessageReaction.js
// Tracks user reactions for aggregating and syncing across relayed messages
import mongoose from "mongoose";

const MessageReactionSchema = new mongoose.Schema({
  originalUserId: { type: String, required: true }, // sender of the original message
  originalMsgId: { type: Number, required: true }, // original message ID
  reactorUserId: { type: String, required: true }, // user who reacted
  reactions: { type: Array, default: [] }, // array of ReactionType objects
  updatedAt: { type: Date, default: Date.now },
});

// Compound index for finding reactions by message
MessageReactionSchema.index({ originalUserId: 1, originalMsgId: 1 });

// Unique index to ensure one reaction record per user per message
MessageReactionSchema.index(
  { originalUserId: 1, originalMsgId: 1, reactorUserId: 1 },
  { unique: true }
);

// TTL: auto-delete reactions after 24 hours
MessageReactionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model("MessageReaction", MessageReactionSchema);
