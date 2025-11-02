// src/utils/pagination.js

/**
 * Paginate an array of items
 * @param {Array} items - Array of items to paginate
 * @param {Number} page - Current page number (1-indexed)
 * @param {Number} itemsPerPage - Number of items per page
 * @returns {Object} Pagination result with items, totalPages, currentPage, hasNext, hasPrev
 */
export function paginate(items, page = 1, itemsPerPage = 10) {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = items.slice(startIndex, endIndex);

  return {
    items: pageItems,
    totalItems: items.length,
    totalPages,
    currentPage,
    itemsPerPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    startIndex,
    endIndex: Math.min(endIndex, items.length),
  };
}

/**
 * Build inline keyboard for pagination navigation
 * @param {String} callbackPrefix - Prefix for callback data (e.g., "reports_page")
 * @param {Number} currentPage - Current page number
 * @param {Number} totalPages - Total number of pages
 * @returns {Array} Inline keyboard array
 */
export function buildPaginationKeyboard(callbackPrefix, currentPage, totalPages) {
  if (totalPages <= 1) {
    return []; // No pagination needed
  }

  const buttons = [];

  // Previous button
  if (currentPage > 1) {
    buttons.push({
      text: "⬅️ Previous",
      callback_data: `${callbackPrefix}:${currentPage - 1}`,
    });
  }

  // Page indicator
  buttons.push({
    text: `${currentPage}/${totalPages}`,
    callback_data: "noop", // Non-interactive button
  });

  // Next button
  if (currentPage < totalPages) {
    buttons.push({
      text: "Next ➡️",
      callback_data: `${callbackPrefix}:${currentPage + 1}`,
    });
  }

  return [buttons];
}

/**
 * Format pagination footer text
 * @param {Number} currentPage - Current page number
 * @param {Number} totalPages - Total number of pages
 * @param {Number} totalItems - Total number of items
 * @returns {String} Footer text
 */
export function getPaginationFooter(currentPage, totalPages, totalItems) {
  if (totalPages <= 1) {
    return `\nTotal: ${totalItems} item${totalItems !== 1 ? "s" : ""}`;
  }

  return `\nPage ${currentPage}/${totalPages} • Total: ${totalItems} item${totalItems !== 1 ? "s" : ""}`;
}

/**
 * Parse page number from callback query
 * @param {String} callbackData - Callback data string
 * @param {String} prefix - Expected prefix
 * @returns {Number|null} Page number or null if invalid
 */
export function parsePageFromCallback(callbackData, prefix) {
  if (!callbackData || !callbackData.startsWith(prefix)) {
    return null;
  }

  const parts = callbackData.split(":");
  if (parts.length !== 2) {
    return null;
  }

  const page = parseInt(parts[1], 10);
  return isNaN(page) || page < 1 ? null : page;
}
