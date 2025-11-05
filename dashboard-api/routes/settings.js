// dashboard-api/routes/settings.js

import express from "express";
import * as settingsController from "../controllers/settingsController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermissions } from "../middleware/rbac.js";

const router = express.Router();

// All settings routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/settings
 * @desc    Get all settings
 * @access  Private (requires settings.view permission)
 */
router.get(
  "/",
  requirePermissions(["settings.view"]),
  settingsController.getSettings
);

/**
 * @route   PUT /api/settings/invite-mode
 * @desc    Update invite-only mode
 * @access  Private (requires settings.edit_invite permission)
 * @body    {boolean} enabled - Enable invite-only mode
 */
router.put(
  "/invite-mode",
  requirePermissions(["settings.edit_invite"]),
  settingsController.updateInviteMode
);

/**
 * @route   PUT /api/settings/slowmode
 * @desc    Update slowmode settings
 * @access  Private (requires settings.edit_slowmode permission)
 * @body    {boolean} enabled - Enable slowmode
 * @body    {number} seconds - Delay in seconds (1-3600)
 */
router.put(
  "/slowmode",
  requirePermissions(["settings.edit_slowmode"]),
  settingsController.updateSlowmode
);

/**
 * @route   PUT /api/settings/maintenance
 * @desc    Update maintenance mode
 * @access  Private (requires settings.edit_maintenance permission)
 * @body    {boolean} enabled - Enable maintenance mode
 * @body    {string} [message] - Maintenance message
 */
router.put(
  "/maintenance",
  requirePermissions(["settings.edit_maintenance"]),
  settingsController.updateMaintenance
);

/**
 * @route   PUT /api/settings/welcome
 * @desc    Update welcome message settings
 * @access  Private (requires settings.edit_welcome permission)
 * @body    {boolean} enabled - Enable welcome message
 * @body    {string} [message] - Welcome message
 */
router.put(
  "/welcome",
  requirePermissions(["settings.edit_welcome"]),
  settingsController.updateWelcome
);

/**
 * @route   PUT /api/settings/rules
 * @desc    Update rules
 * @access  Private (requires settings.edit_rules permission)
 * @body    {Array} rules - Array of rule objects with emoji and text
 */
router.put(
  "/rules",
  requirePermissions(["settings.edit_rules"]),
  settingsController.updateRules
);

/**
 * @route   PUT /api/settings/spam
 * @desc    Update spam detection configuration
 * @access  Private (requires settings.edit_spam permission)
 * @body    {Object} spam - Spam detection configuration
 */
router.put(
  "/spam",
  requirePermissions(["settings.edit_spam"]),
  settingsController.updateSpamConfig
);

export default router;
