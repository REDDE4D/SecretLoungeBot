// src/utils/telegramHtml.js
/**
 * Utilities for sanitizing and processing HTML for Telegram messages
 * Telegram supports a limited subset of HTML tags for message formatting
 * Ref: https://core.telegram.org/bots/api#html-style
 */

// Allowed Telegram HTML tags
const ALLOWED_TAGS = [
  'b', 'strong',           // Bold
  'i', 'em',               // Italic
  'u', 'ins',              // Underline
  's', 'strike', 'del',    // Strikethrough
  'code',                  // Inline monospace
  'pre',                   // Code block
  'a',                     // Links
  'tg-spoiler',            // Spoiler text
  'blockquote',            // Quotes
  'tg-emoji',              // Custom emoji (Premium)
];

// Telegram message length limit
const TELEGRAM_MESSAGE_LIMIT = 4096;

/**
 * Sanitizes HTML to only include Telegram-supported tags
 * Uses a simple regex-based approach suitable for Node.js without DOM
 * @param {string} html - Raw HTML content
 * @returns {string} Sanitized HTML with only allowed tags
 */
export function sanitizeTelegramHTML(html) {
  if (!html || typeof html !== 'string') return '';

  let result = html;

  // Remove script tags and their content
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove dangerous event handlers
  result = result.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

  // Build regex pattern for allowed tags
  const allowedPattern = ALLOWED_TAGS.join('|');

  // Remove all HTML tags except allowed ones
  // This regex matches any tag that's not in our allowed list
  result = result.replace(/<\/?([a-z][a-z0-9-]*)[^>]*>/gi, (match, tagName) => {
    const normalizedTag = tagName.toLowerCase();

    // Check if tag is allowed
    if (ALLOWED_TAGS.includes(normalizedTag)) {
      // Special handling for links - preserve href attribute
      if (normalizedTag === 'a') {
        const hrefMatch = match.match(/href\s*=\s*["']([^"']*)["']/i);
        if (hrefMatch) {
          const href = escapeHtmlAttribute(hrefMatch[1]);
          return match.includes('</') ? '</a>' : `<a href="${href}">`;
        }
        return ''; // No href, remove tag
      }

      // Special handling for code blocks with language
      if (normalizedTag === 'code') {
        const langMatch = match.match(/class\s*=\s*["']language-([a-z0-9]+)["']/i);
        if (langMatch) {
          return `<code class="language-${langMatch[1]}">`;
        }
      }

      // For other allowed tags, keep simple open/close tags
      return match.includes('</') ? `</${normalizedTag}>` : `<${normalizedTag}>`;
    }

    // Remove disallowed tags but keep their content
    return '';
  });

  // Normalize common tag variations to Telegram standard
  result = result.replace(/<strong>/gi, '<b>').replace(/<\/strong>/gi, '</b>');
  result = result.replace(/<em>/gi, '<i>').replace(/<\/em>/gi, '</i>');
  result = result.replace(/<ins>/gi, '<u>').replace(/<\/ins>/gi, '</u>');
  result = result.replace(/<(strike|del)>/gi, '<s>').replace(/<\/(strike|del)>/gi, '</s>');

  return result.trim();
}

/**
 * Converts rich text HTML to Telegram-compatible HTML
 * Handles common formatting patterns from WYSIWYG editors
 * @param {string} html - Editor HTML output
 * @returns {string} Telegram-compatible HTML
 */
export function convertToTelegramHTML(html) {
  if (!html || typeof html !== 'string') return '';

  let result = html;

  // Remove paragraph tags (Telegram uses newlines instead)
  result = result.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n');

  // Convert <br> to newlines
  result = result.replace(/<br\s*\/?>/gi, '\n');

  // Convert <div> tags to newlines
  result = result.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');

  // Clean up multiple consecutive newlines (max 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  result = result.trim();

  // Apply sanitization
  return sanitizeTelegramHTML(result);
}

/**
 * Validates HTML content for Telegram limits
 * @param {string} html - HTML content to validate
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateTelegramHTML(html) {
  if (!html) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  const sanitized = convertToTelegramHTML(html);

  // Remove HTML tags to count actual text length
  const textOnly = sanitized.replace(/<[^>]*>/g, '');

  if (textOnly.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (textOnly.length > TELEGRAM_MESSAGE_LIMIT) {
    return {
      valid: false,
      error: `Message exceeds Telegram's ${TELEGRAM_MESSAGE_LIMIT} character limit (current: ${textOnly.length})`
    };
  }

  return { valid: true };
}

/**
 * Escapes HTML attribute values to prevent injection
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML attributes
 */
function escapeHtmlAttribute(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Checks if a string contains HTML formatting
 * @param {string} text - Text to check
 * @returns {boolean} True if HTML tags are present
 */
export function hasHTMLFormatting(text) {
  if (!text || typeof text !== 'string') return false;
  return /<[a-z][a-z0-9-]*[^>]*>/i.test(text);
}

/**
 * Gets the text length without HTML tags
 * @param {string} html - HTML content
 * @returns {number} Character count
 */
export function getTextLength(html) {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, '').length;
}

export default {
  sanitizeTelegramHTML,
  convertToTelegramHTML,
  validateTelegramHTML,
  hasHTMLFormatting,
  getTextLength,
  TELEGRAM_MESSAGE_LIMIT,
};
