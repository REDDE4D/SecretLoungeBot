import {
  getAlias,
  getUserMeta,
  muteUser,
  unmuteUser,
  banUser,
  unbanUser,
  kickUser,
  restrictMedia,
  unrestrictMedia,
  addWarning,
  findUserIdByAlias,
} from "../../users/index.js";
import { getActivity } from "../../users/activity.js";
import { resolveOriginalFromReply } from "../../relay/quoteMap.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import {
  buildUserActionButtons,
  buildQuickActionsMenu,
  buildConfirmationButtons,
  parseCallbackData,
  formatActionName,
} from "../../utils/moderationButtons.js";
import {
  buildMuteDurationSelector,
  buildBanDurationSelector,
  formatDuration,
} from "../../utils/durationButtons.js";
import {
  createPendingAction,
  completePendingAction,
  verifyInitiator,
} from "../../utils/actionState.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["whois", "w", "userinfo", "ui"],
  category: "mod",
  roleRequired: "mod",
  description: "Identify message sender or get user info",
  usage: "/whois [alias|reply] or /userinfo <alias|reply>",
  showInMenu: false,
};

export function register(bot) {
  // Whois handler - supports reply-based and alias-based lookup
  const whoisHandler = async (ctx) => {
    const args = ctx.message.text.trim().split(" ").slice(1);
    const alias = args[0];

    let targetId = null;

    // If replying to a message, resolve the original sender
    if (!alias && ctx.message?.reply_to_message) {
      const replyMsgId = ctx.message.reply_to_message.message_id;
      const resolved = await resolveOriginalFromReply(ctx.from.id, replyMsgId);
      if (resolved?.originalUserId) {
        targetId = resolved.originalUserId;
      }
    }

    // If alias provided, look up by alias
    if (alias) {
      // Trim the alias to prevent whitespace issues
      const cleanAlias = alias.trim();
      if (!cleanAlias) {
        return ctx.reply(
          "❌ Please provide a valid alias or reply to a message\\.",
          {
            parse_mode: "MarkdownV2",
          }
        );
      }

      const { findUserIdByAlias } = await import("../../users/index.js");
      targetId = await findUserIdByAlias(cleanAlias);

      if (!targetId) {
        return ctx.reply(
          `❌ User "${escapeMarkdownV2(
            cleanAlias
          )}" not found\\. Make sure they have set an alias\\.`,
          {
            parse_mode: "MarkdownV2",
          }
        );
      }
    }

    if (!targetId) {
      return ctx.reply("❌ Reply to a message or use `/whois <alias>`", {
        parse_mode: "MarkdownV2",
      });
    }

    // Get user metadata from database
    const userMeta = await getUserMeta(targetId);
    if (!userMeta) {
      return ctx.reply("❌ User not found in database\\.", {
        parse_mode: "MarkdownV2",
      });
    }

    // Get Telegram profile information
    let telegramInfo;
    try {
      telegramInfo = await ctx.telegram.getChat(targetId);
    } catch (err) {
      telegramInfo = null;
    }

    // Get activity status
    const activity = await getActivity(targetId);

    // Build comprehensive user information
    const lines = ["🔍 *User Identification*", ""];

    // Telegram Profile
    lines.push("*Telegram Profile:*");
    lines.push(`• User ID: \`${escapeMarkdownV2(String(targetId))}\``);
    if (telegramInfo?.username) {
      lines.push(`• Username: @${escapeMarkdownV2(telegramInfo.username)}`);
    }
    if (telegramInfo?.first_name) {
      lines.push(`• First Name: ${escapeMarkdownV2(telegramInfo.first_name)}`);
    }
    if (telegramInfo?.last_name) {
      lines.push(`• Last Name: ${escapeMarkdownV2(telegramInfo.last_name)}`);
    }

    // Lobby Info
    lines.push("");
    lines.push("*Lobby Info:*");
    const aliasRaw = await getAlias(targetId);
    lines.push(`• Alias: *${escapeMarkdownV2(aliasRaw || "N/A")}*`);
    lines.push(`• In Lobby: ${userMeta.inLobby ? "✅ Yes" : "❌ No"}`);

    // Role & Permissions
    const role = userMeta.role || "user";
    const roleDisplay =
      role === "user"
        ? "Regular User"
        : role.charAt(0).toUpperCase() + role.slice(1);
    lines.push(`• Role: ${escapeMarkdownV2(roleDisplay)}`);

    // Status & Activity
    if (activity) {
      lines.push("");
      lines.push("*Activity & Status:*");
      lines.push(`• Status: ${escapeMarkdownV2(activity.status || "unknown")}`);
      if (activity.lastActive) {
        lines.push(
          `• Last Active: ${escapeMarkdownV2(
            new Date(activity.lastActive).toLocaleString()
          )}`
        );
      }
    }

    // Restrictions & Compliance
    lines.push("");
    lines.push("*Restrictions & Compliance:*");
    lines.push(`• Warnings: ${userMeta.warnings || 0}/3`);

    if (userMeta.mutedUntil && userMeta.mutedUntil > new Date()) {
      lines.push(
        `• Muted Until: ${escapeMarkdownV2(
          userMeta.mutedUntil.toLocaleString()
        )}`
      );
    } else {
      lines.push("• Muted: No");
    }

    if (userMeta.bannedUntil) {
      if (userMeta.bannedUntil > new Date()) {
        lines.push(
          `• Banned Until: ${escapeMarkdownV2(
            userMeta.bannedUntil.toLocaleString()
          )}`
        );
      } else {
        lines.push("• Banned: Expired");
      }
    } else {
      lines.push("• Banned: No");
    }

    lines.push(
      `• Media Restricted: ${userMeta.mediaRestricted ? "Yes" : "No"}`
    );

    ctx.reply(lines.join("\n"), { parse_mode: "MarkdownV2" });
  };

  // Userinfo handler - supports reply-based and alias-based lookup
  const userinfoHandler = async (ctx) => {
    const args = ctx.message.text.trim().split(" ").slice(1);
    const alias = args[0];

    let targetId = null;

    // If replying to a message, resolve the original sender
    if (!alias && ctx.message?.reply_to_message) {
      const replyMsgId = ctx.message.reply_to_message.message_id;
      const resolved = await resolveOriginalFromReply(ctx.from.id, replyMsgId);
      if (resolved?.originalUserId) {
        targetId = resolved.originalUserId;
      }
    }

    // If alias provided, look up by alias
    if (alias) {
      const { findUserIdByAlias } = await import("../../users/index.js");
      targetId = await findUserIdByAlias(alias.trim());
      if (!targetId) {
        return ctx.reply(`❌ User "${escapeMarkdownV2(alias)}" not found\\.`, {
          parse_mode: "MarkdownV2",
        });
      }
    }

    if (!targetId) {
      return ctx.reply("❌ Reply to a message or use `/userinfo <alias>`", {
        parse_mode: "MarkdownV2",
      });
    }

    const userMeta = await getUserMeta(targetId);
    if (!userMeta)
      return ctx.reply("❌ User not found\\.", {
        parse_mode: "MarkdownV2",
      });

    const aliasRaw = await getAlias(targetId);
    const aliasEscaped = escapeMarkdownV2(aliasRaw);

    // Determine user state for context-aware buttons
    const isMuted = userMeta.mutedUntil && userMeta.mutedUntil > new Date();
    const isBanned = userMeta.bannedUntil && userMeta.bannedUntil > new Date();
    const isMediaRestricted = !!userMeta.mediaRestricted;

    const userState = {
      isMuted,
      isBanned,
      isMediaRestricted,
    };

    // Build action buttons
    const actionButtons = buildUserActionButtons(targetId, userState);

    ctx.reply(
      `👤 *User Info*\nAlias: *${aliasEscaped}*\nWarnings: ${
        userMeta.warnings || 0
      }/3\nMuted: ${isMuted ? "Yes" : "No"}\nBanned: ${isBanned ? "Yes" : "No"}\nMedia Restricted: ${isMediaRestricted ? "Yes" : "No"}\nLast Active: ${new Date(
        userMeta.lastActive || 0
      ).toLocaleString()}`,
      {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: actionButtons,
        },
      }
    );
  };

  // ========== CALLBACK HANDLERS FOR USERINFO ACTION BUTTONS ==========

  // Handler for userinfo action buttons (warn, mute, kick, ban, etc.)
  bot.action(/^userinfo:([^:]+):(.+)$/, async (ctx) => {
    try {
      const action = ctx.match[1];
      const targetId = ctx.match[2];

      const initiatorId = ctx.from.id;

      // Verify permissions (only mods/admins can use these buttons)
      const initiatorMeta = await getUserMeta(initiatorId);
      if (!initiatorMeta || !["owner", "admin", "mod"].includes(initiatorMeta.role)) {
        await ctx.answerCbQuery("❌ You don't have permission to perform this action.");
        return;
      }

      // Get target user info
      const targetMeta = await getUserMeta(targetId);
      if (!targetMeta) {
        await ctx.answerCbQuery("❌ User not found.");
        return;
      }

      const targetAlias = await getAlias(targetId);

      // Handle different actions
      switch (action) {
        case "warn": {
          // Issue warning
          const initiatorAlias = await getAlias(initiatorId);
          await addWarning(targetId, initiatorId, initiatorAlias, "Issued via userinfo");
          await ctx.answerCbQuery(`✅ Warning issued to ${targetAlias}`);
          logger.logModeration("warn", initiatorId, targetId, { via: "userinfo_button" });

          // Update the message to refresh the warning count
          const updatedMeta = await getUserMeta(targetId);
          const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(targetAlias)}*\nWarnings: ${
            updatedMeta.warnings || 0
          }/3\nMuted: ${updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date() ? "Yes" : "No"}\nBanned: ${updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date() ? "Yes" : "No"}\nMedia Restricted: ${!!updatedMeta.mediaRestricted ? "Yes" : "No"}\nLast Active: ${new Date(
            updatedMeta.lastActive || 0
          ).toLocaleString()}\n\n✅ Warning issued (${updatedMeta.warnings}/3)`;

          const userState = {
            isMuted: updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date(),
            isBanned: updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date(),
            isMediaRestricted: !!updatedMeta.mediaRestricted,
          };

          await ctx.editMessageText(updatedMessage, {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: buildUserActionButtons(targetId, userState),
            },
          });
          break;
        }

        case "mute": {
          // Show mute duration selector
          await ctx.editMessageReplyMarkup({
            inline_keyboard: buildMuteDurationSelector(targetId, "userinfo_mute"),
          });
          await ctx.answerCbQuery("⏱️ Select mute duration");
          break;
        }

        case "unmute": {
          // Unmute user
          await unmuteUser(targetId);
          await ctx.answerCbQuery(`✅ Unmuted ${targetAlias}`);
          logger.logModeration("unmute", initiatorId, targetId, { via: "userinfo_button" });

          // Refresh user info
          const updatedMeta = await getUserMeta(targetId);
          const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(targetAlias)}*\nWarnings: ${
            updatedMeta.warnings || 0
          }/3\nMuted: No\nBanned: ${updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date() ? "Yes" : "No"}\nMedia Restricted: ${!!updatedMeta.mediaRestricted ? "Yes" : "No"}\nLast Active: ${new Date(
            updatedMeta.lastActive || 0
          ).toLocaleString()}\n\n✅ User unmuted`;

          const userState = {
            isMuted: false,
            isBanned: updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date(),
            isMediaRestricted: !!updatedMeta.mediaRestricted,
          };

          await ctx.editMessageText(updatedMessage, {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: buildUserActionButtons(targetId, userState),
            },
          });
          break;
        }

        case "kick": {
          // Kick user (with confirmation)
          const confirmId = createPendingAction("kick", initiatorId, { targetId, targetAlias });

          await ctx.editMessageReplyMarkup({
            inline_keyboard: buildConfirmationButtons("kick", confirmId),
          });
          await ctx.answerCbQuery(`⚠️ Confirm kick for ${targetAlias}`);
          break;
        }

        case "ban": {
          // Show ban duration selector
          await ctx.editMessageReplyMarkup({
            inline_keyboard: buildBanDurationSelector(targetId, "userinfo_ban"),
          });
          await ctx.answerCbQuery("⏱️ Select ban duration");
          break;
        }

        case "unban": {
          // Unban user
          await unbanUser(targetId);
          await ctx.answerCbQuery(`✅ Unbanned ${targetAlias}`);
          logger.logModeration("unban", initiatorId, targetId, { via: "userinfo_button" });

          // Refresh user info
          const updatedMeta = await getUserMeta(targetId);
          const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(targetAlias)}*\nWarnings: ${
            updatedMeta.warnings || 0
          }/3\nMuted: ${updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date() ? "Yes" : "No"}\nBanned: No\nMedia Restricted: ${!!updatedMeta.mediaRestricted ? "Yes" : "No"}\nLast Active: ${new Date(
            updatedMeta.lastActive || 0
          ).toLocaleString()}\n\n✅ User unbanned`;

          const userState = {
            isMuted: updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date(),
            isBanned: false,
            isMediaRestricted: !!updatedMeta.mediaRestricted,
          };

          await ctx.editMessageText(updatedMessage, {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: buildUserActionButtons(targetId, userState),
            },
          });
          break;
        }

        case "restrict_media": {
          // Restrict media
          await restrictMedia(targetId);
          await ctx.answerCbQuery(`✅ Media restricted for ${targetAlias}`);
          logger.logModeration("restrict_media", initiatorId, targetId, { via: "userinfo_button" });

          // Refresh user info
          const updatedMeta = await getUserMeta(targetId);
          const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(targetAlias)}*\nWarnings: ${
            updatedMeta.warnings || 0
          }/3\nMuted: ${updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date() ? "Yes" : "No"}\nBanned: ${updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date() ? "Yes" : "No"}\nMedia Restricted: Yes\nLast Active: ${new Date(
            updatedMeta.lastActive || 0
          ).toLocaleString()}\n\n✅ Media restricted`;

          const userState = {
            isMuted: updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date(),
            isBanned: updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date(),
            isMediaRestricted: true,
          };

          await ctx.editMessageText(updatedMessage, {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: buildUserActionButtons(targetId, userState),
            },
          });
          break;
        }

        case "unrestrict_media": {
          // Unrestrict media
          await unrestrictMedia(targetId);
          await ctx.answerCbQuery(`✅ Media unrestricted for ${targetAlias}`);
          logger.logModeration("unrestrict_media", initiatorId, targetId, { via: "userinfo_button" });

          // Refresh user info
          const updatedMeta = await getUserMeta(targetId);
          const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(targetAlias)}*\nWarnings: ${
            updatedMeta.warnings || 0
          }/3\nMuted: ${updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date() ? "Yes" : "No"}\nBanned: ${updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date() ? "Yes" : "No"}\nMedia Restricted: No\nLast Active: ${new Date(
            updatedMeta.lastActive || 0
          ).toLocaleString()}\n\n✅ Media unrestricted`;

          const userState = {
            isMuted: updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date(),
            isBanned: updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date(),
            isMediaRestricted: false,
          };

          await ctx.editMessageText(updatedMessage, {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: buildUserActionButtons(targetId, userState),
            },
          });
          break;
        }

        case "quick_menu": {
          // Show quick actions menu
          await ctx.editMessageReplyMarkup({
            inline_keyboard: buildQuickActionsMenu(targetId),
          });
          await ctx.answerCbQuery("⚡ Quick Actions");
          break;
        }

        case "back": {
          // Return to main userinfo view
          const updatedMeta = await getUserMeta(targetId);
          const updatedAlias = await getAlias(targetId);

          const userState = {
            isMuted: updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date(),
            isBanned: updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date(),
            isMediaRestricted: !!updatedMeta.mediaRestricted,
          };

          const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(updatedAlias)}*\nWarnings: ${
            updatedMeta.warnings || 0
          }/3\nMuted: ${userState.isMuted ? "Yes" : "No"}\nBanned: ${userState.isBanned ? "Yes" : "No"}\nMedia Restricted: ${userState.isMediaRestricted ? "Yes" : "No"}\nLast Active: ${new Date(
            updatedMeta.lastActive || 0
          ).toLocaleString()}`;

          await ctx.editMessageText(updatedMessage, {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: buildUserActionButtons(targetId, userState),
            },
          });
          await ctx.answerCbQuery("« Back");
          break;
        }

        case "quick_mute": {
          // Quick mute with preset duration (from quick actions menu)
          const durationSeconds = parseInt(ctx.match[2].split(":")[1], 10);
          await muteUser(targetId, durationSeconds * 1000);
          const durationStr = formatDuration(durationSeconds);
          await ctx.answerCbQuery(`✅ Muted ${targetAlias} for ${durationStr}`);
          logger.logModeration("mute", initiatorId, targetId, {
            duration: durationSeconds,
            via: "userinfo_quick_mute",
          });

          // Refresh user info
          const updatedMeta = await getUserMeta(targetId);
          const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(targetAlias)}*\nWarnings: ${
            updatedMeta.warnings || 0
          }/3\nMuted: Yes\nBanned: ${updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date() ? "Yes" : "No"}\nMedia Restricted: ${!!updatedMeta.mediaRestricted ? "Yes" : "No"}\nLast Active: ${new Date(
            updatedMeta.lastActive || 0
          ).toLocaleString()}\n\n✅ Muted for ${durationStr}`;

          const userState = {
            isMuted: true,
            isBanned: updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date(),
            isMediaRestricted: !!updatedMeta.mediaRestricted,
          };

          await ctx.editMessageText(updatedMessage, {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: buildUserActionButtons(targetId, userState),
            },
          });
          break;
        }

        default:
          await ctx.answerCbQuery("❌ Unknown action");
      }
    } catch (err) {
      logger.error("Userinfo action callback error", {
        error: err.message,
        stack: err.stack,
        callback: ctx.callbackQuery?.data,
      });
      await ctx.answerCbQuery("❌ An error occurred");
    }
  });

  // Handler for mute duration selection (from userinfo mute button)
  bot.action(/^userinfo_mute_dur:([^:]+):(.+)$/, async (ctx) => {
    try {
      const targetId = ctx.match[1];
      const durationSeconds = parseInt(ctx.match[2], 10);
      const initiatorId = ctx.from.id;

      // Verify permissions
      const initiatorMeta = await getUserMeta(initiatorId);
      if (!initiatorMeta || !["owner", "admin", "mod"].includes(initiatorMeta.role)) {
        await ctx.answerCbQuery("❌ You don't have permission to perform this action.");
        return;
      }

      const targetAlias = await getAlias(targetId);

      // Apply mute
      if (durationSeconds === 0) {
        // Permanent mute
        await muteUser(targetId, Infinity);
      } else {
        await muteUser(targetId, durationSeconds * 1000);
      }

      const durationStr = formatDuration(durationSeconds);
      await ctx.answerCbQuery(`✅ Muted ${targetAlias} for ${durationStr}`);
      logger.logModeration("mute", initiatorId, targetId, {
        duration: durationSeconds,
        via: "userinfo_button",
      });

      // Refresh user info
      const updatedMeta = await getUserMeta(targetId);
      const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(targetAlias)}*\nWarnings: ${
        updatedMeta.warnings || 0
      }/3\nMuted: Yes\nBanned: ${updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date() ? "Yes" : "No"}\nMedia Restricted: ${!!updatedMeta.mediaRestricted ? "Yes" : "No"}\nLast Active: ${new Date(
        updatedMeta.lastActive || 0
      ).toLocaleString()}\n\n✅ Muted for ${durationStr}`;

      const userState = {
        isMuted: true,
        isBanned: updatedMeta.bannedUntil && updatedMeta.bannedUntil > new Date(),
        isMediaRestricted: !!updatedMeta.mediaRestricted,
      };

      await ctx.editMessageText(updatedMessage, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: buildUserActionButtons(targetId, userState),
        },
      });
    } catch (err) {
      logger.error("Mute duration callback error", {
        error: err.message,
        stack: err.stack,
      });
      await ctx.answerCbQuery("❌ An error occurred");
    }
  });

  // Handler for ban duration selection (from userinfo ban button)
  bot.action(/^userinfo_ban_dur:([^:]+):(.+)$/, async (ctx) => {
    try {
      const targetId = ctx.match[1];
      const durationSeconds = parseInt(ctx.match[2], 10);
      const initiatorId = ctx.from.id;

      // Verify permissions
      const initiatorMeta = await getUserMeta(initiatorId);
      if (!initiatorMeta || !["owner", "admin"].includes(initiatorMeta.role)) {
        await ctx.answerCbQuery("❌ You don't have permission to ban users.");
        return;
      }

      const targetAlias = await getAlias(targetId);

      // Apply ban
      if (durationSeconds === 0) {
        // Permanent ban
        await banUser(targetId, Infinity);
      } else {
        await banUser(targetId, durationSeconds * 1000);
      }

      const durationStr = formatDuration(durationSeconds);
      await ctx.answerCbQuery(`✅ Banned ${targetAlias} for ${durationStr}`);
      logger.logModeration("ban", initiatorId, targetId, {
        duration: durationSeconds,
        via: "userinfo_button",
      });

      // Refresh user info
      const updatedMeta = await getUserMeta(targetId);
      const updatedMessage = `👤 *User Info*\nAlias: *${escapeMarkdownV2(targetAlias)}*\nWarnings: ${
        updatedMeta.warnings || 0
      }/3\nMuted: ${updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date() ? "Yes" : "No"}\nBanned: Yes\nMedia Restricted: ${!!updatedMeta.mediaRestricted ? "Yes" : "No"}\nLast Active: ${new Date(
        updatedMeta.lastActive || 0
      ).toLocaleString()}\n\n✅ Banned for ${durationStr}`;

      const userState = {
        isMuted: updatedMeta.mutedUntil && updatedMeta.mutedUntil > new Date(),
        isBanned: true,
        isMediaRestricted: !!updatedMeta.mediaRestricted,
      };

      await ctx.editMessageText(updatedMessage, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: buildUserActionButtons(targetId, userState),
        },
      });
    } catch (err) {
      logger.error("Ban duration callback error", {
        error: err.message,
        stack: err.stack,
      });
      await ctx.answerCbQuery("❌ An error occurred");
    }
  });

  // Handler for kick confirmation
  bot.action(/^(confirm|cancel)_kick_(.+)$/, async (ctx) => {
    try {
      const action = ctx.match[1];
      const confirmId = `kick_${ctx.match[2]}`;
      const initiatorId = ctx.from.id;

      // Verify initiator
      if (!verifyInitiator(confirmId, initiatorId)) {
        await ctx.answerCbQuery("❌ Only the initiator can confirm this action.");
        return;
      }

      const pendingAction = completePendingAction(confirmId);

      if (!pendingAction) {
        await ctx.answerCbQuery("⏱️ This confirmation has expired.");
        await ctx.editMessageText("⏱️ Kick confirmation expired.");
        return;
      }

      if (action === "cancel") {
        await ctx.answerCbQuery("✅ Kick cancelled.");
        await ctx.editMessageText("❌ Kick cancelled.");
        return;
      }

      // Execute kick
      const { targetId, targetAlias } = pendingAction.data;
      await kickUser(targetId);
      await ctx.answerCbQuery(`✅ Kicked ${targetAlias}`);
      logger.logModeration("kick", initiatorId, targetId, { via: "userinfo_button" });

      await ctx.editMessageText(`✅ *${escapeMarkdownV2(targetAlias)}* has been kicked from the lobby\\.`, {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      logger.error("Kick confirmation callback error", {
        error: err.message,
        stack: err.stack,
      });
      await ctx.answerCbQuery("❌ An error occurred");
    }
  });

  // Handler for close menu button
  bot.action("close_menu", async (ctx) => {
    try {
      await ctx.answerCbQuery("✖️ Closed");
      await ctx.deleteMessage();
    } catch (err) {
      // Ignore errors (message may already be deleted)
    }
  });

  // Register all command variants
  bot.command("whois", whoisHandler);
  bot.command("w", whoisHandler);
  bot.command("userinfo", userinfoHandler);
  bot.command("ui", userinfoHandler);
}
