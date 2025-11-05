import express from "express";
import { logBotEvent, getRecentLogs, clearOldLogs } from "../controllers/logsController.js";

const router = express.Router();

/**
 * POST /api/logs/event
 * Log a bot event (called by the bot process)
 * No auth required - internal service-to-service call
 */
router.post("/event", logBotEvent);

/**
 * GET /api/logs
 * Get recent bot logs
 * Query params: type, severity, limit, offset
 */
router.get("/", getRecentLogs);

/**
 * DELETE /api/logs/old
 * Clear old logs (older than 7 days)
 */
router.delete("/old", clearOldLogs);

export default router;
