import mongoose from "../../node_modules/mongoose/index.js";

/**
 * Login Attempt Model
 * Tracks failed login attempts for brute force protection
 */
const loginAttemptSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      index: true,
      // Can be either IP address or user ID
    },
    type: {
      type: String,
      required: true,
      enum: ["ip", "user"],
      index: true,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    lastAttempt: {
      type: Date,
      default: Date.now,
    },
    blockedUntil: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - automatically delete old login attempts after 24 hours of inactivity
loginAttemptSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 86400 });

/**
 * Record a failed login attempt
 * Implements progressive delays:
 * - 3 attempts: 1 minute block
 * - 5 attempts: 5 minutes block
 * - 7 attempts: 15 minutes block
 * - 10+ attempts: 1 hour block
 */
loginAttemptSchema.statics.recordFailure = async function (
  identifier,
  type = "ip"
) {
  const now = new Date();
  const attempt = await this.findOne({ identifier, type });

  if (attempt) {
    attempt.attempts += 1;
    attempt.lastAttempt = now;

    // Calculate block duration based on attempts
    let blockMinutes = 0;
    if (attempt.attempts >= 10) {
      blockMinutes = 60; // 1 hour
    } else if (attempt.attempts >= 7) {
      blockMinutes = 15;
    } else if (attempt.attempts >= 5) {
      blockMinutes = 5;
    } else if (attempt.attempts >= 3) {
      blockMinutes = 1;
    }

    if (blockMinutes > 0) {
      attempt.blockedUntil = new Date(now.getTime() + blockMinutes * 60 * 1000);
    }

    await attempt.save();
    return attempt;
  }

  // Create new attempt record
  return this.create({
    identifier,
    type,
    attempts: 1,
    lastAttempt: now,
  });
};

/**
 * Check if identifier is currently blocked
 */
loginAttemptSchema.statics.isBlocked = async function (identifier, type = "ip") {
  const attempt = await this.findOne({ identifier, type });

  if (!attempt) {
    return { blocked: false, attemptsLeft: 3 };
  }

  const now = new Date();

  // Check if blocked
  if (attempt.blockedUntil && attempt.blockedUntil > now) {
    const minutesLeft = Math.ceil((attempt.blockedUntil - now) / 60000);
    return {
      blocked: true,
      blockedUntil: attempt.blockedUntil,
      minutesLeft,
      attempts: attempt.attempts,
    };
  }

  // Calculate attempts left before next block
  let nextBlockThreshold = 3;
  if (attempt.attempts >= 10) {
    nextBlockThreshold = attempt.attempts + 1;
  } else if (attempt.attempts >= 7) {
    nextBlockThreshold = 10;
  } else if (attempt.attempts >= 5) {
    nextBlockThreshold = 7;
  } else if (attempt.attempts >= 3) {
    nextBlockThreshold = 5;
  }

  return {
    blocked: false,
    attempts: attempt.attempts,
    attemptsLeft: nextBlockThreshold - attempt.attempts,
  };
};

/**
 * Reset attempts on successful login
 */
loginAttemptSchema.statics.resetAttempts = async function (
  identifier,
  type = "ip"
) {
  return this.deleteOne({ identifier, type });
};

/**
 * Get all currently blocked identifiers (for admin monitoring)
 */
loginAttemptSchema.statics.getBlockedList = async function () {
  const now = new Date();
  return this.find({
    blockedUntil: { $gt: now },
  })
    .sort({ blockedUntil: -1 })
    .lean();
};

const LoginAttempt = mongoose.model("LoginAttempt", loginAttemptSchema);

export default LoginAttempt;
