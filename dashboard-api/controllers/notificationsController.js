import notificationService from "../services/notificationService.js";

/**
 * Get notifications for the authenticated user
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      page = 1,
      limit = 50,
      unreadOnly = false,
      type = null
    } = req.query;

    const result = await notificationService.getNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      type
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
};

/**
 * Mark a notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
};

/**
 * Clear (soft delete) a notification
 * DELETE /api/notifications/:id
 */
export const clearNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await notificationService.clearNotification(id, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error clearing notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear notification'
    });
  }
};

/**
 * Clear all notifications
 * DELETE /api/notifications/clear-all
 */
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await notificationService.clearAllNotifications(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear all notifications'
    });
  }
};

/**
 * Get user notification preferences
 * GET /api/notifications/preferences
 */
export const getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[NotificationController] getPreferences called for userId:', userId);

    const preferences = await notificationService.getUserPreferences(userId);

    console.log('[NotificationController] Sending preferences to frontend:', JSON.stringify(preferences, null, 2));

    res.json({
      success: true,
      data: {
        preferences
      }
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification preferences'
    });
  }
};

/**
 * Update user notification preferences
 * PATCH /api/notifications/preferences
 */
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[NotificationController] updatePreferences called for userId:', userId);
    console.log('[NotificationController] Request body:', JSON.stringify(req.body, null, 2));

    const { soundEnabled, desktopPushEnabled, enabledTypes } = req.body;

    const updates = {};

    if (typeof soundEnabled === 'boolean') {
      updates.soundEnabled = soundEnabled;
    }

    if (typeof desktopPushEnabled === 'boolean') {
      updates.desktopPushEnabled = desktopPushEnabled;
    }

    if (Array.isArray(enabledTypes)) {
      updates.enabledTypes = enabledTypes;
    }

    console.log('[NotificationController] Updates to apply:', JSON.stringify(updates, null, 2));

    const preferences = await notificationService.updatePreferences(userId, updates);

    console.log('[NotificationController] Updated preferences:', JSON.stringify(preferences, null, 2));

    res.json({
      success: true,
      data: {
        preferences
      }
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotification,
  clearAllNotifications,
  getPreferences,
  updatePreferences
};
