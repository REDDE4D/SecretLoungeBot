import express from "express";
import * as socketService from "../services/socketService.js";

const router = express.Router();

/**
 * Internal API endpoints for bot to trigger socket emissions
 * These endpoints are called by the bot (not the dashboard frontend)
 */

// Emit new report notification
router.post("/emit/report", async (req, res) => {
  try {
    const report = req.body;

    await socketService.emitNewReport({
      _id: { toString: () => report.reportId },
      reporterId: report.reporterId,
      reportedUserId: report.reportedUserId,
      reportedAlias: report.reportedAlias,
      messagePreview: report.messagePreview,
      messageType: report.messageType,
      reason: report.reason,
      createdAt: report.createdAt,
    });

    // Also update stats to reflect new pending report
    await socketService.emitStatsUpdate();

    res.json({ success: true });
  } catch (error) {
    console.error("Error emitting report notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emit moderation action
router.post("/emit/moderation", async (req, res) => {
  try {
    await socketService.emitModerationAction(req.body);
    await socketService.emitStatsUpdate();
    res.json({ success: true });
  } catch (error) {
    console.error("Error emitting moderation action:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emit spam alert
router.post("/emit/spam", async (req, res) => {
  try {
    await socketService.emitSpamAlert(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error("Error emitting spam alert:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emit user joined
router.post("/emit/user-joined", async (req, res) => {
  try {
    await socketService.emitUserJoined(req.body);
    await socketService.emitStatsUpdate();
    res.json({ success: true });
  } catch (error) {
    console.error("Error emitting user joined:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emit user left
router.post("/emit/user-left", async (req, res) => {
  try {
    await socketService.emitUserLeft(req.body);
    await socketService.emitStatsUpdate();
    res.json({ success: true });
  } catch (error) {
    console.error("Error emitting user left:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emit settings change
router.post("/emit/settings-change", async (req, res) => {
  try {
    await socketService.emitSettingsChange(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error("Error emitting settings change:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emit audit log entry
router.post("/emit/audit-log", async (req, res) => {
  try {
    await socketService.emitAuditLog(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error("Error emitting audit log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emit lobby message (for live chat)
router.post("/emit/lobby-message", async (req, res) => {
  try {
    await socketService.emitLobbyMessage(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error("Error emitting lobby message:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
