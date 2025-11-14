// src/relay/editRelay.js
import RelayedMessage from "../models/RelayedMessage.js";
import { getAlias, getIcon, getRole } from "../users/index.js";
import { escapeHTML, renderIconHTML } from "../utils/sanitize.js";
import { handleTelegramError } from "../utils/telegramErrorHandler.js";
import { getSystemRoleEmoji } from "../../dashboard-api/config/permissions.js";

/**
 * Handle message edits by updating all relayed copies
 * @param {object} ctx - Telegraf context with edited_message
 */
export async function handleEditRelay(ctx) {
  try {
    const editedMsg = ctx.editedMessage;
    const editorId = String(ctx.from.id);
    const originalMsgId = editedMsg.message_id;

    // Get new text/caption
    const newText = editedMsg.text || editedMsg.caption || "";

    if (!newText) {
      // Can't edit non-text content (photos, videos, etc.)
      return;
    }

    // Find all relayed copies of this message
    const relayedCopies = await RelayedMessage.find({
      originalUserId: editorId,
      originalMsgId: originalMsgId,
    }).lean();

    if (relayedCopies.length === 0) {
      // No relayed copies found (might be a DM or non-relayed message)
      return;
    }

    // Get editor's alias and icon for formatting
    const alias = await getAlias(editorId);
    const icon = await getIcon(editorId);

    // Get editor's role and role emoji badge
    const editorRole = await getRole(editorId);
    let roleBadge = "";

    // Only show badges for privileged roles (admin, mod, whitelist)
    if (editorRole && ["admin", "mod", "whitelist"].includes(editorRole)) {
      const roleEmoji = await getSystemRoleEmoji(editorRole);
      if (roleEmoji) {
        roleBadge = ` ${roleEmoji}`;
      }
    }

    // Build updated message format with role badge
    const header = `${renderIconHTML(icon)} <b>${escapeHTML(alias)}</b>${roleBadge}`;
    const editIndicator = `<i>(edited)</i>`;
    const newCaption = `${header} ${editIndicator}\n\n${escapeHTML(newText)}`;

    let successCount = 0;
    let failCount = 0;

    // Update all relayed copies
    for (const copy of relayedCopies) {
      try {
        // Determine edit method based on message type
        if (copy.type === "photo") {
          await ctx.telegram.editMessageCaption(
            copy.userId,
            copy.messageId,
            null,
            newCaption,
            { parse_mode: "HTML" }
          );
        } else if (copy.type === "video" || copy.type === "document" || copy.type === "audio") {
          await ctx.telegram.editMessageCaption(
            copy.userId,
            copy.messageId,
            null,
            newCaption,
            { parse_mode: "HTML" }
          );
        } else {
          // Text message
          await ctx.telegram.editMessageText(
            copy.userId,
            copy.messageId,
            null,
            newCaption,
            { parse_mode: "HTML" }
          );
        }

        successCount++;

        // Update caption in database
        await RelayedMessage.updateOne(
          { _id: copy._id },
          { caption: newCaption }
        );
      } catch (err) {
        failCount++;

        // Use centralized error handler
        await handleTelegramError(err, copy.userId, "edit_relay", {
          editorId,
          editorAlias: alias,
          messageId: copy.messageId,
          originalMsgId,
        });
      }
    }
  } catch (err) {
    console.error("[edit-relay] Error handling edit:", err);
  }
}
