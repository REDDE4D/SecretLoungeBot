// dashboard-api/controllers/systemController.js

import { asyncHandler } from "../middleware/errorHandler.js";
import * as systemService from "../services/systemService.js";

/**
 * POST /api/system/restart
 * Restart the bot process using PM2
 */
export const restartBot = asyncHandler(async (req, res) => {
  // Only allow owner role
  if (req.user.role !== "owner") {
    return res.status(403).json({
      success: false,
      error: "Only the bot owner can restart the bot",
    });
  }

  // Initiate restart
  const result = await systemService.restartBot(req.user.id);

  res.json({
    success: true,
    message: "Bot restart initiated",
    data: result,
  });
});

/**
 * GET /api/system/health
 * Get system health and uptime information
 */
export const getSystemHealth = asyncHandler(async (req, res) => {
  const health = await systemService.getSystemHealth();

  res.json({
    success: true,
    data: health,
  });
});
