// src/utils/sanitize.js
// Shared sanitization and escaping utilities

/**
 * Escape HTML special characters to prevent injection
 * @param {string} s - String to escape
 * @returns {string} HTML-escaped string
 */
export function escapeHTML(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape MarkdownV2 special characters for Telegram
 * @param {string} s - String to escape
 * @returns {string} MarkdownV2-escaped string
 */
export function escapeMarkdownV2(s = "") {
  return String(s).replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

/**
 * Render icon for HTML output (supports custom emoji and fallback)
 * @param {string|object} icon - Icon string or object with customEmojiId and fallback
 * @returns {string} HTML-formatted icon
 */
export function renderIconHTML(icon) {
  if (!icon) return "";
  if (typeof icon === "string") return escapeHTML(icon);
  const fb = escapeHTML(icon.fallback || "");
  if (icon.customEmojiId) {
    return `<tg-emoji emoji-id="${icon.customEmojiId}">${fb || "🙂"}</tg-emoji>`;
  }
  return fb || "";
}

/**
 * Format error message with HTML styling
 * @param {string} message - Error message
 * @param {string} [title] - Optional error title (defaults to "Error")
 * @returns {string} HTML-formatted error message
 */
export function formatError(message, title = "Error") {
  const escapedTitle = escapeHTML(title);
  const escapedMessage = escapeHTML(message);
  return `<b>❌ ${escapedTitle}</b>\n${escapedMessage}`;
}

/**
 * Format success message with HTML styling
 * @param {string} message - Success message
 * @param {string} [title] - Optional success title (defaults to "Success")
 * @returns {string} HTML-formatted success message
 */
export function formatSuccess(message, title = "Success") {
  const escapedTitle = escapeHTML(title);
  const escapedMessage = escapeHTML(message);
  return `<b>✅ ${escapedTitle}</b>\n${escapedMessage}`;
}

/**
 * Format warning message with HTML styling
 * @param {string} message - Warning message
 * @param {string} [title] - Optional warning title (defaults to "Warning")
 * @returns {string} HTML-formatted warning message
 */
export function formatWarning(message, title = "Warning") {
  const escapedTitle = escapeHTML(title);
  const escapedMessage = escapeHTML(message);
  return `<b>⚠️ ${escapedTitle}</b>\n${escapedMessage}`;
}

/**
 * Format info message with HTML styling
 * @param {string} message - Info message
 * @param {string} [title] - Optional info title
 * @returns {string} HTML-formatted info message
 */
export function formatInfo(message, title = "Info") {
  const escapedTitle = escapeHTML(title);
  const escapedMessage = escapeHTML(message);
  return `<b>ℹ️ ${escapedTitle}</b>\n${escapedMessage}`;
}

/**
 * Validate alias format (length and character restrictions)
 * Aliases are optional - returns valid if alias is null/undefined
 * @param {string} alias - Alias to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateAlias(alias) {
  // Aliases are optional - null/undefined is valid
  if (!alias || alias.trim() === "") {
    return { valid: true, error: null };
  }
  if (alias.length < 2) {
    return { valid: false, error: "Alias must be at least 2 characters long" };
  }
  if (alias.length > 32) {
    return { valid: false, error: "Alias must be no more than 32 characters long" };
  }
  // Allow alphanumeric, spaces, hyphens, underscores, apostrophes, periods
  if (!/^[\w\s\-'\.]+$/u.test(alias)) {
    return {
      valid: false,
      error: "Alias can only contain letters, numbers, spaces, hyphens, underscores, apostrophes, and periods"
    };
  }
  return { valid: true, error: null };
}
