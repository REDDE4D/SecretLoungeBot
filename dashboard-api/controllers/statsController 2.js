// dashboard-api/controllers/statsController.js

import * as statsService from "../services/statsService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

/**
 * GET /api/stats/overview
 * Get dashboard overview statistics
 */
export const getOverview = asyncHandler(async (req, res) => {
  const { period = "day" } = req.query;

  // Validate period parameter
  const validPeriods = ["day", "week", "month"];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      error: "Invalid period. Must be one of: day, week, month",
    });
  }

  const stats = await statsService.getOverviewStats(period);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/stats/users
 * Get detailed user statistics
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { period = "day" } = req.query;

  // Validate period parameter
  const validPeriods = ["day", "week", "month"];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      error: "Invalid period. Must be one of: day, week, month",
    });
  }

  const stats = await statsService.getUsersStats(period);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/stats/messages
 * Get detailed message statistics
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { period = "day" } = req.query;

  // Validate period parameter
  const validPeriods = ["day", "week", "month"];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      error: "Invalid period. Must be one of: day, week, month",
    });
  }

  const stats = await statsService.getMessagesStats(period);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/stats/moderation
 * Get moderation statistics
 */
export const getModeration = asyncHandler(async (req, res) => {
  const stats = await statsService.getModerationStatistics();

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/stats/spam
 * Get anti-spam statistics
 */
export const getSpam = asyncHandler(async (req, res) => {
  const stats = await statsService.getSpamStatistics();

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/stats/activity
 * Get activity trends over time
 */
export const getActivity = asyncHandler(async (req, res) => {
  const { period = "week" } = req.query;

  // Validate period parameter
  const validPeriods = ["day", "week", "month"];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      error: "Invalid period. Must be one of: day, week, month",
    });
  }

  const stats = await statsService.getActivityStats(period);

  res.json({
    success: true,
    data: stats,
  });
});
