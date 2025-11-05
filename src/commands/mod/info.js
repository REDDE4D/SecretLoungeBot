import { getAlias, getUserMeta } from "../../users/index.js";
import { getActivity } from "../../users/activity.js";
import { resolveOriginalFromReply } from "../../relay/quoteMap.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";

export const meta = {
  commands: ["whois", "w", "userinfo", "ui"],
  category: "admin",
  roleRequired: "owner",
  description: "Identify message sender or get user info (owner only)",
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

    ctx.reply(
      `👤 *User Info*\nAlias: *${aliasEscaped}*\nWarnings: ${
        userMeta.warnings || 0
      }\nMuted: ${!!userMeta.mutedUntil}\nBanned: ${!!userMeta.bannedUntil}\nMedia Restricted: ${!!userMeta.mediaRestricted}\nLast Active: ${new Date(
        userMeta.lastActive || 0
      ).toLocaleString()}`,
      { parse_mode: "MarkdownV2" }
    );
  };

  // Register all command variants
  bot.command("whois", whoisHandler);
  bot.command("w", whoisHandler);
  bot.command("userinfo", userinfoHandler);
  bot.command("ui", userinfoHandler);
}
