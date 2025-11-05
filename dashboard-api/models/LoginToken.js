import mongoose from "../../node_modules/mongoose/index.js";

const loginTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String, // Telegram user ID
      default: null,
    },
    userData: {
      type: Object, // Complete Telegram user data for authentication
      default: null,
    },
    authenticated: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to auto-delete expired tokens
loginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LoginToken = mongoose.model("LoginToken", loginTokenSchema);
