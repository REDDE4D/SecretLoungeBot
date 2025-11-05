/**
 * Telegram HTML utilities for converting and sanitizing HTML content
 * Telegram supports a limited subset of HTML tags for message formatting
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
export const TELEGRAM_MESSAGE_LIMIT = 4096;

/**
 * Sanitizes HTML to only include Telegram-supported tags
 * Removes unsupported tags while preserving their content
 */
export function sanitizeTelegramHTML(html: string): string {
  if (!html) return '';

  // Create a temporary DOM element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Recursively process nodes
  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Check if tag is allowed
      if (ALLOWED_TAGS.includes(tagName)) {
        // Process children
        const content = Array.from(element.childNodes)
          .map(child => processNode(child))
          .join('');

        // Special handling for links
        if (tagName === 'a') {
          const href = element.getAttribute('href');
          if (href) {
            return `<a href="${escapeHtmlAttribute(href)}">${content}</a>`;
          }
          return content; // No href, just return content
        }

        // Special handling for code blocks with language
        if (tagName === 'pre') {
          const codeElement = element.querySelector('code');
          if (codeElement) {
            const language = codeElement.className.match(/language-(\w+)/)?.[1];
            if (language) {
              return `<pre><code class="language-${language}">${processNode(codeElement)}</code></pre>`;
            }
          }
          return `<pre>${content}</pre>`;
        }

        // For other allowed tags, wrap content
        return `<${tagName}>${content}</${tagName}>`;
      }

      // For disallowed tags, just return their content
      return Array.from(element.childNodes)
        .map(child => processNode(child))
        .join('');
    }

    return '';
  }

  return processNode(temp);
}

/**
 * Converts TipTap HTML output to Telegram-compatible HTML
 * Normalizes tags and ensures proper formatting
 */
export function convertToTelegramHTML(html: string): string {
  if (!html) return '';

  let result = html;

  // Normalize strong to b, em to i, etc.
  result = result.replace(/<strong>/gi, '<b>').replace(/<\/strong>/gi, '</b>');
  result = result.replace(/<em>/gi, '<i>').replace(/<\/em>/gi, '</i>');
  result = result.replace(/<ins>/gi, '<u>').replace(/<\/ins>/gi, '</u>');
  result = result.replace(/<(strike|del)>/gi, '<s>').replace(/<\/(strike|del)>/gi, '</s>');

  // Remove paragraph tags (Telegram doesn't need them, uses newlines)
  result = result.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n');

  // Convert <br> to newlines
  result = result.replace(/<br\s*\/?>/gi, '\n');

  // Clean up multiple consecutive newlines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  result = result.trim();

  return sanitizeTelegramHTML(result);
}

/**
 * Validates if HTML content is within Telegram's limits and format
 */
export function validateTelegramHTML(html: string): { valid: boolean; error?: string } {
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
 * Escapes HTML attribute values
 */
function escapeHtmlAttribute(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Gets character count for display (text only, no HTML tags)
 */
export function getTextLength(html: string): number {
  if (!html) return 0;
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return (temp.textContent || '').length;
}

/**
 * Formats HTML for preview display (adds Telegram-specific styling)
 */
export function formatForPreview(html: string): string {
  if (!html) return '';

  let result = html;

  // Normalize strong to b, em to i, etc.
  result = result.replace(/<strong>/gi, '<b>').replace(/<\/strong>/gi, '</b>');
  result = result.replace(/<em>/gi, '<i>').replace(/<\/em>/gi, '</i>');
  result = result.replace(/<ins>/gi, '<u>').replace(/<\/ins>/gi, '</u>');
  result = result.replace(/<(strike|del)>/gi, '<s>').replace(/<\/(strike|del)>/gi, '</s>');

  // Convert paragraph tags to divs for proper block layout
  result = result.replace(/<p>/gi, '<div class="tg-paragraph">');
  result = result.replace(/<\/p>/gi, '</div>');

  // Convert <br> tags to actual line breaks within content
  result = result.replace(/<br\s*\/?>/gi, '\n');

  // Sanitize to only allowed tags
  result = sanitizeTelegramHTML(result);

  // Style spoilers for preview
  result = result.replace(/<tg-spoiler>/gi, '<span class="tg-spoiler">');
  result = result.replace(/<\/tg-spoiler>/gi, '</span>');

  // Style code blocks
  result = result.replace(/<pre>/gi, '<pre class="tg-pre">');
  result = result.replace(/<code>/gi, '<code class="tg-code">');

  // Style blockquotes
  result = result.replace(/<blockquote>/gi, '<blockquote class="tg-blockquote">');

  return result;
}
