import { relayMessage } from "../relay.js";
import { trackMessage } from "../users/activity.js";
import { isBanned, isMuted, getUserMeta } from "../users/index.js";
import isBotCommand from "../utils/isBotCommand.js";
import { handleEditRelay } from "../relay/editRelay.js";
import Setting from "../models/Setting.js";
import Filter from "../models/Filter.js";

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

    // Check slowmode (admins, mods, whitelist exempt)
    const isExemptFromSlowmode = meta.role && ["admin", "mod", "whitelist"].includes(meta.role);

    if (!isExemptFromSlowmode) {
      const setting = await Setting.findById("global");

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

    await relayMessage(ctx); // continue
  });
}
