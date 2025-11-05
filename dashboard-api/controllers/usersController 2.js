// dashboard-api/controllers/usersController.js

import * as userService from "../services/userService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { z } from "zod";

/**
 * GET /api/users
 * Get paginated list of users with filters
 */
export const getUsers = asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50,
    search: req.query.search || "",
    role: req.query.role || null,
    inLobby: req.query.inLobby || null,
    status: req.query.status || null,
    sortBy: req.query.sortBy || "alias",
    sortOrder: req.query.sortOrder || "asc",
  };

  // Validate sortBy
  const validSortFields = ["alias", "joinDate", "totalMessages"];
  if (!validSortFields.includes(options.sortBy)) {
    return res.status(400).json({
      success: false,
      error: "Invalid sortBy field",
    });
  }

  // Validate sortOrder
  if (!["asc", "desc"].includes(options.sortOrder)) {
    return res.status(400).json({
      success: false,
      error: "Invalid sortOrder. Must be asc or desc",
    });
  }

  // Validate status
  if (options.status && !["online", "idle", "offline"].includes(options.status)) {
    return res.status(400).json({
      success: false,
      error: "Invalid status. Must be one of: online, idle, offline",
    });
  }

  const result = await userService.getUsers(options);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/users/:id
 * Get detailed user information
 */
export const getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await userService.getUserDetails(id);

  res.json({
    success: true,
    data: user,
  });
});

/**
 * PUT /api/users/:id/role
 * Update user role
 */
export const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Validate role
  const validRoles = ["admin", "mod", "whitelist", null];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      error: "Invalid role. Must be one of: admin, mod, whitelist, or null",
    });
  }

  const result = await userService.updateUserRole(id, role, req.user.userId);

  res.json({
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

/**
 * POST /api/users/:id/ban
 * Ban a user
 */
export const banUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    duration: z.number().nullable().optional(),
    reason: z.string().optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const { duration, reason } = validation.data;

  const result = await userService.banUser(
    id,
    duration,
    reason,
    req.user.userId
  );

  res.json({
    success: true,
    message: "User banned successfully",
    data: result,
  });
});

/**
 * POST /api/users/:id/mute
 * Mute a user
 */
export const muteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    duration: z.number().nullable().optional(),
    reason: z.string().optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const { duration, reason } = validation.data;

  const result = await userService.muteUser(
    id,
    duration,
    reason,
    req.user.userId
  );

  res.json({
    success: true,
    message: "User muted successfully",
    data: result,
  });
});

/**
 * POST /api/users/:id/kick
 * Kick a user from lobby
 */
export const kickUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const result = await userService.kickUser(id, reason, req.user.userId);

  res.json({
    success: true,
    message: "User kicked successfully",
    data: result,
  });
});

/**
 * DELETE /api/users/:id/restrictions
 * Remove all restrictions from a user
 */
export const removeRestrictions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await userService.removeRestrictions(id, req.user.userId);

  res.json({
    success: true,
    message: "Restrictions removed successfully",
    data: result,
  });
});

/**
 * PUT /api/users/:id/media-restriction
 * Toggle media restriction for a user
 */
export const toggleMediaRestriction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { restricted } = req.body;

  if (typeof restricted !== "boolean") {
    return res.status(400).json({
      success: false,
      error: "restricted field must be a boolean",
    });
  }

  const result = await userService.toggleMediaRestriction(
    id,
    restricted,
    req.user.userId
  );

  res.json({
    success: true,
    message: `Media ${restricted ? "restricted" : "unrestricted"} successfully`,
    data: result,
  });
});

/**
 * POST /api/users/:id/warn
 * Issue a warning to a user
 */
export const warnUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const result = await userService.warnUser(id, reason, req.user.userId);

  res.json({
    success: true,
    message: "Warning issued successfully",
    data: result,
  });
});
