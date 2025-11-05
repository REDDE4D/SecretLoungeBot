// dashboard-api/controllers/batchController.js

import { User } from "../../src/models/User.js";
import AuditLog from "../../src/models/AuditLog.js";
import { parseDuration } from "../utils/duration.js";
import { emitModerationAction } from "../services/socketService.js";

/**
 * Batch ban users
 *
 * @route   POST /api/batch/ban
 * @body    { userIds: string[], duration: string|null, reason: string }
 * @returns {object} Result with success count
 */
export async function batchBan(req, res) {
  try {
    const { userIds, duration, reason = "" } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 users can be banned at once",
      });
    }

    // Calculate ban expiry
    const bannedUntil = duration ? parseDuration(duration) : null;

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { bannedUntil, inLobby: false } }
    );

    // Create audit log
    await AuditLog.create({
      action: "bulk_ban",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      details: {
        userIds,
        count: result.modifiedCount,
        duration,
        reason,
      },
      reason,
    });

    // Emit WebSocket event
    emitModerationAction({
      action: "bulk_ban",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      targetIds: userIds,
      count: result.modifiedCount,
      reason,
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} users banned successfully`,
      data: {
        affected: result.modifiedCount,
        bannedUntil,
      },
    });
  } catch (error) {
    console.error("Batch ban error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to ban users",
    });
  }
}

/**
 * Batch unban users
 *
 * @route   POST /api/batch/unban
 * @body    { userIds: string[] }
 * @returns {object} Result with success count
 */
export async function batchUnban(req, res) {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 users can be unbanned at once",
      });
    }

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { bannedUntil: null } }
    );

    // Create audit log
    await AuditLog.create({
      action: "bulk_unban",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      details: {
        userIds,
        count: result.modifiedCount,
      },
    });

    // Emit WebSocket event
    emitModerationAction({
      action: "bulk_unban",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      targetIds: userIds,
      count: result.modifiedCount,
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} users unbanned successfully`,
      data: {
        affected: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Batch unban error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unban users",
    });
  }
}

/**
 * Batch mute users
 *
 * @route   POST /api/batch/mute
 * @body    { userIds: string[], duration: string, reason: string }
 * @returns {object} Result with success count
 */
export async function batchMute(req, res) {
  try {
    const { userIds, duration, reason = "" } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 users can be muted at once",
      });
    }

    if (!duration) {
      return res.status(400).json({
        success: false,
        message: "Duration is required for mute",
      });
    }

    // Calculate mute expiry
    const mutedUntil = parseDuration(duration);

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { mutedUntil } }
    );

    // Create audit log
    await AuditLog.create({
      action: "bulk_mute",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      details: {
        userIds,
        count: result.modifiedCount,
        duration,
        reason,
      },
      reason,
    });

    // Emit WebSocket event
    emitModerationAction({
      action: "bulk_mute",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      targetIds: userIds,
      count: result.modifiedCount,
      duration,
      reason,
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} users muted successfully`,
      data: {
        affected: result.modifiedCount,
        mutedUntil,
      },
    });
  } catch (error) {
    console.error("Batch mute error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mute users",
    });
  }
}

/**
 * Batch unmute users
 *
 * @route   POST /api/batch/unmute
 * @body    { userIds: string[] }
 * @returns {object} Result with success count
 */
export async function batchUnmute(req, res) {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 users can be unmuted at once",
      });
    }

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { mutedUntil: null } }
    );

    // Create audit log
    await AuditLog.create({
      action: "bulk_unmute",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      details: {
        userIds,
        count: result.modifiedCount,
      },
    });

    // Emit WebSocket event
    emitModerationAction({
      action: "bulk_unmute",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      targetIds: userIds,
      count: result.modifiedCount,
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} users unmuted successfully`,
      data: {
        affected: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Batch unmute error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unmute users",
    });
  }
}

/**
 * Batch kick users from lobby
 *
 * @route   POST /api/batch/kick
 * @body    { userIds: string[], reason: string }
 * @returns {object} Result with success count
 */
export async function batchKick(req, res) {
  try {
    const { userIds, reason = "" } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 users can be kicked at once",
      });
    }

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { inLobby: false } }
    );

    // Create audit log
    await AuditLog.create({
      action: "bulk_kick",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      details: {
        userIds,
        count: result.modifiedCount,
        reason,
      },
      reason,
    });

    // Emit WebSocket event
    emitModerationAction({
      action: "bulk_kick",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      targetIds: userIds,
      count: result.modifiedCount,
      reason,
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} users kicked successfully`,
      data: {
        affected: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Batch kick error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to kick users",
    });
  }
}

/**
 * Batch assign role to users
 *
 * @route   POST /api/batch/assign-role
 * @body    { userIds: string[], role: string }
 * @returns {object} Result with success count
 */
export async function batchAssignRole(req, res) {
  try {
    const { userIds, role } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 users can be updated at once",
      });
    }

    const validRoles = ["admin", "mod", "whitelist", null];
    if (role !== null && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be admin, mod, whitelist, or null",
      });
    }

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { role } }
    );

    // Create audit log
    await AuditLog.create({
      action: role ? "promote" : "demote",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      details: {
        userIds,
        count: result.modifiedCount,
        role,
      },
    });

    // Emit WebSocket event
    emitModerationAction({
      action: "batch_role_assign",
      moderatorId: req.user.id,
      moderatorAlias: req.user.alias || "Admin",
      targetIds: userIds,
      count: result.modifiedCount,
      role,
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} users updated successfully`,
      data: {
        affected: result.modifiedCount,
        role,
      },
    });
  } catch (error) {
    console.error("Batch role assign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign role",
    });
  }
}
