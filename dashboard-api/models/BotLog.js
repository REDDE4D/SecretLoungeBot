import mongoose from "mongoose";

const botLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "error",
      "warning",
      "info",
      "relay_failure",
      "rate_limit",
      "user_blocked",
      "system_health",
      "user_action",
    ],
    index: true,
  },
  severity: {
    type: String,
    required: true,
    enum: ["critical", "high", "medium", "low", "info"],
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  userId: {
    type: String,
    default: null,
    index: true,
  },
  context: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for efficient queries
botLogSchema.index({ type: 1, timestamp: -1 });
botLogSchema.index({ severity: 1, timestamp: -1 });
botLogSchema.index({ timestamp: -1 }); // For general listing

// TTL index to automatically delete old logs after 30 days
botLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const BotLog = mongoose.model("BotLog", botLogSchema);
