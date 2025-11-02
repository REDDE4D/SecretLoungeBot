// src/models/Block.js
import mongoose from "mongoose";

const BlockSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // User who blocked
    blockedUserId: { type: String, required: true }, // User who is blocked
  },
  { timestamps: true }
);

// Compound index for checking if user has blocked someone
BlockSchema.index({ userId: 1, blockedUserId: 1 }, { unique: true });

// Index for finding all users who blocked a specific user (reverse lookup)
BlockSchema.index({ blockedUserId: 1 });

const Block = mongoose.models.Block || mongoose.model("Block", BlockSchema);
export default Block;
