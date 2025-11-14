import mongoose from "mongoose";

const warningSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  issuedBy: {
    type: String,
    required: true,
  },
  issuedByAlias: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for efficient user warning queries
warningSchema.index({ userId: 1, timestamp: -1 });

export const Warning = mongoose.model("Warning", warningSchema);
