// src/models/Report.js
import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    reporterId: { type: String, required: true, index: true }, // User who submitted the report
    reportedUserId: { type: String, required: true, index: true }, // User being reported
    reportedAlias: { type: String, required: true }, // Alias at time of report

    // Message context
    messageId: { type: Number, required: true }, // Original message ID from reported user
    messagePreview: { type: String, default: "" }, // First 200 chars of message content
    messageType: {
      type: String,
      enum: [
        "text",
        "photo",
        "video",
        "document",
        "audio",
        "voice",
        "animation",
        "sticker",
        "other",
      ],
      default: "text",
    },

    // Report details
    reason: { type: String, required: true }, // Why it was reported
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },

    // Resolution details
    resolvedBy: { type: String, default: null }, // userId of mod/admin who resolved
    resolvedAt: { type: Date, default: null },
    resolutionAction: {
      type: String,
      enum: ["none", "warned", "muted", "banned", "kicked", "media_restricted", null],
      default: null,
    },
    resolutionNotes: { type: String, default: "" }, // Optional notes from resolver
  },
  { timestamps: true }
);

// Indexes for common queries
ReportSchema.index({ status: 1, createdAt: -1 }); // List pending reports by newest
ReportSchema.index({ reportedUserId: 1, createdAt: -1 }); // Reports against specific user

// Virtual for checking if report is pending
ReportSchema.virtual("isPending").get(function () {
  return this.status === "pending";
});

const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);
export default Report;
