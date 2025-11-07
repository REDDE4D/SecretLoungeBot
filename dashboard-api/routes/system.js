// dashboard-api/routes/system.js

import express from "express";
import * as systemController from "../controllers/systemController.js";
import { authenticate } from "../middleware/auth.js";
import { requireOwner } from "../middleware/rbac.js";

const router = express.Router();

// All system routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/system/restart
 * @desc    Restart the bot process using PM2
 * @access  Private (owner only)
 */
router.post("/restart", requireOwner, systemController.restartBot);

/**
 * @route   GET /api/system/health
 * @desc    Get system health and uptime information
 * @access  Private (any authenticated user)
 */
router.get("/health", systemController.getSystemHealth);

export default router;
