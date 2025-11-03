import { relayMessage } from "../relay.js";
import { trackMessage } from "../users/activity.js";
import { isBanned, isMuted, getUserMeta } from "../users/index.js";
import isBotCommand from "../utils/isBotCommand.js";
import { handleEditRelay } from "../relay/editRelay.js";
import Setting from "../models/Setting.js";
import Filter from "../models/Filter.js";
import * as spamHandler from "../handlers/spamHandler.js";
import { formatDuration } from "../utils/timeFormat.js";
import RelayedMessage from "../models/RelayedMessage.js";

// Track last message time for slowmode
const lastMessageTime = new Map(); // userId -> timestamp

export default function registerHandlers(bot) {
  // Handle message edits
  bot.on("edited_message", async (ctx) => {
    const userId = ctx.from.id;

    // Block if banned or muted
    if (await isBanned(userId)) return;
    if (await isMuted(userId)) return;

    // Check if user is in lobby
    const meta = await getUserMeta(userId);
    if (!meta || !meta.inLobby) return;

    // Process the edit
    await handleEditRelay(ctx);
  });

  // Handle native Telegram reactions
  bot.on("message_reaction", async (ctx) => {
    try {
      const userId = String(ctx.from?.id || ctx.messageReaction?.user?.id);
      const messageId = ctx.messageReaction?.message_id;
      const chatId = ctx.messageReaction?.chat?.id || ctx.chat?.id;

      if (!userId || !messageId || !chatId) return;

      // Block if banned or muted
      if (await isBanned(userId)) return;
      if (await isMuted(userId)) return;

      // Check if user is in lobby
      const meta = await getUserMeta(userId);
      if (!meta || !meta.inLobby) return;

      // Find which original message this relayed message corresponds to
      const relayed = await RelayedMessage.findOne({
        userId,
        messageId
      }).lean();

      if (!relayed) return; // Not a relayed message, ignore

      // Get new reaction state
      const newReaction = ctx.messageReaction?.new_reaction || [];

      // Find all other relayed copies of this message
      const allCopies = await RelayedMessage.find({
        originalUserId: relayed.originalUserId,
        originalMsgId: relayed.originalMsgId
      }).lean();

      // Propagate reaction to all copies (including sender's original)
      for (const copy of allCopies) {
        try {
          // Skip if it's the message that just got reacted to
          if (copy.userId === userId && copy.messageId === messageId) continue;

          await ctx.telegram.setMessageReaction(
            copy.chatId || copy.userId,
            copy.messageId,
            newReaction,
            { is_big: false }
          );
        } catch (err) {
          // Gracefully handle failures (blocked user, deleted message, etc.)
          if (err.response?.error_code !== 403 && err.response?.error_code !== 400) {
            console.error(
              `Failed to relay reaction to ${copy.userId}:`,
              err?.response?.description || err?.message
            );
          }
        }
      }
    } catch (err) {
      console.error("Error handling message_reaction:", err.message);
    }
  });

  bot.on("message", async (ctx) => {
    const userId = ctx.from.id;

    // Block if banned or muted
    if (await isBanned(userId)) return;
    if (await isMuted(userId)) {
      await ctx.reply("🔇 You are muted.");
      return;
    }

    const m = ctx.message;

    // Ignore bot commands
    if (isBotCommand(m)) return;

    // Block @ mentions - users must use /s command to sign messages
    const textToCheck = m.text || m.caption || "";
    const hasMention = /@[a-zA-Z0-9_]+/.test(textToCheck);
    if (hasMention) {
      await ctx.reply(
        "❌ You cannot manually post usernames. Please use /s <message> to sign your message with your username."
      );
      return;
    }

    const isMedia = !!(
      m.photo ||
      m.video ||
      m.audio ||
      m.document ||
      m.sticker
    );
    const isReply = !!m.reply_to_message;
    await trackMessage(userId, isMedia, isReply);

    // Ignore if not in lobby
    const meta = await getUserMeta(userId);
    if (!meta || !meta.inLobby) return;

    // Fetch settings once for maintenance mode, slowmode, and filters
    const setting = await Setting.findById("global");

    // Check maintenance mode (admins can still send messages)
    if (setting?.maintenanceMode) {
      const isAdmin = meta.role === "admin";
      if (!isAdmin) {
        await ctx.reply(setting.maintenanceMessage || "🔧 The lobby is currently undergoing maintenance. Please check back later.");
        return;
      }
    }

    // Check slowmode (admins, mods, whitelist exempt)
    const isExemptFromSlowmode = meta.role && ["admin", "mod", "whitelist"].includes(meta.role);

    if (!isExemptFromSlowmode) {

      if (setting?.slowmodeEnabled) {
        const lastTime = lastMessageTime.get(String(userId));
        const now = Date.now();

        if (lastTime) {
          const timeSince = Math.floor((now - lastTime) / 1000);
          const timeLeft = setting.slowmodeSeconds - timeSince;

          if (timeLeft > 0) {
            await ctx.reply(
              `🐌 Slowmode active: Please wait ${timeLeft} second${timeLeft !== 1 ? "s" : ""} before sending another message.`
            );
            return;
          }
        }

        // Update last message time
        lastMessageTime.set(String(userId), now);
      }
    }

    // Check content filters
    const textContent = textToCheck.toLowerCase();

    if (textContent) {
      const activeFilters = await Filter.find({ active: true }).lean();

      for (const filter of activeFilters) {
        let matched = false;

        if (filter.isRegex) {
          try {
            const regex = new RegExp(filter.pattern, "i");
            matched = regex.test(textContent);
          } catch (err) {
            console.error(`Invalid regex in filter ${filter._id}:`, err.message);
          }
        } else {
          // Simple keyword match
          matched = textContent.includes(filter.pattern.toLowerCase());
        }

        if (matched) {
          await ctx.reply(
            `🚫 Your message was blocked by content filter.\n\n` +
              `Reason: Matched pattern "${filter.pattern}"\n\n` +
              `If you believe this is an error, contact an administrator.`
          );
          return;
        }
      }
    }

    // Check for spam (flood, link spam, rapid-fire)
    const isAutoMuted = await spamHandler.isAutoMuted(String(userId));
    if (isAutoMuted) {
      const remaining = await spamHandler.getAutoMuteRemaining(String(userId));
      const timeLeft = formatDuration(remaining);
      await ctx.reply(
        `🤖 You have been temporarily auto-muted for spam.\n\n` +
          `Time remaining: ${timeLeft}\n\n` +
          `Repeated violations will result in longer mutes.`
      );
      return;
    }

    const spamViolation = await spamHandler.checkSpam(String(userId), textToCheck);

    if (spamViolation) {
      const result = await spamHandler.handleViolation(String(userId), spamViolation);

      if (result.blocked) {
        let message = `🚫 Message blocked: ${spamViolation.reason}\n\n`;

        if (result.muteApplied) {
          const duration = formatDuration(result.muteDuration);
          message += `⚠️ You have been temporarily muted for ${duration}.\n\n`;
          message += `This is violation #${result.totalViolations}. `;
          message += `Mute level: ${result.level}/5\n\n`;
          message += `Please avoid spamming to prevent longer mutes.`;
        } else {
          message += `⚠️ This is violation #${result.totalViolations}.\n\n`;
          message += `Continued violations will result in temporary mutes.`;
        }

        await ctx.reply(message);
        return;
      }
    }

    // Track message for future spam detection
    await spamHandler.trackMessage(String(userId), textToCheck);

    await relayMessage(ctx); // continue
  });
}
