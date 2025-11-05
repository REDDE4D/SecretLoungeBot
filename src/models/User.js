import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: String, // Telegram user ID
  alias: { type: String, required: false, unique: true, sparse: true, index: true },
  icon: {
    customEmojiId: { type: String, default: null },
    fallback: { type: String, default: "👤" },
  },
  inLobby: { type: Boolean, default: false, index: true },
  preferences: { type: Map, of: String, default: {} },
  role: {
    type: String,
    enum: ["admin", "mod", "whitelist", null],
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
});

// Compound index for lobby member queries with role filtering
userSchema.index({ inLobby: 1, role: 1 });

// Index for moderation queries - finding users with restrictions
userSchema.index({ bannedUntil: 1 });
userSchema.index({ mutedUntil: 1 });

export const User = mongoose.model("User", userSchema);
