// dashboard-api/controllers/settingsController.js

import * as settingsService from "../services/settingsService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { z } from "zod";

/**
 * GET /api/settings
 * Get all settings
 */
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();

  res.json({
    success: true,
    data: settings,
  });
});

/**
 * PUT /api/settings/invite-mode
 * Update invite-only mode
 */
export const updateInviteMode = asyncHandler(async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({
      success: false,
      error: "enabled field must be a boolean",
    });
  }

  const result = await settingsService.updateInviteMode(
    enabled,
    req.user.id
  );

  res.json({
    success: true,
    message: "Invite mode updated",
    data: result,
  });
});

/**
 * PUT /api/settings/slowmode
 * Update slowmode settings
 */
export const updateSlowmode = asyncHandler(async (req, res) => {
  const schema = z.object({
    enabled: z.boolean(),
    seconds: z.number().min(1).max(3600),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const { enabled, seconds } = validation.data;

  const result = await settingsService.updateSlowmode(
    enabled,
    seconds,
    req.user.id
  );

  res.json({
    success: true,
    message: "Slowmode updated",
    data: result,
  });
});

/**
 * PUT /api/settings/maintenance
 * Update maintenance mode
 */
export const updateMaintenance = asyncHandler(async (req, res) => {
  const schema = z.object({
    enabled: z.boolean(),
    message: z.string().optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const { enabled, message } = validation.data;

  const result = await settingsService.updateMaintenance(
    enabled,
    message || "",
    req.user.id
  );

  res.json({
    success: true,
    message: "Maintenance mode updated",
    data: result,
  });
});

/**
 * PUT /api/settings/welcome
 * Update welcome message settings
 */
export const updateWelcome = asyncHandler(async (req, res) => {
  const schema = z.object({
    enabled: z.boolean(),
    message: z.string().optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const { enabled, message } = validation.data;

  const result = await settingsService.updateWelcome(
    enabled,
    message || "",
    req.user.id
  );

  res.json({
    success: true,
    message: "Welcome message updated",
    data: result,
  });
});

/**
 * PUT /api/settings/rules
 * Update rules
 */
export const updateRules = asyncHandler(async (req, res) => {
  const schema = z.object({
    rules: z.array(
      z.object({
        emoji: z.string().optional(),
        text: z.string(),
      })
    ),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const { rules } = validation.data;

  const result = await settingsService.updateRules(rules, req.user.id);

  res.json({
    success: true,
    message: "Rules updated",
    data: result,
  });
});

/**
 * PUT /api/settings/spam
 * Update spam detection configuration
 */
export const updateSpamConfig = asyncHandler(async (req, res) => {
  const { spam } = req.body;

  if (!spam || typeof spam !== "object") {
    return res.status(400).json({
      success: false,
      error: "spam field must be an object",
    });
  }

  const result = await settingsService.updateSpamConfig(spam, req.user.id);

  res.json({
    success: true,
    message: "Spam configuration updated",
    data: result,
  });
});
