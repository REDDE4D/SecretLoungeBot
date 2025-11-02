// src/commands/user/report.js
import Report from "../../models/Report.js";
import { User } from "../../models/User.js";
import { resolveOriginalFromReply } from "../../relay/quoteMap.js";
import { getAlias } from "../../users/index.js";

export const meta = {
  commands: ["report"],
  category: "user",
  roleRequired: null,
  description: "Report a message to moderators",
  usage: "/report [reason] (reply to message)",
  showInMenu: true,
};

export function register(bot) {
  bot.command("report", async (ctx) => {
    const reporterId = String(ctx.from.id);

    // Must be a reply
    if (!ctx.message?.reply_to_message) {
      return ctx.reply(
        "❌ You must reply to a message to report it.\n\nUsage: Reply to a message and type:\n/report [reason]"
      );
    }

    // Parse reason from command
    const commandText = ctx.message.text;
    const parts = commandText.split(" ");
    parts.shift(); // Remove "/report"
    const reason = parts.join(" ").trim() || "No reason provided";

    // Resolve the original message
    const replyId = ctx.message.reply_to_message.message_id;
    const original = await resolveOriginalFromReply(reporterId, replyId);

    if (!original || !original.originalUserId) {
      return ctx.reply(
        "❌ Could not identify the original sender of this message. You can only report relayed lobby messages."
      );
    }

    const reportedUserId = String(original.originalUserId);

    // Prevent self-reporting
    if (reportedUserId === reporterId) {
      return ctx.reply("❌ You cannot report your own messages.");
    }

    // Get reported user's alias
    const reportedAlias = await getAlias(reportedUserId);

    // Determine message type and preview
    const replyMsg = ctx.message.reply_to_message;
    let messageType = "text";
    let messagePreview = "";

    if (replyMsg.photo) {
      messageType = "photo";
      messagePreview = replyMsg.caption || "[Photo]";
    } else if (replyMsg.video) {
      messageType = "video";
      messagePreview = replyMsg.caption || "[Video]";
    } else if (replyMsg.document) {
      messageType = "document";
      messagePreview = replyMsg.caption || `[Document: ${replyMsg.document.file_name || "file"}]`;
    } else if (replyMsg.audio) {
      messageType = "audio";
      messagePreview = replyMsg.caption || "[Audio]";
    } else if (replyMsg.voice) {
      messageType = "voice";
      messagePreview = "[Voice message]";
    } else if (replyMsg.animation) {
      messageType = "animation";
      messagePreview = replyMsg.caption || "[GIF]";
    } else if (replyMsg.sticker) {
      messageType = "sticker";
      messagePreview = `[Sticker: ${replyMsg.sticker.emoji || ""}]`;
    } else if (replyMsg.text) {
      messageType = "text";
      messagePreview = replyMsg.text.substring(0, 200);
    } else {
      messageType = "other";
      messagePreview = "[Unknown message type]";
    }

    // Create report
    const report = await Report.create({
      reporterId,
      reportedUserId,
      reportedAlias,
      messageId: original.originalMsgId,
      messagePreview,
      messageType,
      reason,
      status: "pending",
    });

    // Notify user
    await ctx.reply(
      `✅ Report submitted (ID: ${report._id})\n\n` +
        `Reported user: ${reportedAlias}\n` +
        `Reason: ${reason}\n\n` +
        `Moderators have been notified and will review your report.`
    );

    // Notify all mods and admins
    await notifyModerators(ctx.telegram, report, reportedAlias);
  });
}

/**
 * Notify all users with mod or admin role about a new report
 */
async function notifyModerators(telegram, report, reportedAlias) {
  try {
    // Find all mods and admins
    const moderators = await User.find({
      role: { $in: ["mod", "admin"] },
    }).lean();

    if (moderators.length === 0) return;

    const reporterAlias = await getAlias(report.reporterId);

    const notificationMessage =
      `🚨 NEW REPORT (ID: ${report._id})\n\n` +
      `Reporter: ${reporterAlias}\n` +
      `Reported user: ${reportedAlias}\n` +
      `Message type: ${report.messageType}\n` +
      `Reason: ${report.reason}\n\n` +
      `Preview: ${report.messagePreview}\n\n` +
      `Use /viewreport ${report._id} to see full details\n` +
      `Use /resolve ${report._id} to resolve this report`;

    // Send notification to each moderator
    for (const mod of moderators) {
      try {
        await telegram.sendMessage(mod._id, notificationMessage);
      } catch (err) {
        console.error(`Failed to notify moderator ${mod._id}:`, err.message);
        // Continue notifying others even if one fails
      }
    }
  } catch (err) {
    console.error("Error notifying moderators:", err);
  }
}
