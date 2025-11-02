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
