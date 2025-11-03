import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },

    // Hide status change announcements (user coming online/going idle/going offline)
    hideStatusAnnouncements: { type: Boolean, default: false },

    // Compact mode: show messages without extra spacing/formatting
    compactMode: { type: Boolean, default: false },

    // Notification preferences for various events
    notificationPreference: {
      type: String,
      enum: ["all", "mentions_only", "none"],
      default: "all"
    },

    // Hide join/leave announcements from other users
    hideJoinLeaveAnnouncements: { type: Boolean, default: false },

    // Auto-mark messages as read (for future webhook integration)
    autoMarkRead: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Static method to get or create default preferences
preferencesSchema.statics.getOrCreate = async function (userId) {
  let prefs = await this.findOne({ userId }).lean();
  if (!prefs) {
    prefs = await this.create({ userId });
  }
  return prefs;
};

// Static method to update a preference
preferencesSchema.statics.updatePreference = async function (userId, key, value) {
  const update = { [key]: value };
  return await this.findOneAndUpdate(
    { userId },
    { $set: update },
    { upsert: true, new: true }
  );
};

export const Preferences = mongoose.model("Preferences", preferencesSchema);
