import express from "express";
import authRoutes from "./auth.js";
import statsRoutes from "./stats.js";
import usersRoutes from "./users.js";
import settingsRoutes from "./settings.js";
import contentRoutes from "./content.js";
import moderationRoutes from "./moderation.js";
import permissionsRoutes from "./permissions.js";
import exportRoutes from "./export.js";
import batchRoutes from "./batch.js";
import linksRoutes from "./links.js";
import logsRoutes from "./logs.js";
import systemRoutes from "./system.js";
import notificationsRoutes from "./notifications.js";
import internalRoutes from "./internal.js";

const router = express.Router();

/**
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Dashboard API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API version info
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SecretLounge-Bot Dashboard API",
    version: "2.1.0",
    phase: "Phase 7 - Advanced Features (In Progress)",
    endpoints: {
      health: "GET /api/health",
      auth: "POST /api/auth/*",
      stats: "GET /api/stats/*",
      users: "GET /api/users/*",
      settings: "GET /api/settings/*",
      content: "GET /api/content/*",
      moderation: "GET /api/moderation/*",
      permissions: "GET /api/permissions/*",
      export: "GET /api/export/*",
      batch: "POST /api/batch/*",
      links: "GET /api/links/*",
      logs: "POST /api/logs/*",
      system: "POST /api/system/*",
      notifications: "GET /api/notifications/*",
    },
  });
});

/**
 * Mount route modules
 */
router.use("/auth", authRoutes);
router.use("/stats", statsRoutes);
router.use("/users", usersRoutes);
router.use("/settings", settingsRoutes);
router.use("/content", contentRoutes);
router.use("/moderation", moderationRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/export", exportRoutes);
router.use("/batch", batchRoutes);
router.use("/links", linksRoutes);
router.use("/logs", logsRoutes);
router.use("/system", systemRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/internal", internalRoutes);

export default router;
