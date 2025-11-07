import express from "express";
import notificationsController from "../controllers/notificationsController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', notificationsController.getNotifications);

// Mark notification as read
router.patch('/:id/read', notificationsController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationsController.markAllAsRead);

// Clear (delete) notification
router.delete('/:id', notificationsController.clearNotification);

// Clear all notifications
router.delete('/clear-all', notificationsController.clearAllNotifications);

// Get user notification preferences
router.get('/preferences', notificationsController.getPreferences);

// Update user notification preferences
router.patch('/preferences', notificationsController.updatePreferences);

export default router;
