// src/models/Poll.js
import mongoose from "mongoose";

const PollSchema = new mongoose.Schema(
  {
    creatorId: { type: String, required: true }, // User who created the poll
    question: { type: String, required: true }, // Poll question
    options: [
      {
        text: { type: String, required: true }, // Option text
        votes: { type: [String], default: [] }, // Array of user IDs who voted
      },
    ],
    isActive: { type: Boolean, default: true }, // Whether poll is still open
    closedAt: { type: Date, default: null }, // When poll was closed
    relayedMessageIds: { type: Map, of: Number, default: {} }, // userId -> messageId mapping
  },
  { timestamps: true }
);

// Index for finding active polls
PollSchema.index({ isActive: 1, createdAt: -1 });

// Index for finding polls by creator (e.g., /endpoll command)
PollSchema.index({ creatorId: 1, isActive: 1, createdAt: -1 });

// Virtual for total vote count
PollSchema.virtual("totalVotes").get(function () {
  return this.options.reduce((sum, opt) => sum + opt.votes.length, 0);
});

const Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);
export default Poll;
