import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    // Action information
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        // User restrictions
        "ban",
        "unban",
        "bulk_ban",
        "bulk_unban",
        "mute",
        "unmute",
        "bulk_mute",
        "bulk_unmute",
        "kick",
        "bulk_kick",
        "restrict_media",
        "unrestrict_media",

        // Role management
        "promote",
        "demote",
        "whitelist_add",

        // Warning system
        "warn",
        "clear_warnings",
        "auto_ban",

        // Temporary actions
        "cooldown_apply",

        // Content management
        "filter_add",
        "filter_remove",
        "filter_toggle",
        "slowmode_enable",
        "slowmode_disable",
        "maintenance_enable",
        "maintenance_disable",
        "welcome_enable",
        "welcome_disable",
        "welcome_update",
        "rule_add",
        "rule_remove",
        "rule_clear",
        "pin_create",
        "pin_delete",

        // Invite system
        "invite_mode_enable",
        "invite_mode_disable",
        "invite_create",
        "invite_revoke",
        "invite_activate",
        "invite_delete",

        // Reports
        "report_resolve",
        "report_dismiss",

        // Scheduled announcements
        "schedule_create_once",
        "schedule_create_recurring",
        "schedule_pause",
        "schedule_resume",
        "schedule_delete",
        "schedule_send",

        // Backup/Export
        "export_users",
        "export_messages",
        "export_full",
        "export_user",
      ],
    },

    // Who performed the action
    moderatorId: { type: String, required: true, index: true },
    moderatorAlias: { type: String, default: "" }, // Alias at time of action

    // Who was affected (null for global actions like slowmode)
    targetUserId: { type: String, default: null, index: true },
    targetAlias: { type: String, default: "" }, // Alias at time of action

    // Action details (flexible JSON object)
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Examples:
      // { duration: "7d", count: 3, userIds: ["123", "456"] } - for bulk ban
      // { role: "mod" } - for promote
      // { pattern: "spam", filterId: "..." } - for filter_add
      // { seconds: 30 } - for slowmode
      // { reason: "harassment" } - for various actions
    },

    // Optional reason provided by moderator
    reason: { type: String, default: "" },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Compound indexes for common queries
AuditLogSchema.index({ action: 1, createdAt: -1 }); // Filter by action type
AuditLogSchema.index({ targetUserId: 1, createdAt: -1 }); // User history
AuditLogSchema.index({ moderatorId: 1, createdAt: -1 }); // Moderator actions
AuditLogSchema.index({ createdAt: -1 }); // Recent actions (default view)

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
