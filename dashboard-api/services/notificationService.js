import mongoose from "mongoose";
import { getIoInstance } from "../config/socket.js";

// Helper functions to get models at runtime (after registration)
const getNotification = () => mongoose.model("Notification");
const getNotificationPreferences = () => mongoose.model("NotificationPreferences");
const getUser = () => mongoose.model("User");

/**
 * Get or create notification preferences for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User preferences
 */
export async function getUserPreferences(userId) {
  try {
    console.log(`[NotificationService] getUserPreferences called for userId: ${userId}`);
    const NotificationPreferences = getNotificationPreferences();
    console.log(`[NotificationService] Model retrieved:`, NotificationPreferences.modelName);

    let preferences = await NotificationPreferences.findOne({ userId });
    console.log(`[NotificationService] Existing preferences found:`, preferences ? 'YES' : 'NO');

    if (!preferences) {
      // Create default preferences
      console.log(`[NotificationService] Creating default preferences for userId: ${userId}`);
      preferences = await NotificationPreferences.create({ userId });
      console.log(`[NotificationService] Default preferences created:`, preferences._id);
    }

    console.log(`[NotificationService] Returning preferences:`, JSON.stringify(preferences, null, 2));

    return preferences;
  } catch (error) {
    console.error(`[NotificationService] ERROR in getUserPreferences:`, error);
    console.error(`[NotificationService] Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Create a notification for specific user(s)
 * @param {string|string[]} userIds - Single user ID or array of user IDs
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string|null} actorId - User ID who triggered the action (for filtering)
 * @param {Object} data - Additional metadata
 * @returns {Promise<Notification[]>} Created notifications
 */
export async function createNotification(userIds, type, title, message, actorId = null, data = {}) {
  try {
    console.log(`[NotificationService] createNotification called:`, { userIds, type, title, actorId });
    const Notification = getNotification();

    // Normalize to array
    const userIdArray = Array.isArray(userIds) ? userIds : [userIds];
    console.log(`[NotificationService] Processing ${userIdArray.length} user(s)`);

    const createdNotifications = [];
    const io = getIoInstance();

    for (const userId of userIdArray) {
      console.log(`[NotificationService] Processing user: ${userId}`);

      // Skip if actor is the same as recipient (don't notify yourself)
      if (actorId && userId === actorId) {
        console.log(`[NotificationService] Skipping actor userId: ${userId}`);
        continue;
      }

      // Check user preferences
      const preferences = await getUserPreferences(userId);
      console.log(`[NotificationService] User ${userId} enabledTypes:`, preferences.enabledTypes);

      // Skip if user has disabled this notification type
      if (!preferences.enabledTypes.includes(type)) {
        console.log(`[NotificationService] User ${userId} has disabled type: ${type}`);
        continue;
      }

      // Create notification in database
      console.log(`[NotificationService] Creating notification in DB for user: ${userId}`);
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        actorId,
        data,
        read: false,
        cleared: false
      });
      console.log(`[NotificationService] Notification created with ID: ${notification._id}`);

      createdNotifications.push(notification);

      // Emit via WebSocket to user if they're connected
      // Send to their personal room (lobby room or admin-room/mod-room)
      io.to(`user:${userId}`).emit('notification:new', {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        timestamp: notification.timestamp
      });
      console.log(`[NotificationService] Emitted to user:${userId}`);
    }

    console.log(`[NotificationService] Created ${createdNotifications.length} notification(s)`);
    return createdNotifications;
  } catch (error) {
    console.error(`[NotificationService] ERROR in createNotification:`, error);
    console.error(`[NotificationService] Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Create notifications for all users with specific permissions/roles
 * @param {string} targetRole - 'admin', 'mod', or 'all'
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string|null} actorId - User ID who triggered the action
 * @param {Object} data - Additional metadata
 * @returns {Promise<Notification[]>} Created notifications
 */
export async function createBroadcastNotification(targetRole, type, title, message, actorId = null, data = {}) {
  const User = getUser();

  let query = {};

  if (targetRole === 'admin') {
    query = { role: { $in: ['owner', 'admin'] } }; // Include owner
  } else if (targetRole === 'mod') {
    query = { role: { $in: ['owner', 'admin', 'mod'] } }; // Include owner
  } else if (targetRole === 'all') {
    query = { role: { $exists: true } }; // All registered users
  }

  console.log(`[NotificationService] createBroadcastNotification query:`, query);

  // Get all users matching criteria
  const users = await User.find(query).select('_id');
  const userIds = users.map(u => u._id.toString());

  console.log(`[NotificationService] Found ${userIds.length} users for targetRole '${targetRole}':`, userIds);

  return await createNotification(userIds, type, title, message, actorId, data);
}

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Notifications with pagination
 */
export async function getNotifications(userId, options = {}) {
  const Notification = getNotification();

  const {
    page = 1,
    limit = 50,
    unreadOnly = false,
    type = null
  } = options;

  const query = {
    userId,
    cleared: false
  };

  if (unreadOnly) {
    query.read = false;
  }

  if (type) {
    query.type = type;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, cleared: false, read: false })
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    unreadCount
  };
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Notification|null>} Updated notification
 */
export async function markAsRead(notificationId, userId) {
  const Notification = getNotification();

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );

  return notification;
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of updated notifications
 */
export async function markAllAsRead(userId) {
  const Notification = getNotification();

  const result = await Notification.updateMany(
    { userId, cleared: false, read: false },
    { read: true }
  );

  return result.modifiedCount;
}

/**
 * Clear (soft delete) a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Notification|null>} Updated notification
 */
export async function clearNotification(notificationId, userId) {
  const Notification = getNotification();

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { cleared: true },
    { new: true }
  );

  return notification;
}

/**
 * Clear all notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of cleared notifications
 */
export async function clearAllNotifications(userId) {
  const Notification = getNotification();

  const result = await Notification.updateMany(
    { userId, cleared: false },
    { cleared: true }
  );

  return result.modifiedCount;
}

/**
 * Update user notification preferences
 * @param {string} userId - User ID
 * @param {Object} updates - Preference updates
 * @returns {Promise<NotificationPreferences>} Updated preferences
 */
export async function updatePreferences(userId, updates) {
  try {
    console.log(`[NotificationService] updatePreferences called for userId: ${userId}`);
    console.log(`[NotificationService] Updates:`, JSON.stringify(updates, null, 2));

    const NotificationPreferences = getNotificationPreferences();

    const preferences = await NotificationPreferences.findOneAndUpdate(
      { userId },
      updates,
      { new: true, upsert: true }
    );

    console.log(`[NotificationService] Updated preferences result:`, JSON.stringify(preferences, null, 2));

    return preferences;
  } catch (error) {
    console.error(`[NotificationService] ERROR in updatePreferences:`, error);
    console.error(`[NotificationService] Error stack:`, error.stack);
    throw error;
  }
}

export default {
  createNotification,
  createBroadcastNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotification,
  clearAllNotifications,
  getUserPreferences,
  updatePreferences
};
