import mongoose from "mongoose";

/**
 * UserAchievement Schema
 * Tracks which achievements each user has earned
 */
const userAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      ref: "User",
    },
    achievementId: {
      type: String,
      required: true,
      index: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    notified: {
      type: Boolean,
      default: false, // Track if user was notified about this achievement
    },
    progress: {
      type: Number,
      default: 0, // For tracking progress towards achievement (if applicable)
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate achievements per user
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

// Index for querying all achievements for a user
userAchievementSchema.index({ userId: 1, unlockedAt: -1 });

// Index for finding recently unlocked achievements
userAchievementSchema.index({ unlockedAt: -1 });

export const UserAchievement = mongoose.model("UserAchievement", userAchievementSchema);
