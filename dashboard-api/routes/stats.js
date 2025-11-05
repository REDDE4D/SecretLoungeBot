// dashboard-api/routes/stats.js

import express from "express";
import * as statsController from "../controllers/statsController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermissions } from "../middleware/rbac.js";

const router = express.Router();

// All stats routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/stats/overview
 * @desc    Get dashboard overview statistics
 * @access  Private (requires stats.view_overview permission)
 * @query   {string} [period=day] - Time period: day, week, month
 */
router.get(
  "/overview",
  requirePermissions(["stats.view_overview"]),
  statsController.getOverview
);

/**
 * @route   GET /api/stats/users
 * @desc    Get detailed user statistics
 * @access  Private (requires stats.view_users permission)
 * @query   {string} [period=day] - Time period: day, week, month
 */
router.get(
  "/users",
  requirePermissions(["stats.view_users"]),
  statsController.getUsers
);

/**
 * @route   GET /api/stats/messages
 * @desc    Get detailed message statistics
 * @access  Private (requires stats.view_messages permission)
 * @query   {string} [period=day] - Time period: day, week, month
 */
router.get(
  "/messages",
  requirePermissions(["stats.view_messages"]),
  statsController.getMessages
);

/**
 * @route   GET /api/stats/moderation
 * @desc    Get moderation statistics
 * @access  Private (requires stats.view_moderation permission)
 */
router.get(
  "/moderation",
  requirePermissions(["stats.view_moderation"]),
  statsController.getModeration
);

/**
 * @route   GET /api/stats/spam
 * @desc    Get anti-spam statistics
 * @access  Private (requires stats.view_moderation permission)
 */
router.get(
  "/spam",
  requirePermissions(["stats.view_moderation"]),
  statsController.getSpam
);

/**
 * @route   GET /api/stats/activity
 * @desc    Get activity trends over time
 * @access  Private (requires stats.view_overview permission)
 * @query   {string} [period=week] - Time period: day, week, month
 */
router.get(
  "/activity",
  requirePermissions(["stats.view_overview"]),
  statsController.getActivity
);

export default router;
