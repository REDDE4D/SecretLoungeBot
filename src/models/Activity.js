import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  firstSeen: { type: Date, default: Date.now },
  lastActive: { type: Date, default: null },
  status: {
    type: String,
    enum: ["online", "idle", "offline"],
    default: "offline",
  },
  lastOnlineChange: { type: Date, default: null },
  mediaCounts: {
    first24h: { type: Number, default: 0 },
    byDate: { type: Map, of: Number, default: {} },
  },
  // Profile statistics
  totalMessages: { type: Number, default: 0 }, // Total messages sent
  totalReplies: { type: Number, default: 0 }, // Total replies sent
  totalTextMessages: { type: Number, default: 0 }, // Text-only messages
  totalMediaMessages: { type: Number, default: 0 }, // Media messages (photo, video, etc.)
});

// Compound index for queries filtering by status
activitySchema.index({ status: 1, lastActive: -1 });

// Compound index for compliance queries filtering by user and last activity
activitySchema.index({ userId: 1, lastActive: -1 });

// Compound index for user-specific status queries (e.g., checking if user is online)
activitySchema.index({ userId: 1, status: 1 });

export const Activity = mongoose.model("Activity", activitySchema);
