// dashboard-api/services/contentService.js

import mongoose from "mongoose";
import crypto from "crypto";

// Helper to get models at runtime
const getFilter = () => mongoose.model("Filter");
const getInvite = () => mongoose.model("Invite");
const getPinnedMessage = () => mongoose.model("PinnedMessage");
const getScheduledAnnouncement = () => mongoose.model("ScheduledAnnouncement");
const getAuditLog = () => mongoose.model("AuditLog");

/**
 * Get all content filters
 * @returns {Promise<Array>} Filters
 */
export async function getFilters() {
  const Filter = getFilter();

  const filters = await getFilter().find().sort({ createdAt: -1 }).lean();
  return filters;
}

/**
 * Create a new content filter
 * @param {Object} filterData - Filter data
 * @param {string} moderatorId - ID of moderator creating the filter
 * @returns {Promise<Object>} Created filter
 */
export async function createFilter(filterData, moderatorId) {
  const filter = await getFilter().create({
    ...filterData,
    createdBy: moderatorId,
  });

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "filter_create",
    details: `Filter created: ${filterData.pattern}`,
    metadata: { filterId: filter._id.toString() },
  });

  return filter;
}

/**
 * Update a content filter
 * @param {string} filterId - Filter ID
 * @param {Object} updates - Updates to apply
 * @param {string} moderatorId - ID of moderator updating the filter
 * @returns {Promise<Object>} Updated filter
 */
export async function updateFilter(filterId, updates, moderatorId) {
  const filter = await getFilter().findByIdAndUpdate(filterId, updates, {
    new: true,
  });

  if (!filter) {
    throw new Error("Filter not found");
  }

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "filter_update",
    details: `Filter updated: ${filter.pattern}`,
    metadata: { filterId: filter._id.toString() },
  });

  return filter;
}

/**
 * Delete a content filter
 * @param {string} filterId - Filter ID
 * @param {string} moderatorId - ID of moderator deleting the filter
 * @returns {Promise<boolean>} Success
 */
export async function deleteFilter(filterId, moderatorId) {
  const filter = await getFilter().findByIdAndDelete(filterId);

  if (!filter) {
    throw new Error("Filter not found");
  }

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "filter_delete",
    details: `Filter deleted: ${filter.pattern}`,
    metadata: { filterId: filter._id.toString() },
  });

  return true;
}

/**
 * Get all invites
 * @returns {Promise<Array>} Invites with computed status
 */
export async function getInvites() {
  const invites = await getInvite().find().sort({ createdAt: -1 }).lean();

  // Add computed status to each invite
  const now = Date.now();
  return invites.map((invite) => ({
    ...invite,
    isExpired: invite.expiresAt && invite.expiresAt.getTime() < now,
    isExhausted: invite.usedCount >= invite.maxUses,
  }));
}

/**
 * Create a new invite
 * @param {Object} inviteData - Invite data
 * @param {string} moderatorId - ID of moderator creating the invite
 * @returns {Promise<Object>} Created invite
 */
export async function createInvite(inviteData, moderatorId) {
  // Generate unique code
  const code = crypto.randomBytes(6).toString("hex").toUpperCase();

  const invite = await getInvite().create({
    code,
    ...inviteData,
    createdBy: moderatorId,
  });

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "invite_create",
    details: `Invite created: ${code}`,
    metadata: { inviteId: invite._id.toString(), code },
  });

  return invite;
}

/**
 * Update an invite (activate/revoke)
 * @param {string} code - Invite code
 * @param {boolean} active - Active status
 * @param {string} moderatorId - ID of moderator updating the invite
 * @returns {Promise<Object>} Updated invite
 */
export async function updateInvite(code, active, moderatorId) {
  const invite = await getInvite().findOneAndUpdate(
    { code },
    { active },
    { new: true }
  );

  if (!invite) {
    throw new Error("Invite not found");
  }

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: active ? "invite_activate" : "invite_revoke",
    details: `Invite ${active ? "activated" : "revoked"}: ${code}`,
    metadata: { inviteId: invite._id.toString(), code },
  });

  return invite;
}

/**
 * Delete an invite
 * @param {string} code - Invite code
 * @param {string} moderatorId - ID of moderator deleting the invite
 * @returns {Promise<boolean>} Success
 */
export async function deleteInvite(code, moderatorId) {
  const invite = await getInvite().findOneAndDelete({ code });

  if (!invite) {
    throw new Error("Invite not found");
  }

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "invite_delete",
    details: `Invite deleted: ${code}`,
    metadata: { inviteId: invite._id.toString(), code },
  });

  return true;
}

/**
 * Get all pinned messages
 * @returns {Promise<Array>} Pinned messages
 */
export async function getPins() {
  const pins = await getPinnedMessage().getAllPins();
  return pins;
}

/**
 * Create a new pinned message (announcement)
 * @param {string} message - Pin message
 * @param {string} moderatorId - ID of moderator creating the pin
 * @param {string} moderatorAlias - Alias of moderator
 * @returns {Promise<Object>} Created pin
 */
export async function createPin(message, moderatorId, moderatorAlias) {
  const canAdd = await getPinnedMessage().canAddMore();
  if (!canAdd) {
    throw new Error("Maximum number of pins (5) reached");
  }

  const nextId = await getPinnedMessage().getNextId();

  const pin = await getPinnedMessage().create({
    _id: nextId,
    type: "announcement",
    message,
    pinnedBy: moderatorId,
    pinnedByAlias: moderatorAlias,
  });

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "pin_create",
    details: `Pin created: ${message.substring(0, 50)}...`,
    metadata: { pinId: pin._id },
  });

  return pin;
}

/**
 * Delete a pinned message
 * @param {number} pinId - Pin ID
 * @param {string} moderatorId - ID of moderator deleting the pin
 * @returns {Promise<boolean>} Success
 */
export async function deletePin(pinId, moderatorId) {
  const pin = await getPinnedMessage().findByIdAndDelete(pinId);

  if (!pin) {
    throw new Error("Pin not found");
  }

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "pin_delete",
    details: `Pin deleted (ID: ${pinId})`,
    metadata: { pinId },
  });

  return true;
}

/**
 * Get all scheduled announcements
 * @returns {Promise<Array>} Scheduled announcements
 */
export async function getScheduledAnnouncements() {
  const announcements = await getScheduledAnnouncement().find()
    .sort({ scheduledFor: 1 })
    .lean();
  return announcements;
}

/**
 * Create a new scheduled announcement
 * @param {Object} announcementData - Announcement data
 * @param {string} moderatorId - ID of moderator creating the announcement
 * @returns {Promise<Object>} Created announcement
 */
export async function createScheduledAnnouncement(
  announcementData,
  moderatorId
) {
  const announcement = await getScheduledAnnouncement().create({
    ...announcementData,
    createdBy: moderatorId,
  });

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "scheduled_announcement_create",
    details: `Scheduled announcement created`,
    metadata: { announcementId: announcement._id.toString() },
  });

  return announcement;
}

/**
 * Delete a scheduled announcement
 * @param {string} announcementId - Announcement ID
 * @param {string} moderatorId - ID of moderator deleting the announcement
 * @returns {Promise<boolean>} Success
 */
export async function deleteScheduledAnnouncement(
  announcementId,
  moderatorId
) {
  const announcement = await getScheduledAnnouncement().findByIdAndDelete(
    announcementId
  );

  if (!announcement) {
    throw new Error("Scheduled announcement not found");
  }

  // Log to audit log
  await getAuditLog().create({
    moderatorId,
    category: "content",
    action: "scheduled_announcement_delete",
    details: `Scheduled announcement deleted`,
    metadata: { announcementId: announcement._id.toString() },
  });

  return true;
}
