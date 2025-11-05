// dashboard-api/routes/content.js

import express from "express";
import * as contentController from "../controllers/contentController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermissions } from "../middleware/rbac.js";

const router = express.Router();

// All content routes require authentication
router.use(authenticate);

// Filters
router.get(
  "/filters",
  requirePermissions(["content.view_filters"]),
  contentController.getFilters
);

router.post(
  "/filters",
  requirePermissions(["content.manage_filters"]),
  contentController.createFilter
);

router.put(
  "/filters/:id",
  requirePermissions(["content.manage_filters"]),
  contentController.updateFilter
);

router.delete(
  "/filters/:id",
  requirePermissions(["content.manage_filters"]),
  contentController.deleteFilter
);

// Invites
router.get(
  "/invites",
  requirePermissions(["content.view_invites"]),
  contentController.getInvites
);

router.post(
  "/invites",
  requirePermissions(["content.manage_invites"]),
  contentController.createInvite
);

router.put(
  "/invites/:code",
  requirePermissions(["content.manage_invites"]),
  contentController.updateInvite
);

router.delete(
  "/invites/:code",
  requirePermissions(["content.manage_invites"]),
  contentController.deleteInvite
);

// Pins
router.get(
  "/pins",
  requirePermissions(["content.view_pins"]),
  contentController.getPins
);

router.post(
  "/pins",
  requirePermissions(["content.manage_pins"]),
  contentController.createPin
);

router.delete(
  "/pins/:id",
  requirePermissions(["content.manage_pins"]),
  contentController.deletePin
);

// Scheduled Announcements
router.get(
  "/scheduled",
  requirePermissions(["content.manage_scheduled"]),
  contentController.getScheduled
);

router.post(
  "/scheduled",
  requirePermissions(["content.manage_scheduled"]),
  contentController.createScheduled
);

router.delete(
  "/scheduled/:id",
  requirePermissions(["content.manage_scheduled"]),
  contentController.deleteScheduled
);

export default router;
