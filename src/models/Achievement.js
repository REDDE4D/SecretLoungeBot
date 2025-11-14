import mongoose from "mongoose";

/**
 * Achievement Schema
 * Defines all available achievements in the system
 */
const achievementSchema = new mongoose.Schema(
  {
    achievementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    icon: {
      type: String,
      default: "🏆",
      maxlength: 10,
    },
    category: {
      type: String,
      enum: [
        "messaging", // Message-related achievements
        "social", // Social interaction achievements
        "tenure", // Time-based achievements
        "milestone", // Numeric milestones
        "special", // Special/rare achievements
        "role", // Role-based achievements
      ],
      required: true,
    },
    tier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum", "diamond"],
      default: "bronze",
    },
    points: {
      type: Number,
      default: 10,
      min: 0,
    },
    secret: {
      type: Boolean,
      default: false, // Secret achievements are hidden until unlocked
    },
    // Conditions to unlock (stored as metadata, actual logic is in achievement service)
    condition: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
achievementSchema.index({ category: 1 });
achievementSchema.index({ tier: 1 });
achievementSchema.index({ secret: 1 });

export const Achievement = mongoose.model("Achievement", achievementSchema);
