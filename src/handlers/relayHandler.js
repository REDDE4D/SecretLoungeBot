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
import MessageReaction from "../models/MessageReaction.js";
import { checkMessageForBlockedLinks, formatBlockedLinkMessage } from "../utils/linkDetection.js";

// Track last message time for slowmode
const lastMessageTime = new Map(); // userId -> timestamp

// Cache for settings and filters to reduce DB queries
let cachedSettings = null;
let cachedFilters = [];
let settingsCacheTime = 0;
let filtersCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

// Helper to get cached settings
async function getCachedSettings() {
  const now = Date.now();
  if (!cachedSettings || now - settingsCacheTime > CACHE_TTL) {
    cachedSettings = await Setting.findById("global");
    settingsCacheTime = now;
  }
  return cachedSettings;
}

// Helper to get cached filters
async function getCachedFilters() {
  const now = Date.now();
  if (cachedFilters.length === 0 || now - filtersCacheTime > CACHE_TTL) {
    cachedFilters = await Filter.find({ active: true }).lean();
    filtersCacheTime = now;
  }
  return cachedFilters;
}

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
      console.log("=== REACTION EVENT RECEIVED ===");
      console.log("Full update:", JSON.stringify(ctx.update, null, 2));

      // Access the message_reaction object from the update
      const reaction = ctx.update?.message_reaction || ctx.messageReaction;

      if (!reaction) {
        console.error("❌ No message_reaction found in context");
        return;
      }

      console.log("✓ Reaction object found:", reaction);

      const userId = String(reaction.user?.id || ctx.from?.id);
      const messageId = reaction.message_id;
      const chatId = String(reaction.chat?.id || ctx.chat?.id);

      console.log("Extracted data:", { userId, messageId, chatId });

      if (!userId || !messageId || !chatId) {
        console.error("❌ Missing required data:", { userId, messageId, chatId });
        return;
      }

      console.log("✓ All required data present");

      // Block if banned or muted
      if (await isBanned(userId)) {
        console.log("❌ User is banned, ignoring reaction");
        return;
      }
      if (await isMuted(userId)) {
        console.log("❌ User is muted, ignoring reaction");
        return;
      }

      // Check if user is in lobby
      const meta = await getUserMeta(userId);
      if (!meta || !meta.inLobby) {
        console.log("❌ User not in lobby, ignoring reaction");
        return;
      }

      console.log("✓ User is in lobby");

      // Find which original message this relayed message corresponds to
      console.log("Searching for relayed message:", { userId, messageId });
      const relayed = await RelayedMessage.findOne({
        userId,
        messageId
      }).lean();

      console.log("Relayed message found:", relayed);

      if (!relayed) {
        console.log("❌ Not a relayed message, ignoring");
        return;
      }

      console.log("✓ Found relayed message");

      // Get new reaction state from this user
      const userReactions = reaction.new_reaction || [];
      console.log("User's new reaction state:", userReactions);

      // Update or create reaction record for this user
      await MessageReaction.findOneAndUpdate(
        {
          originalUserId: relayed.originalUserId,
          originalMsgId: relayed.originalMsgId,
          reactorUserId: userId
        },
        {
          reactions: userReactions,
          updatedAt: new Date()
        },
        { upsert: true }
      );

      console.log("✓ Updated reaction record for user");

      // Aggregate all reactions from all users for this message
      const allUserReactions = await MessageReaction.find({
        originalUserId: relayed.originalUserId,
        originalMsgId: relayed.originalMsgId
      }).lean();

      console.log(`Found ${allUserReactions.length} users who have reacted`);

      // Collect unique reactions (Telegram limits bot to 3 reactions per message)
      const uniqueReactions = [];
      const seenReactionKeys = new Set();

      for (const userReaction of allUserReactions) {
        for (const r of userReaction.reactions || []) {
          // Create a unique key for this reaction
          const key = r.type === 'emoji' ? `emoji:${r.emoji}` : `custom:${r.custom_emoji_id}`;

          if (!seenReactionKeys.has(key) && uniqueReactions.length < 3) {
            seenReactionKeys.add(key);
            uniqueReactions.push(r);
          }
        }
      }

      console.log(`Aggregated reactions (max 3):`, uniqueReactions);

      // Find all relayed copies of this message
      const allCopies = await RelayedMessage.find({
        originalUserId: relayed.originalUserId,
        originalMsgId: relayed.originalMsgId
      }).lean();

      console.log(`✓ Found ${allCopies.length} copies to update`);

      // Propagate aggregated reactions to ALL copies (except reactor's own copy)
      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;

      for (const copy of allCopies) {
        try {
          // Skip the reactor's own copy - they already reacted themselves
          if (String(copy.userId) === String(userId)) {
            skippedCount++;
            console.log(`⏭️  Skipping reactor's own copy: userId=${copy.userId}, messageId=${copy.messageId}`);
            continue;
          }

          console.log(`Setting reaction on copy: userId=${copy.userId}, messageId=${copy.messageId}`);

          await ctx.telegram.setMessageReaction(
            copy.chatId || copy.userId,
            copy.messageId,
            uniqueReactions,
            { is_big: false }
          );

          successCount++;
          console.log(`✓ Successfully set reaction on ${copy.userId}:${copy.messageId}`);

          // Small delay between reactions to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
          failCount++;
          console.error(
            `❌ Failed to set reaction on ${copy.userId}:${copy.messageId}:`,
            {
              error_code: err.response?.error_code,
              description: err.response?.description,
              message: err.message
            }
          );
        }
      }

      console.log(`=== REACTION RELAY COMPLETE: ${successCount} success, ${failCount} failed, ${skippedCount} skipped ===`);
    } catch (err) {
      console.error("❌ Error handling message_reaction:", err.message);
      console.error("Stack:", err.stack);
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
    // Fire-and-forget activity tracking (non-blocking)
    trackMessage(userId, isMedia, isReply).catch(err =>
      console.error("Activity tracking error:", err.message)
    );

    // Ignore if not in lobby
    const meta = await getUserMeta(userId);
    if (!meta || !meta.inLobby) return;

    // Fetch settings once for maintenance mode, slowmode, and filters
    const setting = await getCachedSettings();

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
      const activeFilters = await getCachedFilters();

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

    // Check for blocked links
    if (textContent) {
      const linkCheck = await checkMessageForBlockedLinks(textContent, String(userId));

      if (linkCheck.blocked) {
        const errorMessage = formatBlockedLinkMessage(linkCheck.blockedUrls);
        await ctx.replyWithHTML(errorMessage);
        return;
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
