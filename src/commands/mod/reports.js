// src/commands/mod/reports.js
import Report from "../../models/Report.js";
import { getAlias } from "../../users/index.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { paginate, buildPaginationKeyboard, getPaginationFooter, parsePageFromCallback } from "../../utils/pagination.js";
import { formatTimeAgo } from "../../utils/timeFormat.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["reports", "viewreport", "resolve"],
  category: "mod",
  roleRequired: ["mod", "admin"],
  description: "Manage user reports",
  usage: "/reports, /viewreport <id>, /resolve <id> [action] [notes]",
  showInMenu: false,
};

/**
 * Show paginated reports list
 */
async function showReportsPage(ctx, page = 1, isEdit = false) {
  try {
    const pendingReports = await Report.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .lean();

    if (pendingReports.length === 0) {
      const message = "✅ No pending reports.";
      if (isEdit) {
        await ctx.editMessageText(message);
      } else {
        await ctx.reply(message);
      }
      return;
    }

    // Paginate reports
    const paginationResult = paginate(pendingReports, page, 10);
    const { items, currentPage, totalPages, totalItems } = paginationResult;

    let message = `📋 PENDING REPORTS\n\n`;

    for (const report of items) {
      const reporterAlias = await getAlias(report.reporterId);
      const timeAgo = formatTimeAgo(report.createdAt);

      message +=
        `🆔 ${report._id}\n` +
        `👤 Reported: ${report.reportedAlias}\n` +
        `📝 By: ${reporterAlias}\n` +
        `⏰ ${timeAgo}\n` +
        `💬 "${report.reason.substring(0, 50)}${report.reason.length > 50 ? "..." : ""}"\n\n`;
    }

    message += `\nUse /viewreport <id> to see full details`;
    message += getPaginationFooter(currentPage, totalPages, totalItems);

    const keyboard = buildPaginationKeyboard("reports_page", currentPage, totalPages);

    const options = {
      reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
    };

    if (isEdit) {
      await ctx.editMessageText(message, options);
    } else {
      await ctx.reply(message, options);
    }
  } catch (err) {
    console.error("Error listing reports:", err);
    const errorMsg = "❌ Error listing reports.";
    if (isEdit) {
      await ctx.editMessageText(errorMsg);
    } else {
      await ctx.reply(errorMsg);
    }
  }
}

export function register(bot) {
  // List all pending reports with pagination
  bot.command("reports", async (ctx) => {
    await showReportsPage(ctx, 1);
  });

  // Handle pagination callbacks
  bot.action(/^reports_page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await showReportsPage(ctx, page, true);
    await ctx.answerCbQuery();
  });

  // View specific report details
  bot.command("viewreport", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const reportId = args[0];

      if (!reportId) {
        return ctx.reply("Usage: /viewreport <report_id>");
      }

      const report = await Report.findById(reportId).lean();

      if (!report) {
        return ctx.reply("❌ Report not found.");
      }

      const reporterAlias = await getAlias(report.reporterId);
      const timeAgo = formatTimeAgo(report.createdAt);

      let message =
        `📋 REPORT DETAILS\n\n` +
        `🆔 ID: ${report._id}\n` +
        `Status: ${getStatusEmoji(report.status)} ${report.status.toUpperCase()}\n\n` +
        `👤 Reported user: ${report.reportedAlias} (ID: ${report.reportedUserId})\n` +
        `📝 Reporter: ${reporterAlias} (ID: ${report.reporterId})\n` +
        `⏰ Reported: ${timeAgo}\n\n` +
        `📨 Message type: ${report.messageType}\n` +
        `💬 Message preview:\n"${report.messagePreview}"\n\n` +
        `📌 Reason:\n${report.reason}\n`;

      if (report.status === "resolved" || report.status === "dismissed") {
        const resolverAlias = report.resolvedBy ? await getAlias(report.resolvedBy) : "Unknown";
        message +=
          `\n✅ RESOLUTION\n` +
          `Resolved by: ${resolverAlias}\n` +
          `Action: ${report.resolutionAction || "none"}\n`;

        if (report.resolutionNotes) {
          message += `Notes: ${report.resolutionNotes}\n`;
        }

        if (report.resolvedAt) {
          message += `Resolved: ${formatTimeAgo(report.resolvedAt)}\n`;
        }
      } else {
        message +=
          `\n💡 To resolve this report:\n` +
          `/resolve ${report._id} <action> [notes]\n\n` +
          `Actions: none, warned, muted, banned, kicked, media_restricted`;
      }

      await ctx.reply(message);
    } catch (err) {
      console.error("Error viewing report:", err);
      await ctx.reply("❌ Error viewing report.");
    }
  });

  // Resolve a report
  bot.command("resolve", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ");
      args.shift(); // Remove command

      const reportId = args[0];
      const action = args[1]?.toLowerCase() || "none";
      const notes = args.slice(2).join(" ") || "";

      if (!reportId) {
        return ctx.reply(
          "Usage: /resolve <report_id> <action> [notes]\n\n" +
            "Actions: none, warned, muted, banned, kicked, media_restricted, dismissed"
        );
      }

      const validActions = ["none", "warned", "muted", "banned", "kicked", "media_restricted"];
      const validStatuses = [...validActions, "dismissed"];

      if (!validStatuses.includes(action)) {
        return ctx.reply(
          `❌ Invalid action: ${action}\n\n` +
            `Valid actions: ${validStatuses.join(", ")}`
        );
      }

      const report = await Report.findById(reportId);

      if (!report) {
        return ctx.reply("❌ Report not found.");
      }

      if (report.status !== "pending") {
        return ctx.reply(
          `❌ This report has already been ${report.status}.\n\n` +
            `Use /viewreport ${reportId} to see details.`
        );
      }

      // Update report
      report.status = action === "dismissed" ? "dismissed" : "resolved";
      report.resolvedBy = String(ctx.from.id);
      report.resolvedAt = new Date();
      report.resolutionAction = action === "dismissed" ? null : action;
      report.resolutionNotes = notes;

      await report.save();

      logger.logModeration(
        action === "dismissed" ? "report_dismiss" : "report_resolve",
        ctx.from.id,
        report.reportedUserId,
        {
          reportId: String(report._id),
          action,
          notes,
        }
      );

      const resolverAlias = await getAlias(ctx.from.id);
      const reportedAlias = report.reportedAlias;

      let responseMessage =
        `✅ Report ${report._id} ${report.status}\n\n` +
        `Reported user: ${reportedAlias}\n` +
        `Action: ${action}\n` +
        `Resolved by: ${resolverAlias}\n`;

      if (notes) {
        responseMessage += `Notes: ${notes}\n`;
      }

      await ctx.reply(responseMessage);

      // Notify the reporter that their report was resolved
      try {
        const notificationMessage =
          `✅ Your report has been resolved\n\n` +
          `Report ID: ${report._id}\n` +
          `Reported user: ${reportedAlias}\n` +
          `Status: ${report.status}\n` +
          `Action taken: ${action}\n\n` +
          `Thank you for helping keep the lobby safe.`;

        await ctx.telegram.sendMessage(report.reporterId, notificationMessage);
      } catch (err) {
        console.error(`Failed to notify reporter ${report.reporterId}:`, err.message);
      }
    } catch (err) {
      console.error("Error resolving report:", err);
      await ctx.reply("❌ Error resolving report.");
    }
  });
}


/**
 * Get emoji for report status
 */
function getStatusEmoji(status) {
  const emojis = {
    pending: "⏳",
    resolved: "✅",
    dismissed: "🚫",
  };
  return emojis[status] || "❓";
}
