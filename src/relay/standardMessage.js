// src/relay/standardMessage.js
import { getLobbyUsers } from "../users/index.js";
import RelayedMessage from "../models/RelayedMessage.js";
import Block from "../models/Block.js";
import { Preferences } from "../models/Preferences.js";
import {
  linkRelay,
  findRelayedMessageId,
  tryBuildMessageLink,
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

/**
 * Relay a single, non-album message (text or single media).
 */
export async function relayStandardMessage(
  ctx,
  senderId,
  senderAlias,
  senderIcon,
  recipientsOverride
) {
  const m = ctx.message;
  senderId = String(senderId || ctx.from.id);
  const originalChatId = ctx.chat.id;

  // Resolve original target the replier replied to (if any)
  let repliedOriginal = null;
  const replyRelayedId = m.reply_to_message?.message_id || null;
  if (replyRelayedId) {
    repliedOriginal = await resolveOriginalFromReply(senderId, replyRelayedId);
  }

  // Recipients
  const lobbyUsers = recipientsOverride || (await getLobbyUsers());
  let recipients = lobbyUsers.filter(
    (uid) => String(uid) !== String(senderId)
  );

  // Filter out users who have blocked the sender
  if (recipients.length > 0) {
    const blocks = await Block.find({
      blockedUserId: senderId,
      userId: { $in: recipients }
    }).lean();

    const blockedByUserIds = new Set(blocks.map(b => b.userId));
    recipients = recipients.filter(uid => !blockedByUserIds.has(String(uid)));
  }

  // Fetch preferences for all recipients (batch query for performance)
  const prefsMap = new Map();
  if (recipients.length > 0) {
    const prefs = await Preferences.find({ userId: { $in: recipients } }).lean();
    for (const pref of prefs) {
      prefsMap.set(pref.userId, pref);
    }
  }

  // Calculate expiration for this message based on sender's compliance status
  const expiresAt = await calculateExpiresAt(senderId);

  // Content detection
  const hasText = !!m.text;
  const media =
    m.photo?.at(-1)?.file_id ||
    m.video?.file_id ||
    m.document?.file_id ||
    m.audio?.file_id ||
    m.voice?.file_id ||
    m.animation?.file_id ||
    m.sticker?.file_id ||
    null;

  // Type
  let type = "text";
  if (!hasText && media) {
    if (m.photo) type = "photo";
    else if (m.video) type = "video";
    else if (m.document) type = "document";
    else if (m.audio) type = "audio";
    else if (m.voice) type = "voice";
    else if (m.animation) type = "animation";
    else if (m.sticker) type = "sticker";
    else type = "other";
  }

  // Save sender's original message for reaction tracking
  await RelayedMessage.create({
    userId: senderId,
    chatId: senderId,
    messageId: m.message_id,
    originalUserId: senderId,
    originalMsgId: m.message_id,
    originalItemMsgId: m.message_id,
    type,
    fileId: media || null,
    caption: m.caption || (hasText ? m.text : "") || "",
    albumId: null,
    expiresAt,
  });

  // Build header with icon and alias
  const header = `${renderIconHTML(senderIcon)} <b>${escapeHTML(senderAlias)}</b>`;

  for (const uid of recipients) {
    try {
      // Get recipient's preferences
      const recipientPrefs = prefsMap.get(String(uid));
      const compactMode = recipientPrefs?.compactMode || false;

      // Adjust spacing based on compact mode preference
      const spacing = compactMode ? "\n" : "\n\n";

      // Body/caption with header (personalized per recipient)
      const bodyText = hasText ? `${header}${spacing}${escapeHTML(m.text)}` : null;
      const caption = !hasText && m.caption ? `${header}${spacing}${escapeHTML(m.caption)}` : header;

      // Compute reply target per-recipient
      let reply_to_message_id = undefined;
      let linkFallbackHTML = "";

      if (repliedOriginal) {
        if (String(uid) === String(repliedOriginal.originalUserId)) {
          // Original sender → reply to *their* original (item if known)
          const target =
            repliedOriginal.originalItemMsgId || repliedOriginal.originalMsgId;
          if (isValidReplyId(target)) reply_to_message_id = target;
        } else {
          // Others → reply to relayed message in their chat
          const mapped = await findRelayedMessageId(uid, {
            originalUserId: repliedOriginal.originalUserId,
            originalMsgId: repliedOriginal.originalMsgId,
            originalItemMsgId: repliedOriginal.originalItemMsgId,
          });
          if (isValidReplyId(mapped)) reply_to_message_id = mapped;
          else {
            const link = tryBuildMessageLink(/* uid, mapped */);
            if (link)
              linkFallbackHTML = `\n<i>Replying to:</i> <a href="${escapeHTML(
                link
              )}">jump ↗</a>`;
          }
        }
      }

      let sent;

      if (hasText) {
        const body = linkFallbackHTML
          ? `${bodyText}${linkFallbackHTML}`
          : bodyText;
        sent = await sendWithRetry(
          ctx.telegram,
          (args) => ctx.telegram.sendMessage(uid, body, args),
          { parse_mode: "HTML", reply_to_message_id }
        );
      } else if (type === "photo") {
        sent = await sendWithRetry(
          ctx.telegram,
          (args) => ctx.telegram.sendPhoto(uid, m.photo.at(-1).file_id, args),
          { caption, parse_mode: "HTML", reply_to_message_id }
        );
      } else if (type === "video") {
        sent = await sendWithRetry(
          ctx.telegram,
          (args) => ctx.telegram.sendVideo(uid, m.video.file_id, args),
          { caption, parse_mode: "HTML", reply_to_message_id }
        );
      } else if (type === "audio") {
        sent = await sendWithRetry(
          ctx.telegram,
          (args) => ctx.telegram.sendAudio(uid, m.audio.file_id, args),
          { caption, parse_mode: "HTML", reply_to_message_id }
        );
      } else if (type === "animation") {
        sent = await sendWithRetry(
          ctx.telegram,
          (args) => ctx.telegram.sendAnimation(uid, m.animation.file_id, args),
          { caption, parse_mode: "HTML", reply_to_message_id }
        );
      } else if (type === "voice") {
        sent = await sendWithRetry(
          ctx.telegram,
          (args) => ctx.telegram.sendVoice(uid, m.voice.file_id, args),
          { caption, parse_mode: "HTML", reply_to_message_id }
        );
      } else if (type === "document" || type === "sticker") {
        if (type === "sticker") {
          // Stickers sent as-is (no caption support)
          sent = await sendWithRetry(
            ctx.telegram,
            (args) => ctx.telegram.sendSticker(uid, m.sticker.file_id, args),
            { reply_to_message_id }
          );
        } else {
          sent = await sendWithRetry(
            ctx.telegram,
            (args) => ctx.telegram.sendDocument(uid, m.document.file_id, args),
            { caption, parse_mode: "HTML", reply_to_message_id }
          );
        }
      } else {
        const fallbackBody = `<i>[unsupported media]</i>`;
        sent = await sendWithRetry(
          ctx.telegram,
          (args) => ctx.telegram.sendMessage(uid, fallbackBody, args),
          { parse_mode: "HTML", reply_to_message_id }
        );
      }

      // Persist mapping
      await RelayedMessage.create({
        userId: uid,
        chatId: uid,
        messageId: sent.message_id,
        originalUserId: senderId,
        originalMsgId: m.message_id,
        originalItemMsgId: m.message_id,
        type,
        fileId: media || null,
        caption: m.caption || (hasText ? m.text : "") || "",
        albumId: null,
        expiresAt, // 24h default, 7 days if sender has warnings/banned
      });

      await linkRelay(
        sent.message_id,
        {
          userId: uid,
          originalMsgId: m.message_id,
          originalItemMsgId: m.message_id,
          originalUserId: senderId,
          originalUserChatId: originalChatId,
          alias: senderAlias || null,
          content: hasText ? m.text : m.caption || "[media]",
        },
        TIMING.QUOTE_LINK_TTL_MS
      );

      await sleep(TIMING.RELAY_DELAY_MS);
    } catch (err) {
      console.error(
        `❌ Could not relay to ${uid}:`,
        err?.response?.description || err?.message || err
      );
    }
  }
}
