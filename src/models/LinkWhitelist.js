import mongoose from 'mongoose';

const linkWhitelistSchema = new mongoose.Schema(
  {
    pattern: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['domain', 'full_url'],
      default: 'domain',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    addedBy: {
      type: String, // Telegram user ID
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups
linkWhitelistSchema.index({ pattern: 1, active: 1 });
linkWhitelistSchema.index({ active: 1 });

export const LinkWhitelist = mongoose.model('LinkWhitelist', linkWhitelistSchema);
