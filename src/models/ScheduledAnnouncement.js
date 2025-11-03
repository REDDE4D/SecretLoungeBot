import mongoose from 'mongoose';

const scheduledAnnouncementSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String, // Telegram user ID
    required: true,
  },
  createdByAlias: {
    type: String, // Alias at time of creation
    required: true,
  },
  scheduleType: {
    type: String,
    enum: ['once', 'recurring'],
    required: true,
  },
  // For one-time announcements
  scheduledFor: {
    type: Date,
    required: function() {
      return this.scheduleType === 'once';
    },
  },
  // For recurring announcements (cron pattern)
  cronPattern: {
    type: String,
    required: function() {
      return this.scheduleType === 'recurring';
    },
  },
  cronDescription: {
    type: String, // Human-readable description (e.g., "Every day at 9:00 AM")
  },
  // Status
  active: {
    type: Boolean,
    default: true,
  },
  // Target audience
  target: {
    type: String,
    enum: ['lobby', 'all'],
    default: 'lobby',
  },
  // Tracking
  lastSent: {
    type: Date,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  // Notes
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
scheduledAnnouncementSchema.index({ active: 1, scheduleType: 1 });
scheduledAnnouncementSchema.index({ active: 1, scheduledFor: 1 });
scheduledAnnouncementSchema.index({ createdBy: 1 });

// Static helper methods
scheduledAnnouncementSchema.statics.getActiveOneTime = async function() {
  return this.find({
    active: true,
    scheduleType: 'once',
    scheduledFor: { $lte: new Date() },
  }).sort({ scheduledFor: 1 });
};

scheduledAnnouncementSchema.statics.getActiveRecurring = async function() {
  return this.find({
    active: true,
    scheduleType: 'recurring',
  });
};

scheduledAnnouncementSchema.statics.getAllScheduled = async function() {
  return this.find({ active: true }).sort({ scheduledFor: 1, createdAt: 1 });
};

// Instance method to mark as sent
scheduledAnnouncementSchema.methods.markAsSent = async function() {
  this.lastSent = new Date();
  this.sentCount += 1;

  // Auto-disable one-time announcements after sending
  if (this.scheduleType === 'once') {
    this.active = false;
  }

  return this.save();
};

const ScheduledAnnouncement = mongoose.models.ScheduledAnnouncement || mongoose.model('ScheduledAnnouncement', scheduledAnnouncementSchema);
export default ScheduledAnnouncement;
