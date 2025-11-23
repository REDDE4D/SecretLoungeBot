import mongoose from "mongoose";

/**
 * Karma Transaction Schema
 *
 * Tracks individual karma transactions between users for audit trail
 * and cooldown enforcement.
 */
const karmaSchema = new mongoose.Schema(
  {
    giverId: {
      type: String,
      required: true,
      index: true,
    },
    receiverId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      enum: [1, -1], // Only +1 or -1
    },
    messageId: {
      type: Number, // Telegram message ID
      required: false,
    },
    trigger: {
      type: String, // What triggered the karma ("+1", "👍", "thanks", etc.)
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for cooldown checks (find recent karma from giver to receiver)
karmaSchema.index({ giverId: 1, receiverId: 1, createdAt: -1 });

// Index for daily limit checks
karmaSchema.index({ giverId: 1, createdAt: -1 });

const Karma = mongoose.model("Karma", karmaSchema);

export default Karma;
