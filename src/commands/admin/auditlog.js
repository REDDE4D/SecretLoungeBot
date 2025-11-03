// src/commands/admin/auditlog.js
import AuditLog from "../../models/AuditLog.js";
import { findUserIdByAlias } from "../../users/index.js";
import { escapeHTML } from "../../utils/sanitize.js";
import { paginate, buildPaginationKeyboard, getPaginationFooter } from "../../utils/pagination.js";
import { formatTimeAgo } from "../../utils/timeFormat.js";

export const meta = {
  commands: ["auditlog", "audit"],
  category: "admin",
  roleRequired: ["admin", "mod"],
  description: "View moderation action history",
  usage: "/auditlog [page], /auditlog <action>, /auditlog user <alias>, /auditlog mod <alias>",
  showInMenu: false,
};

/**
 * Format action name for display
 */
function formatActionName(action) {
  const actionMap = {
    ban: "Ban",
    unban: "Unban",
    bulk_ban: "Bulk Ban",
    bulk_unban: "Bulk Unban",
    mute: "Mute",
    unmute: "Unmute",
    bulk_mute: "Bulk Mute",
    bulk_unmute: "Bulk Unmute",
    kick: "Kick",
    bulk_kick: "Bulk Kick",
    restrict_media: "Restrict Media",
    unrestrict_media: "Unrestrict Media",
    promote: "Promote",
    demote: "Demote",
    whitelist_add: "Whitelist Add",
    warn: "Warn",
    clear_warnings: "Clear Warnings",
    auto_ban: "Auto-Ban",
    cooldown_apply: "Cooldown",
    filter_add: "Filter Add",
    filter_remove: "Filter Remove",
    filter_toggle: "Filter Toggle",
    slowmode_enable: "Slowmode Enable",
    slowmode_disable: "Slowmode Disable",
    rule_add: "Rule Add",
    rule_remove: "Rule Remove",
    rule_clear: "Rule Clear",
    invite_mode_enable: "Invite Mode Enable",
    invite_mode_disable: "Invite Mode Disable",
    invite_create: "Invite Create",
    invite_revoke: "Invite Revoke",
    invite_activate: "Invite Activate",
    invite_delete: "Invite Delete",
    report_resolve: "Report Resolve",
    report_dismiss: "Report Dismiss",
  };
  return actionMap[action] || action;
}

/**
 * Format audit log entry for display
 */
function formatAuditEntry(entry) {
  const timeAgo = formatTimeAgo(entry.createdAt);
  const action = formatActionName(entry.action);
  const modAlias = entry.moderatorAlias || "Unknown";
  const targetAlias = entry.targetAlias || "System";

  let detailsStr = "";
  if (entry.details && Object.keys(entry.details).length > 0) {
    const details = [];
    if (entry.details.duration) details.push(`duration: ${entry.details.duration}`);
    if (entry.details.role) details.push(`role: ${entry.details.role}`);
    if (entry.details.count) details.push(`count: ${entry.details.count}`);
    if (entry.details.warnCount) details.push(`warns: ${entry.details.warnCount}`);
    if (entry.details.seconds) details.push(`seconds: ${entry.details.seconds}`);
    if (entry.details.reason) details.push(`reason: ${entry.details.reason}`);

    if (details.length > 0) {
      detailsStr = ` (${details.join(", ")})`;
    }
  }

  return (
    `<b>${action}</b>\n` +
    `  By: ${escapeHTML(modAlias)}\n` +
    `  Target: ${escapeHTML(targetAlias)}\n` +
    `  Time: ${escapeHTML(timeAgo)}${detailsStr ? `\n  ${escapeHTML(detailsStr)}` : ""}`
  );
}

/**
 * Show audit log page with optional filters
 */
async function showAuditLogPage(
  ctx,
  page = 1,
  filterType = null,
  filterValue = null,
  isEdit = false
) {
  try {
    // Build query
    const query = {};

    if (filterType === "action") {
      query.action = filterValue;
    } else if (filterType === "user") {
      query.targetUserId = filterValue;
    } else if (filterType === "mod") {
      query.moderatorId = filterValue;
    }

    // Fetch audit logs
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (logs.length === 0) {
      const message = filterType
        ? "📋 No audit log entries found matching your filter."
        : "📋 No audit log entries yet.";
      if (isEdit) {
        await ctx.editMessageText(message, { parse_mode: "HTML" });
      } else {
        await ctx.replyWithHTML(message);
      }
      return;
    }

    // Paginate logs
    const paginationResult = paginate(logs, page, 20);
    const { items, currentPage, totalPages, totalItems } = paginationResult;

    let header = "📋 <b>AUDIT LOG</b>\n\n";
    if (filterType === "action") {
      header += `Filter: Action = <code>${filterValue}</code>\n\n`;
    } else if (filterType === "user") {
      const targetAlias = items[0]?.targetAlias || "Unknown";
      header += `Filter: User = <b>${escapeHTML(targetAlias)}</b>\n\n`;
    } else if (filterType === "mod") {
      const modAlias = items[0]?.moderatorAlias || "Unknown";
      header += `Filter: Moderator = <b>${escapeHTML(modAlias)}</b>\n\n`;
    }

    const entriesText = items.map((entry) => formatAuditEntry(entry)).join("\n\n");
    let message = header + entriesText;
    message += getPaginationFooter(currentPage, totalPages, totalItems);

    // Build keyboard based on filter type
    let callbackPrefix = "auditlog_page";
    if (filterType === "action") {
      callbackPrefix = `auditlog_action_${filterValue}_page`;
    } else if (filterType === "user") {
      callbackPrefix = `auditlog_user_${filterValue}_page`;
    } else if (filterType === "mod") {
      callbackPrefix = `auditlog_mod_${filterValue}_page`;
    }

    const keyboard = buildPaginationKeyboard(callbackPrefix, currentPage, totalPages);

    const options = {
      parse_mode: "HTML",
      reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
    };

    if (isEdit) {
      await ctx.editMessageText(message, options);
    } else {
      await ctx.replyWithHTML(message, options);
    }
  } catch (err) {
    console.error("Error showing audit log:", err);
    const errorMsg = "❌ Error loading audit log.";
    if (isEdit) {
      await ctx.editMessageText(errorMsg);
    } else {
      await ctx.reply(errorMsg);
    }
  }
}

export function register(bot) {
  // Main audit log command
  bot.command(["auditlog", "audit"], async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(/\s+/).slice(1);

      // No args: show recent audit log
      if (args.length === 0) {
        return await showAuditLogPage(ctx, 1);
      }

      const subcommand = args[0].toLowerCase();

      // Page number: /auditlog 2
      if (/^\d+$/.test(subcommand)) {
        const page = parseInt(subcommand, 10);
        return await showAuditLogPage(ctx, page);
      }

      // Filter by user: /auditlog user <alias>
      if (subcommand === "user") {
        if (!args[1]) {
          return ctx.reply("Usage: /auditlog user <alias>");
        }
        const alias = args.slice(1).join(" ");
        const userId = await findUserIdByAlias(alias);
        if (!userId) {
          return ctx.reply(`❌ User "${alias}" not found.`);
        }
        return await showAuditLogPage(ctx, 1, "user", userId);
      }

      // Filter by moderator: /auditlog mod <alias>
      if (subcommand === "mod" || subcommand === "moderator") {
        if (!args[1]) {
          return ctx.reply("Usage: /auditlog mod <alias>");
        }
        const alias = args.slice(1).join(" ");
        const userId = await findUserIdByAlias(alias);
        if (!userId) {
          return ctx.reply(`❌ Moderator "${alias}" not found.`);
        }
        return await showAuditLogPage(ctx, 1, "mod", userId);
      }

      // Filter by action: /auditlog ban
      // Check if it's a valid action
      const validActions = [
        "ban", "unban", "bulk_ban", "bulk_unban",
        "mute", "unmute", "bulk_mute", "bulk_unmute",
        "kick", "bulk_kick",
        "restrict_media", "unrestrict_media",
        "promote", "demote", "whitelist_add",
        "warn", "clear_warnings", "auto_ban",
        "cooldown_apply",
        "filter_add", "filter_remove", "filter_toggle",
        "slowmode_enable", "slowmode_disable",
        "rule_add", "rule_remove", "rule_clear",
        "invite_mode_enable", "invite_mode_disable",
        "invite_create", "invite_revoke", "invite_activate", "invite_delete",
        "report_resolve", "report_dismiss",
      ];

      if (validActions.includes(subcommand)) {
        return await showAuditLogPage(ctx, 1, "action", subcommand);
      }

      // Unknown subcommand
      return ctx.reply(
        "📋 <b>AUDIT LOG USAGE</b>\n\n" +
          "<b>View recent logs:</b>\n" +
          "/auditlog\n" +
          "/auditlog [page]\n\n" +
          "<b>Filter by action:</b>\n" +
          "/auditlog ban\n" +
          "/auditlog mute\n" +
          "/auditlog warn\n\n" +
          "<b>Filter by user:</b>\n" +
          "/auditlog user &lt;alias&gt;\n\n" +
          "<b>Filter by moderator:</b>\n" +
          "/auditlog mod &lt;alias&gt;",
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error("Audit log command error:", err);
      ctx.reply("❌ Error processing audit log command.");
    }
  });

  // Handle pagination callbacks for default view
  bot.action(/^auditlog_page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await showAuditLogPage(ctx, page, null, null, true);
    await ctx.answerCbQuery();
  });

  // Handle pagination callbacks for action filter
  bot.action(/^auditlog_action_([a-z_]+)_page:(\d+)$/, async (ctx) => {
    const action = ctx.match[1];
    const page = parseInt(ctx.match[2], 10);
    await showAuditLogPage(ctx, page, "action", action, true);
    await ctx.answerCbQuery();
  });

  // Handle pagination callbacks for user filter
  bot.action(/^auditlog_user_([^_]+)_page:(\d+)$/, async (ctx) => {
    const userId = ctx.match[1];
    const page = parseInt(ctx.match[2], 10);
    await showAuditLogPage(ctx, page, "user", userId, true);
    await ctx.answerCbQuery();
  });

  // Handle pagination callbacks for mod filter
  bot.action(/^auditlog_mod_([^_]+)_page:(\d+)$/, async (ctx) => {
    const modId = ctx.match[1];
    const page = parseInt(ctx.match[2], 10);
    await showAuditLogPage(ctx, page, "mod", modId, true);
    await ctx.answerCbQuery();
  });
}
