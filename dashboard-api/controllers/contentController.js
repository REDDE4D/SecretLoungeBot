// dashboard-api/controllers/contentController.js

import * as contentService from "../services/contentService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { z } from "zod";

// Filters
export const getFilters = asyncHandler(async (req, res) => {
  const filters = await contentService.getFilters();
  res.json({ success: true, data: { filters } });
});

export const createFilter = asyncHandler(async (req, res) => {
  const schema = z.object({
    pattern: z.string(),
    isRegex: z.boolean().optional(),
    action: z.enum(["block", "notify"]).optional(),
    notes: z.string().optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const filter = await contentService.createFilter(
    validation.data,
    req.user.id
  );
  res.json({ success: true, message: "Filter created", data: filter });
});

export const updateFilter = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const filter = await contentService.updateFilter(id, req.body, req.user.id);
  res.json({ success: true, message: "Filter updated", data: filter });
});

export const deleteFilter = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await contentService.deleteFilter(id, req.user.id);
  res.json({ success: true, message: "Filter deleted" });
});

// Invites
export const getInvites = asyncHandler(async (req, res) => {
  const invites = await contentService.getInvites();
  res.json({ success: true, data: { invites } });
});

export const createInvite = asyncHandler(async (req, res) => {
  const schema = z.object({
    maxUses: z.number().min(1).optional(),
    expiresAt: z.string().optional(),
    notes: z.string().optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const invite = await contentService.createInvite(
    validation.data,
    req.user.id
  );
  res.json({ success: true, message: "Invite created", data: invite });
});

export const updateInvite = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { active } = req.body;

  if (typeof active !== "boolean") {
    return res.status(400).json({
      success: false,
      error: "active field must be a boolean",
    });
  }

  const invite = await contentService.updateInvite(code, active, req.user.id);
  res.json({ success: true, message: "Invite updated", data: invite });
});

export const deleteInvite = asyncHandler(async (req, res) => {
  const { code } = req.params;
  await contentService.deleteInvite(code, req.user.id);
  res.json({ success: true, message: "Invite deleted" });
});

// Pins
export const getPins = asyncHandler(async (req, res) => {
  const pins = await contentService.getPins();
  res.json({ success: true, data: { pins } });
});

export const createPin = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      error: "message field is required",
    });
  }

  const pin = await contentService.createPin(
    message,
    req.user.id,
    req.user.alias || "Unknown"
  );
  res.json({ success: true, message: "Pin created", data: pin });
});

export const deletePin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await contentService.deletePin(parseInt(id), req.user.id);
  res.json({ success: true, message: "Pin deleted" });
});

// Scheduled Announcements
export const getScheduled = asyncHandler(async (req, res) => {
  const announcements = await contentService.getScheduledAnnouncements();
  res.json({ success: true, data: announcements });
});

export const createScheduled = asyncHandler(async (req, res) => {
  const schema = z.object({
    message: z.string(),
    scheduledFor: z.string(),
    target: z.enum(["all", "lobby"]).optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: validation.error.errors,
    });
  }

  const announcement = await contentService.createScheduledAnnouncement(
    validation.data,
    req.user.id
  );
  res.json({
    success: true,
    message: "Scheduled announcement created",
    data: announcement,
  });
});

export const deleteScheduled = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await contentService.deleteScheduledAnnouncement(id, req.user.id);
  res.json({ success: true, message: "Scheduled announcement deleted" });
});
