/**
 * Message Splitter Utility
 *
 * Handles splitting long messages that exceed Telegram's 4096 character limit.
 * Splits at word boundaries while preserving formatting and adds part indicators.
 */

const TELEGRAM_MAX_LENGTH = 4096;
const SAFE_MAX_LENGTH = 4000; // Safety margin for part indicators

/**
 * Splits a long message into multiple parts at word boundaries
 * @param {string} text - The text to split
 * @param {number} maxLength - Maximum length per part (default: 4000)
 * @returns {string[]} - Array of message parts
 */
export function splitLongMessage(text, maxLength = SAFE_MAX_LENGTH) {
  if (!text || text.length <= maxLength) {
    return [text];
  }

  const parts = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxLength) {
      parts.push(remainingText);
      break;
    }

    // Find the last space within maxLength to avoid cutting words
    let splitIndex = maxLength;
    const substring = remainingText.substring(0, maxLength);
    const lastSpace = substring.lastIndexOf(' ');
    const lastNewline = substring.lastIndexOf('\n');

    // Prefer splitting at newline, then space, then force split
    if (lastNewline > maxLength * 0.8) {
      splitIndex = lastNewline + 1; // Include the newline
    } else if (lastSpace > maxLength * 0.8) {
      splitIndex = lastSpace + 1; // Include the space
    }

    parts.push(remainingText.substring(0, splitIndex).trim());
    remainingText = remainingText.substring(splitIndex).trim();
  }

  // Add part indicators if split occurred
  if (parts.length > 1) {
    return parts.map((part, index) =>
      `<b>[Part ${index + 1}/${parts.length}]</b>\n\n${part}`
    );
  }

  return parts;
}

/**
 * Sends a message that might be too long, automatically splitting if needed
 * @param {Object} telegram - Telegram bot API instance
 * @param {string|number} chatId - Target chat ID
 * @param {string} text - Message text
 * @param {Object} options - Telegram send options (parse_mode, reply_markup, etc.)
 * @param {number} delayMs - Delay between parts (default: 100ms)
 * @returns {Promise<Array>} - Array of sent message objects
 */
export async function sendLongMessage(telegram, chatId, text, options = {}, delayMs = 100) {
  const parts = splitLongMessage(text);
  const sentMessages = [];

  for (let i = 0; i < parts.length; i++) {
    try {
      // Only apply reply_markup to the last part
      const messageOptions = { ...options };
      if (i < parts.length - 1) {
        delete messageOptions.reply_markup;
      }

      const sent = await telegram.sendMessage(chatId, parts[i], messageOptions);
      sentMessages.push(sent);

      // Add delay between parts to avoid rate limits
      if (i < parts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to send message part ${i + 1}/${parts.length} to ${chatId}:`, error.message);
      throw error; // Re-throw to let caller handle
    }
  }

  return sentMessages;
}

/**
 * Validates if a message length is acceptable
 * @param {string} text - Text to validate
 * @returns {boolean} - True if length is acceptable
 */
export function isValidLength(text) {
  return !text || text.length <= TELEGRAM_MAX_LENGTH;
}

/**
 * Truncates text to fit within limit with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength = SAFE_MAX_LENGTH) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 20) + '... (truncated)';
}

/**
 * Estimates the length of HTML-formatted text as rendered by Telegram
 * @param {string} html - HTML-formatted text
 * @returns {number} - Approximate character count
 */
export function estimateHtmlLength(html) {
  // Remove HTML tags for rough estimate
  const withoutTags = html.replace(/<[^>]+>/g, '');
  return withoutTags.length;
}
