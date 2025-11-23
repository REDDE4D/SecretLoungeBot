import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: String, // Telegram user ID
  alias: { type: String, required: false, unique: true, sparse: true, index: true },
  // Telegram user info (updated on login)
  username: { type: String, default: null }, // Telegram @username
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  icon: {
    customEmojiId: { type: String, default: null },
    fallback: { type: String, default: "👤" },
  },
  inLobby: { type: Boolean, default: false, index: true },
  // Karma system
  karma: { type: Number, default: 0, index: true },
  karmaGivenToday: { type: Number, default: 0 },
  lastKarmaReset: { type: Date, default: Date.now },
  preferences: { type: Map, of: String, default: {} },
  role: {
    type: String,
    enum: ["owner", "admin", "mod", "whitelist", null],
    default: null,
  },
  customRoles: {
    type: [String], // Array of custom role IDs
    default: [],
    index: true,
  },
  mutedUntil: { type: Date, default: null },
  bannedUntil: { type: Date, default: null },
  warnings: { type: Number, default: 0 },
  mediaRestricted: { type: Boolean, default: false },
  canPostLinks: { type: Boolean, default: false },
  blockedBot: { type: Boolean, default: false, index: true },
  blockedAt: { type: Date, default: null },
});

// Compound index for lobby member queries with role filtering
userSchema.index({ inLobby: 1, role: 1 });

// Index for moderation queries - finding users with restrictions
userSchema.index({ bannedUntil: 1 });
userSchema.index({ mutedUntil: 1 });

export const User = mongoose.model("User", userSchema);
