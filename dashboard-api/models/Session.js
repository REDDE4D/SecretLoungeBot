import mongoose from "../../node_modules/mongoose/index.js";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accessTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - automatically delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient session queries
sessionSchema.index({ userId: 1, expiresAt: 1 });

/**
 * Find active session by access token hash
 */
sessionSchema.statics.findByAccessToken = async function (tokenHash) {
  return this.findOne({
    accessTokenHash: tokenHash,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Find active session by refresh token hash
 */
sessionSchema.statics.findByRefreshToken = async function (tokenHash) {
  return this.findOne({
    refreshTokenHash: tokenHash,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Get all active sessions for a user
 */
sessionSchema.statics.getUserSessions = async function (userId) {
  return this.find({
    userId,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 });
};

/**
 * Clean up old sessions (limit to 5 per user)
 */
sessionSchema.statics.cleanupUserSessions = async function (userId) {
  const sessions = await this.getUserSessions(userId);

  if (sessions.length > 5) {
    const toDelete = sessions.slice(5).map(s => s._id);
    await this.deleteMany({ _id: { $in: toDelete } });
  }
};

/**
 * Invalidate all sessions for a user (logout all devices)
 */
sessionSchema.statics.invalidateAllUserSessions = async function (userId) {
  return this.deleteMany({ userId });
};

const Session = mongoose.model("Session", sessionSchema);

export default Session;
