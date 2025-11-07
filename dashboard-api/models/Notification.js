import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'report',
      'moderation',
      'spam',
      'user_joined',
      'user_left',
      'user_status',
      'settings',
      'audit',
      'bot_log'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  cleared: {
    type: Boolean,
    default: false,
    index: true
  },
  actorId: {
    type: String,
    default: null
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, cleared: 1, timestamp: -1 });
notificationSchema.index({ userId: 1, read: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
