import RelayedMessage from "../../models/RelayedMessage.js";
import { User } from "../../models/User.js";
import { getUserMeta } from "../../users/index.js";
import { escapeHTML, renderIconHTML } from "../../utils/sanitize.js";
import { sendWithRetry, sleep } from "../../relay/utils.js";
import { TIMING } from "../../config/constants.js";

export const meta = {
  commands: ["history"],
  category: "user",
  roleRequired: null,
  description: "View last 50 messages from the past 12 hours",
  usage: "/history",
  showInMenu: true,
};

export function register(bot) {
  bot.command("history", async (ctx) => {
    const userId = ctx.from.id;

    // Check if user is in lobby
    const meta = await getUserMeta(userId);
    if (!meta || !meta.inLobby) {
      return ctx.reply(
        "❌ You must join the lobby first to view message history.\nUse /join to enter the lobby."
      );
    }

    await ctx.reply("📜 Loading last 50 messages from the past 12 hours...");

    try {
      // Calculate cutoff time (12 hours ago)
      const cutoffDate = new Date(Date.now() - 12 * 60 * 60 * 1000);

      // Find all messages from the last 12 hours
      const messages = await RelayedMessage.find({
        relayedAt: { $gte: cutoffDate },
      })
        .sort({ relayedAt: 1 }) // Oldest first for proper chronological order
        .lean();

      if (messages.length === 0) {
        return ctx.reply("📭 No messages in the past 12 hours.");
      }

      // Group by unique original messages to avoid duplicates
      // Key: originalUserId_originalMsgId_originalItemMsgId
      const uniqueMessages = new Map();

      for (const msg of messages) {
        // For media groups, we need to track by originalItemMsgId
        const key = `${msg.originalUserId}_${msg.originalMsgId}_${msg.originalItemMsgId || ""}`;

        if (!uniqueMessages.has(key)) {
          uniqueMessages.set(key, msg);
        }
      }

      // Convert to array and limit to 50 most recent
      const uniqueArray = Array.from(uniqueMessages.values());
      const limitedMessages = uniqueArray.slice(-50); // Last 50 messages

      // Group messages by albumId for proper album reconstruction
      const albumGroups = new Map(); // albumId -> array of messages
      const standaloneMessages = [];

      for (const msg of limitedMessages) {
        if (msg.albumId) {
          if (!albumGroups.has(msg.albumId)) {
            albumGroups.set(msg.albumId, []);
          }
          albumGroups.get(msg.albumId).push(msg);
        } else {
          standaloneMessages.push(msg);
        }
      }

      // Fetch all unique sender information in batch
      const senderIds = [...new Set(limitedMessages.map((m) => m.originalUserId))];
      const senders = await User.find({ _id: { $in: senderIds } }).lean();
      const senderMap = new Map(senders.map((s) => [s._id, s]));

      let sentCount = 0;

      // Process albums first (maintain chronological order)
      const albumsToSend = [];
      for (const [albumId, albumMsgs] of albumGroups) {
        // Sort by originalItemMsgId to maintain order within album
        albumMsgs.sort((a, b) => a.originalItemMsgId - b.originalItemMsgId);
        const firstMsg = albumMsgs[0];
        albumsToSend.push({ albumId, messages: albumMsgs, timestamp: firstMsg.relayedAt });
      }

      // Combine albums and standalone messages, sort by timestamp
      const allItems = [
        ...albumsToSend.map((a) => ({ type: "album", data: a, timestamp: a.timestamp })),
        ...standaloneMessages.map((m) => ({ type: "message", data: m, timestamp: m.relayedAt })),
      ].sort((a, b) => a.timestamp - b.timestamp);

      // Send all messages in chronological order
      for (const item of allItems) {
        try {
          if (item.type === "album") {
            await sendAlbum(ctx, item.data, senderMap);
            sentCount += item.data.messages.length;
          } else {
            await sendStandaloneMessage(ctx, item.data, senderMap);
            sentCount++;
          }
          await sleep(TIMING.RELAY_DELAY_MS);
        } catch (err) {
          console.error(
            `Failed to send history message:`,
            err?.response?.description || err?.message || err
          );
        }
      }

      await ctx.reply(`✅ History loaded! (${sentCount} messages shown)`);
    } catch (err) {
      console.error("Error loading history:", err);
      await ctx.reply("❌ Failed to load message history. Please try again later.");
    }
  });
}

/**
 * Send a standalone (non-album) message
 */
async function sendStandaloneMessage(ctx, msg, senderMap) {
  const sender = senderMap.get(msg.originalUserId);
  if (!sender) {
    return;
  }

  const header = `${renderIconHTML(sender.icon)} <b>${escapeHTML(sender.alias)}</b>`;
  const hasTextContent = msg.caption && msg.type === "text";

  if (hasTextContent || msg.type === "text") {
    // Text message
    const body = `${header}\n\n${escapeHTML(msg.caption || "")}`;
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendMessage(ctx.chat.id, body, args),
      { parse_mode: "HTML" }
    );
  } else if (msg.type === "photo" && msg.fileId) {
    const caption = msg.caption ? `${header}\n\n${escapeHTML(msg.caption)}` : header;
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendPhoto(ctx.chat.id, msg.fileId, args),
      { caption, parse_mode: "HTML" }
    );
  } else if (msg.type === "video" && msg.fileId) {
    const caption = msg.caption ? `${header}\n\n${escapeHTML(msg.caption)}` : header;
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendVideo(ctx.chat.id, msg.fileId, args),
      { caption, parse_mode: "HTML" }
    );
  } else if (msg.type === "audio" && msg.fileId) {
    const caption = msg.caption ? `${header}\n\n${escapeHTML(msg.caption)}` : header;
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendAudio(ctx.chat.id, msg.fileId, args),
      { caption, parse_mode: "HTML" }
    );
  } else if (msg.type === "voice" && msg.fileId) {
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendVoice(ctx.chat.id, msg.fileId, args),
      { caption: header, parse_mode: "HTML" }
    );
  } else if (msg.type === "animation" && msg.fileId) {
    const caption = msg.caption ? `${header}\n\n${escapeHTML(msg.caption)}` : header;
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendAnimation(ctx.chat.id, msg.fileId, args),
      { caption, parse_mode: "HTML" }
    );
  } else if (msg.type === "document" && msg.fileId) {
    const caption = msg.caption ? `${header}\n\n${escapeHTML(msg.caption)}` : header;
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendDocument(ctx.chat.id, msg.fileId, args),
      { caption, parse_mode: "HTML" }
    );
  } else if (msg.type === "sticker" && msg.fileId) {
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendSticker(ctx.chat.id, msg.fileId, args),
      {}
    );
    // Send sender info separately for stickers (no caption support)
    await sendWithRetry(
      ctx.telegram,
      (args) => ctx.telegram.sendMessage(ctx.chat.id, header, args),
      { parse_mode: "HTML" }
    );
  } else {
    // Unsupported media type
    await sendWithRetry(
      ctx.telegram,
      (args) =>
        ctx.telegram.sendMessage(ctx.chat.id, `${header}\n\n<i>[unsupported media]</i>`, args),
      { parse_mode: "HTML" }
    );
  }
}

/**
 * Send a media group/album
 */
async function sendAlbum(ctx, albumData, senderMap) {
  const { messages: albumMsgs } = albumData;
  const firstMsg = albumMsgs[0];
  const sender = senderMap.get(firstMsg.originalUserId);

  if (!sender) {
    return;
  }

  const header = `${renderIconHTML(sender.icon)} <b>${escapeHTML(sender.alias)}</b>`;

  // Build InputMedia array
  const mediaGroup = albumMsgs.map((msg, i) => {
    let caption = "";
    if (i === 0) {
      // First item: include header and caption if any
      caption = msg.caption ? `${header}\n\n${escapeHTML(msg.caption)}` : header;
    }
    const base = { caption, parse_mode: "HTML" };

    if (msg.type === "photo") {
      return { type: "photo", media: msg.fileId, ...base };
    } else if (msg.type === "video") {
      return { type: "video", media: msg.fileId, ...base };
    } else if (msg.type === "audio") {
      return { type: "audio", media: msg.fileId, ...base };
    } else if (msg.type === "document") {
      return { type: "document", media: msg.fileId, ...base };
    } else {
      return { type: "document", media: msg.fileId, ...base };
    }
  });

  await sendWithRetry(
    ctx.telegram,
    (args) => ctx.telegram.sendMediaGroup(ctx.chat.id, mediaGroup, args),
    {}
  );
}
