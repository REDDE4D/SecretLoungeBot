import mongoose from 'mongoose';

/**
 * SpamDetection Model
 * Tracks spam violations and auto-mute history for users
 * Used by the anti-spam system to detect and prevent spam patterns
 */
const spamDetectionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Violation counters
  violations: {
    flood: { type: Number, default: 0 },        // Repeated identical/similar messages
    linkSpam: { type: Number, default: 0 },     // Suspicious URLs
    rapidFire: { type: Number, default: 0 },    // Burst messaging
    total: { type: Number, default: 0 }         // Total violations
  },

  // Auto-mute state
  autoMuteUntil: {
    type: Date,
    default: null,
    index: true
  },
  autoMuteLevel: {
    type: Number,
    default: 0,  // Escalation level: 0 = no mute, 1 = 5m, 2 = 15m, 3 = 1h, 4 = 24h, 5+ = perm
    min: 0
  },

  // Violation history (last 20 violations)
  violationHistory: [{
    type: {
      type: String,
      enum: ['flood', 'linkSpam', 'rapidFire'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    details: {
      type: String,
      default: ''
    },
    muteApplied: {
      type: Boolean,
      default: false
    },
    muteDuration: {
      type: Number,  // milliseconds
      default: 0
    }
  }],

  // Message tracking for pattern detection
  recentMessages: [{
    content: String,          // Message text (truncated to 200 chars)
    timestamp: Date,
    hasLinks: Boolean
  }],

  // Rate limiting state
  messageTimestamps: [Date],  // Last N message timestamps for rate checking

  // Last reset date (for weekly/monthly cooldowns)
  lastReset: {
    type: Date,
    default: Date.now
  },

  // Whitelist flag (exempts from spam checks)
  whitelisted: {
    type: Boolean,
    default: false,
    index: true
  },
  whitelistedBy: {
    type: String,
    default: null
  },
  whitelistedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Compound indexes for efficient queries
spamDetectionSchema.index({ userId: 1, autoMuteUntil: 1 });
spamDetectionSchema.index({ userId: 1, whitelisted: 1 });
spamDetectionSchema.index({ 'violations.total': -1 });  // For finding top spammers

// Methods

/**
 * Add a violation to the user's record
 * @param {String} type - Type of violation ('flood', 'linkSpam', 'rapidFire')
 * @param {String} details - Details about the violation
 * @param {Boolean} autoMute - Whether to apply auto-mute
 * @returns {Object} - Result with mute info
 */
spamDetectionSchema.methods.addViolation = async function(type, details = '', autoMute = true) {
  // Increment violation counters
  this.violations[type] = (this.violations[type] || 0) + 1;
  this.violations.total = (this.violations.total || 0) + 1;

  let muteApplied = false;
  let muteDuration = 0;
  let muteUntil = null;

  // Apply auto-mute if enabled
  if (autoMute && !this.whitelisted) {
    const level = this.autoMuteLevel + 1;
    this.autoMuteLevel = level;

    // Escalating mute durations
    const muteDurations = {
      1: 5 * 60 * 1000,      // 5 minutes
      2: 15 * 60 * 1000,     // 15 minutes
      3: 60 * 60 * 1000,     // 1 hour
      4: 24 * 60 * 60 * 1000 // 24 hours
    };

    muteDuration = muteDurations[level] || (7 * 24 * 60 * 60 * 1000); // 7 days for level 5+
    muteUntil = new Date(Date.now() + muteDuration);
    this.autoMuteUntil = muteUntil;
    muteApplied = true;
  }

  // Add to violation history (keep last 20)
  this.violationHistory.push({
    type,
    timestamp: new Date(),
    details,
    muteApplied,
    muteDuration
  });

  if (this.violationHistory.length > 20) {
    this.violationHistory = this.violationHistory.slice(-20);
  }

  await this.save();

  return {
    muteApplied,
    muteDuration,
    muteUntil,
    level: this.autoMuteLevel,
    totalViolations: this.violations.total
  };
};

/**
 * Check if user is currently auto-muted
 * @returns {Boolean}
 */
spamDetectionSchema.methods.isAutoMuted = function() {
  if (!this.autoMuteUntil) return false;
  return this.autoMuteUntil > new Date();
};

/**
 * Clear auto-mute and optionally reset violations
 * @param {Boolean} resetViolations - Whether to reset violation counters
 */
spamDetectionSchema.methods.clearAutoMute = async function(resetViolations = false) {
  this.autoMuteUntil = null;

  if (resetViolations) {
    this.autoMuteLevel = 0;
    this.violations.flood = 0;
    this.violations.linkSpam = 0;
    this.violations.rapidFire = 0;
    this.violations.total = 0;
  }

  await this.save();
};

/**
 * Add message to recent messages for pattern detection
 * @param {String} content - Message content
 * @param {Boolean} hasLinks - Whether message contains links
 */
spamDetectionSchema.methods.trackMessage = function(content, hasLinks = false) {
  const truncated = content ? content.substring(0, 200) : '';

  this.recentMessages.push({
    content: truncated,
    timestamp: new Date(),
    hasLinks
  });

  // Keep only last 10 messages
  if (this.recentMessages.length > 10) {
    this.recentMessages = this.recentMessages.slice(-10);
  }

  // Track timestamp for rate limiting
  this.messageTimestamps.push(new Date());

  // Keep only last 60 timestamps (1 minute window)
  if (this.messageTimestamps.length > 60) {
    this.messageTimestamps = this.messageTimestamps.slice(-60);
  }
};

/**
 * Clean old messages and timestamps (called periodically)
 */
spamDetectionSchema.methods.cleanOldData = function() {
  const now = new Date();
  const oneMinuteAgo = new Date(now - 60 * 1000);
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

  // Remove messages older than 5 minutes
  this.recentMessages = this.recentMessages.filter(msg =>
    msg.timestamp > fiveMinutesAgo
  );

  // Remove timestamps older than 1 minute
  this.messageTimestamps = this.messageTimestamps.filter(ts =>
    ts > oneMinuteAgo
  );
};

/**
 * Reset violations (weekly or manual)
 */
spamDetectionSchema.methods.resetViolations = async function() {
  this.violations.flood = 0;
  this.violations.linkSpam = 0;
  this.violations.rapidFire = 0;
  this.violations.total = 0;
  this.autoMuteLevel = Math.max(0, this.autoMuteLevel - 1); // Reduce one level
  this.lastReset = new Date();

  await this.save();
};

// Statics

/**
 * Get or create spam detection record for user
 * @param {String} userId - Telegram user ID
 * @returns {Object} - SpamDetection document
 */
spamDetectionSchema.statics.getOrCreate = async function(userId) {
  let record = await this.findOne({ userId });

  if (!record) {
    record = await this.create({ userId });
  }

  return record;
};

/**
 * Check if user is whitelisted
 * @param {String} userId - Telegram user ID
 * @returns {Boolean}
 */
spamDetectionSchema.statics.isWhitelisted = async function(userId) {
  const record = await this.findOne({ userId });
  return record ? record.whitelisted : false;
};

/**
 * Whitelist a user (exempt from spam checks)
 * @param {String} userId - Telegram user ID
 * @param {String} whitelistedBy - Admin who whitelisted
 * @returns {Object} - Updated record
 */
spamDetectionSchema.statics.whitelist = async function(userId, whitelistedBy) {
  let record = await this.getOrCreate(userId);

  record.whitelisted = true;
  record.whitelistedBy = whitelistedBy;
  record.whitelistedAt = new Date();

  await record.save();
  return record;
};

/**
 * Remove user from whitelist
 * @param {String} userId - Telegram user ID
 * @returns {Object} - Updated record
 */
spamDetectionSchema.statics.unwhitelist = async function(userId) {
  let record = await this.findOne({ userId });

  if (record) {
    record.whitelisted = false;
    record.whitelistedBy = null;
    record.whitelistedAt = null;
    await record.save();
  }

  return record;
};

/**
 * Get top spammers (by total violations)
 * @param {Number} limit - Number of results
 * @returns {Array} - Top spammers
 */
spamDetectionSchema.statics.getTopSpammers = async function(limit = 10) {
  return this.find()
    .sort({ 'violations.total': -1 })
    .limit(limit)
    .lean();
};

/**
 * Clean expired auto-mutes (run periodically)
 */
spamDetectionSchema.statics.cleanExpiredMutes = async function() {
  const now = new Date();

  const result = await this.updateMany(
    { autoMuteUntil: { $lt: now } },
    {
      $set: { autoMuteUntil: null }
    }
  );

  return result.modifiedCount;
};

const SpamDetection = mongoose.model('SpamDetection', spamDetectionSchema);

export default SpamDetection;
