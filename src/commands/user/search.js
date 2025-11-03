import RelayedMessage from "../../models/RelayedMessage.js";
import { getUserMeta } from "../../users/index.js";
import { escapeHTML } from "../../utils/sanitize.js";
import { formatTimeAgo } from "../../utils/timeFormat.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["search", "find"],
  category: "user",
  roleRequired: null,
  description: "Search your own messages",
  usage: "/search <query>",
  showInMenu: true,
};

export function register(bot) {
  bot.command(["search", "find"], async (ctx) => {
    const userId = ctx.from.id.toString();

    // Check if user is in lobby
    const meta = await getUserMeta(userId);
    if (!meta || !meta.inLobby) {
      return ctx.reply(
        "❌ You must join the lobby first to search messages.\nUse /join to enter the lobby."
      );
    }

    // Parse search query
    const args = ctx.message.text.split(/\s+/).slice(1);
    if (args.length === 0) {
      return ctx.reply(
        "❌ Please provide a search query.\n\nUsage: /search <query>\n\n" +
        "Example: /search hello world\n\n" +
        "💡 You can only search your own messages for privacy reasons."
      );
    }

    const query = args.join(" ");

    // Validate query length
    if (query.length < 2) {
      return ctx.reply("❌ Search query must be at least 2 characters long.");
    }

    if (query.length > 100) {
      return ctx.reply("❌ Search query is too long. Maximum 100 characters.");
    }

    try {
      await ctx.reply(`🔍 Searching your messages for: "${escapeHTML(query)}"...`, {
        parse_mode: "HTML",
      });

      // Search messages (case-insensitive regex)
      // Only search messages sent by this user (privacy)
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      const messages = await RelayedMessage.find({
        originalUserId: userId,
        caption: { $regex: regex },
      })
        .sort({ relayedAt: -1 }) // Most recent first
        .limit(50) // Limit to 50 results
        .lean();

      if (messages.length === 0) {
        return ctx.reply(
          `📭 No messages found matching "${escapeHTML(query)}".\n\n` +
          "💡 Note: You can only search messages you've sent."
          , {
            parse_mode: "HTML",
          }
        );
      }

      // Group by unique original messages to avoid duplicates
      // (since RelayedMessage stores one record per recipient)
      const uniqueMessages = new Map();
      for (const msg of messages) {
        const key = `${msg.originalMsgId}_${msg.originalItemMsgId || ""}`;
        if (!uniqueMessages.has(key)) {
          uniqueMessages.set(key, msg);
        }
      }

      const uniqueArray = Array.from(uniqueMessages.values());
      const resultCount = uniqueArray.length;

      // Build search results message
      let resultText = `🔍 <b>Search Results</b>\n`;
      resultText += `Found ${resultCount} message${resultCount !== 1 ? "s" : ""} matching "${escapeHTML(query)}"\n\n`;

      for (let i = 0; i < Math.min(resultCount, 20); i++) {
        const msg = uniqueArray[i];
        const timeAgo = formatTimeAgo(msg.relayedAt);

        // Get message type emoji
        const typeEmoji = getTypeEmoji(msg.type);

        // Truncate caption for preview
        let preview = msg.caption || "[no text]";
        if (preview.length > 100) {
          preview = preview.substring(0, 100) + "...";
        }

        // Highlight the search term in the preview (case-insensitive)
        const highlightedPreview = highlightSearchTerm(preview, query);

        resultText += `${typeEmoji} <b>${escapeHTML(msg.type)}</b> • ${escapeHTML(timeAgo)}\n`;
        resultText += `${highlightedPreview}\n\n`;
      }

      if (resultCount > 20) {
        resultText += `<i>Showing first 20 of ${resultCount} results</i>\n`;
      }

      resultText += `\n💡 Tip: Use more specific search terms to narrow results.`;

      await ctx.reply(resultText, { parse_mode: "HTML" });

      logger.logCommand(userId, "search", { query, resultCount });
    } catch (err) {
      logger.error("Error searching messages:", err);
      await ctx.reply("❌ Failed to search messages. Please try again later.");
    }
  });
}

/**
 * Get emoji for message type
 */
function getTypeEmoji(type) {
  const emojiMap = {
    text: "💬",
    photo: "📷",
    video: "🎥",
    audio: "🎵",
    voice: "🎤",
    document: "📄",
    animation: "🎞️",
    sticker: "🎭",
    other: "📎",
  };
  return emojiMap[type] || "📎";
}

/**
 * Highlight search term in text (case-insensitive)
 */
function highlightSearchTerm(text, searchTerm) {
  // Escape HTML first
  const escapedText = escapeHTML(text);

  // Escape special regex characters in search term
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create case-insensitive regex
  const regex = new RegExp(`(${escapedSearchTerm})`, "gi");

  // Replace matches with bold highlighted version
  return escapedText.replace(regex, "<b><u>$1</u></b>");
}
