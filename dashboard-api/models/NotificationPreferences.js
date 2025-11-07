import mongoose from 'mongoose';

const notificationPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  soundEnabled: {
    type: Boolean,
    default: true
  },
  desktopPushEnabled: {
    type: Boolean,
    default: false
  },
  enabledTypes: {
    type: [String],
    default: [
      'report',
      'moderation',
      'spam',
      'user_joined',
      'user_left',
      'user_status',
      'settings',
      'audit',
      'bot_log'
    ],
    validate: {
      validator: function(types) {
        const validTypes = [
          'report',
          'moderation',
          'spam',
          'user_joined',
          'user_left',
          'user_status',
          'settings',
          'audit',
          'bot_log'
        ];
        return types.every(type => validTypes.includes(type));
      },
      message: 'Invalid notification type in enabledTypes'
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
notificationPreferencesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const NotificationPreferences = mongoose.model('NotificationPreferences', notificationPreferencesSchema);
export default NotificationPreferences;
