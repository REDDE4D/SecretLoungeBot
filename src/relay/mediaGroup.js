// src/relay/mediaGroup.js
import { getLobbyUsers } from "../users/index.js";
import RelayedMessage from "../models/RelayedMessage.js";
import Block from "../models/Block.js";
import {
  linkRelay,
  findRelayedMessageId,
  resolveOriginalFromReply,
} from "./quoteMap.js";
import { escapeHTML, renderIconHTML } from "../utils/sanitize.js";
import {
  isValidReplyId,
  sleep,
  calculateExpiresAt,
  sendWithRetry
} from "./utils.js";
import { TIMING } from "../config/constants.js";

/** Buffers **/
const mediaGroupBuffer = new Map(); // group_id → group buffer
const userAlbumIndex = new Map(); // userId → Set of groupIds

export async function handleMediaGroup(
  ctx,
  senderId,
  senderAlias,
  senderIcon,
  recipientsOverride
) {
  const id = ctx.message.media_group_id;
  const m = ctx.message;
  senderId = String(senderId || ctx.from.id);

  if (!mediaGroupBuffer.has(id)) {
    if (!userAlbumIndex.has(senderId)) userAlbumIndex.set(senderId, new Set());
    userAlbumIndex.get(senderId).add(id);
    const albumNumber = userAlbumIndex.get(senderId).size;

    // Resolve replied original for this album (what user is replying to)
    let repliedOriginal = null;
    const replyRelayedId = m.reply_to_message?.message_id || null;
    if (replyRelayedId) {
      repliedOriginal = await resolveOriginalFromReply(
        senderId,
        replyRelayedId
      );
    }

    mediaGroupBuffer.set(id, {
      senderId,
      senderAlias,
      senderIcon,
      repliedOriginal,
      items: [],
      originalMsgId: m.message_id, // first item id (anchor)
      originalChatId: ctx.chat.id,
      albumNumber,
      albumId: id,
      scheduled: false,
    });

    // Buffer cleanup after configured delay (increased from 8s to prevent race condition with relay)
    setTimeout(() => mediaGroupBuffer.delete(id), TIMING.MEDIA_GROUP_BUFFER_CLEANUP_MS);
  }

  const group = mediaGroupBuffer.get(id);
  if (m.photo) {
    group.items.push({
      type: "photo",
      media: m.photo.at(-1).file_id,
      caption: m.caption || "",
      originalItemMsgId: m.message_id,
    });
  } else if (m.video) {
    group.items.push({
      type: "video",
      media: m.video.file_id,
      caption: m.caption || "",
      originalItemMsgId: m.message_id,
    });
  } else if (m.audio) {
    group.items.push({
      type: "audio",
      media: m.audio.file_id,
      caption: m.caption || "",
      originalItemMsgId: m.message_id,
    });
  } else if (m.document) {
    group.items.push({
      type: "document",
      media: m.document.file_id,
      caption: m.caption || "",
      originalItemMsgId: m.message_id,
    });
  } else if (m.animation) {
    group.items.push({
      type: "animation",
      media: m.animation.file_id,
      caption: m.caption || "",
      originalItemMsgId: m.message_id,
    });
  } else if (m.voice) {
    group.items.push({
      type: "voice",
      media: m.voice.file_id,
      caption: m.caption || "",
      originalItemMsgId: m.message_id,
    });
  } else if (m.video_note) {
    group.items.push({
      type: "video_note",
      media: m.video_note.file_id,
      caption: m.caption || "",
      originalItemMsgId: m.message_id,
    });
  } else if (m.sticker) {
    group.items.push({
      type: "sticker",
      media: m.sticker.file_id,
      caption: m.caption || "",
      originalItemMsgId: m.message_id,
    });
  }

  if (!group.scheduled) {
    group.scheduled = true;
    // Increased delay from 900ms to configured value to ensure all items arrive (Telegram can batch over ~1s)
    setTimeout(() => relayGroup(id, ctx, recipientsOverride), TIMING.MEDIA_GROUP_RELAY_DELAY_MS);
  }
}

async function relayGroup(id, ctx, recipientsOverride) {
  const g = mediaGroupBuffer.get(id);
  if (!g) return;

  const lobbyUsers = recipientsOverride || (await getLobbyUsers());
  let recipients = lobbyUsers.filter(
    (uid) => String(uid) !== String(g.senderId)
  );

  // Filter out users who have blocked the sender
  if (recipients.length > 0) {
    const blocks = await Block.find({
      blockedUserId: g.senderId,
      userId: { $in: recipients }
    }).lean();

    const blockedByUserIds = new Set(blocks.map(b => b.userId));
    recipients = recipients.filter(uid => !blockedByUserIds.has(String(uid)));
  }

  // Calculate expiration for this album based on sender's compliance status
  const expiresAt = await calculateExpiresAt(g.senderId);

  for (const uid of recipients) {
    try {
      // Compute album reply target per-recipient
      let albumReplyTarget = undefined;
      if (g.repliedOriginal) {
        if (String(uid) === String(g.repliedOriginal.originalUserId)) {
          const target =
            g.repliedOriginal.originalItemMsgId ||
            g.repliedOriginal.originalMsgId;
          if (isValidReplyId(target)) albumReplyTarget = target;
        } else {
          const mapped = await findRelayedMessageId(uid, {
            originalUserId: g.repliedOriginal.originalUserId,
            originalMsgId: g.repliedOriginal.originalMsgId,
            originalItemMsgId: g.repliedOriginal.originalItemMsgId,
          });
          if (isValidReplyId(mapped)) albumReplyTarget = mapped;
        }
      }

      // Build header with icon and alias
      const header = `${renderIconHTML(g.senderIcon)} <b>${escapeHTML(g.senderAlias)}</b>`;

      // Build InputMedia array with header on first item
      const mediaGroup = g.items.map((item, i) => {
        let cap = "";
        if (i === 0) {
          // First item: include header and caption (if any)
          cap = item.caption ? `${header}\n\n${escapeHTML(item.caption)}` : header;
        }
        const base = { caption: cap, parse_mode: "HTML" };

        if (item.type === "photo")
          return { type: "photo", media: item.media, ...base };
        if (item.type === "video")
          return { type: "video", media: item.media, ...base };
        if (item.type === "audio")
          return { type: "audio", media: item.media, ...base };
        if (item.type === "animation")
          return { type: "animation", media: item.media, ...base };
        if (item.type === "voice")
          return { type: "voice", media: item.media, ...base };
        if (item.type === "video_note")
          return { type: "video_note", media: item.media, ...base };
        if (item.type === "sticker")
          return { type: "document", media: item.media, ...base }; // stickers: no caption in group
        return { type: "document", media: item.media, ...base };
      });

      const messages = await sendWithRetry(
        ctx.telegram,
        (args) => ctx.telegram.sendMediaGroup(uid, mediaGroup, args),
        { reply_to_message_id: albumReplyTarget }
      );

      // Persist mapping for each item
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const src = g.items[i];

        await RelayedMessage.create({
          userId: uid,
          chatId: uid,
          messageId: msg.message_id,
          originalUserId: g.senderId,
          originalMsgId: g.originalMsgId,
          originalItemMsgId: src?.originalItemMsgId || g.originalMsgId,
          type: src?.type || "other",
          fileId: src?.media,
          caption: src?.caption || "",
          albumId: g.albumId,
          expiresAt, // 24h default, 7 days if sender has warnings/banned
        });

        await linkRelay(
          msg.message_id,
          {
            userId: uid,
            originalMsgId: g.originalMsgId,
            originalItemMsgId: src?.originalItemMsgId || g.originalMsgId,
            originalUserId: g.senderId,
            originalUserChatId: g.originalChatId,
            alias: g.senderAlias,
            content: src?.caption || "[media]",
          },
          TIMING.QUOTE_LINK_TTL_MS
        );
      }

      await sleep(TIMING.RELAY_DELAY_MS);
    } catch (err) {
      console.error(
        `❌ Failed to send media group to ${uid}:`,
        err?.response?.description || err?.message || err
      );
    }
  }

  mediaGroupBuffer.delete(id);
}
