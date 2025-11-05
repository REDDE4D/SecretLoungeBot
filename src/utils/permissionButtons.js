import { PERMISSIONS } from '../../dashboard-api/config/permissions.js';

/**
 * Permission UI Helper Utilities
 * Provides functions to build interactive buttons for permission management
 */

/**
 * Permission categories with emojis and display names
 */
export const PERMISSION_CATEGORIES = {
  dashboard: { emoji: '📊', name: 'Dashboard', icon: '📊 Dashboard' },
  stats: { emoji: '📈', name: 'Statistics', icon: '📈 Statistics' },
  users: { emoji: '👥', name: 'Users', icon: '👥 Users' },
  settings: { emoji: '⚙️', name: 'Settings', icon: '⚙️ Settings' },
  content: { emoji: '📝', name: 'Content', icon: '📝 Content' },
  moderation: { emoji: '🔨', name: 'Moderation', icon: '🔨 Moderation' },
  permissions: { emoji: '🔐', name: 'Permissions', icon: '🔐 Permissions' },
};

/**
 * Group permissions by category
 * @returns {Object} Permissions grouped by category
 */
export function groupPermissionsByCategory() {
  const grouped = {};

  for (const [key, permission] of Object.entries(PERMISSIONS)) {
    const [category, action] = permission.split('.');

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push({
      id: permission,
      key: key,
      action: action,
      displayName: formatPermissionName(action),
    });
  }

  return grouped;
}

/**
 * Format permission action name for display
 * @param {string} action - Permission action (e.g., "view_details")
 * @returns {string} Formatted name (e.g., "View Details")
 */
function formatPermissionName(action) {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Build category selection buttons
 * @returns {Array} Array of button rows for Telegram inline keyboard
 */
export function buildCategoryButtons() {
  const buttons = [];
  const categories = Object.keys(PERMISSION_CATEGORIES);

  // Create rows of 2 buttons each
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];

    for (let j = 0; j < 2 && i + j < categories.length; j++) {
      const category = categories[i + j];
      const info = PERMISSION_CATEGORIES[category];

      row.push({
        text: info.icon,
        callback_data: `cat_${category}`,
      });
    }

    buttons.push(row);
  }

  return buttons;
}

/**
 * Build permission toggle buttons for a specific category
 * @param {string} category - Permission category
 * @param {Array<string>} selectedPermissions - Currently selected permission IDs
 * @returns {Array} Array of button rows for Telegram inline keyboard
 */
export function buildPermissionToggles(category, selectedPermissions = []) {
  const grouped = groupPermissionsByCategory();
  const permissions = grouped[category] || [];

  const buttons = permissions.map(perm => {
    const isSelected = selectedPermissions.includes(perm.id);
    const checkbox = isSelected ? '✅' : '☐';

    return [{
      text: `${checkbox} ${perm.displayName}`,
      callback_data: `perm_${perm.id}`,
    }];
  });

  return buttons;
}

/**
 * Build navigation buttons (Back, Cancel, Done, Save)
 * @param {Object} options - Navigation options
 * @param {boolean} options.showBack - Show back button
 * @param {boolean} options.showCancel - Show cancel button
 * @param {boolean} options.showDone - Show done button
 * @param {boolean} options.showSave - Show save button
 * @param {string} options.backData - Callback data for back button
 * @returns {Array} Button row
 */
export function buildNavigationButtons(options = {}) {
  const {
    showBack = true,
    showCancel = true,
    showDone = false,
    showSave = false,
    backData = 'back',
  } = options;

  const buttons = [];

  if (showBack) {
    buttons.push({ text: '« Back', callback_data: backData });
  }

  if (showCancel) {
    buttons.push({ text: '❌ Cancel', callback_data: 'cancel' });
  }

  if (showDone) {
    buttons.push({ text: '✅ Done', callback_data: 'done' });
  }

  if (showSave) {
    buttons.push({ text: '💾 Save', callback_data: 'save' });
  }

  return [buttons];
}

/**
 * Paginate buttons into pages
 * @param {Array} buttons - Array of button rows
 * @param {number} page - Current page (0-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Object} { buttons: paginatedButtons, totalPages, currentPage }
 */
export function paginateButtons(buttons, page = 0, pageSize = 5) {
  const totalPages = Math.ceil(buttons.length / pageSize);
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));

  const start = currentPage * pageSize;
  const end = start + pageSize;
  const paginatedButtons = buttons.slice(start, end);

  // Add pagination controls if needed
  if (totalPages > 1) {
    const paginationRow = [];

    if (currentPage > 0) {
      paginationRow.push({
        text: '◀️ Previous',
        callback_data: `page_${currentPage - 1}`,
      });
    }

    paginationRow.push({
      text: `${currentPage + 1}/${totalPages}`,
      callback_data: 'page_info',
    });

    if (currentPage < totalPages - 1) {
      paginationRow.push({
        text: 'Next ▶️',
        callback_data: `page_${currentPage + 1}`,
      });
    }

    paginatedButtons.push(paginationRow);
  }

  return {
    buttons: paginatedButtons,
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages - 1,
    hasPrev: currentPage > 0,
  };
}

/**
 * Build role selection buttons from a list of roles
 * @param {Array} roles - Array of role objects
 * @param {string} actionPrefix - Callback data prefix (e.g., 'view_role_', 'edit_role_')
 * @returns {Array} Array of button rows
 */
export function buildRoleButtons(roles, actionPrefix = 'role_') {
  return roles.map(role => [{
    text: `${role.icon || '👥'} ${role.name}`,
    callback_data: `${actionPrefix}${role.roleId}`,
  }]);
}

/**
 * Build action buttons for a role (Info, Edit, Delete)
 * @param {string} roleId - Role ID
 * @param {boolean} isSystemRole - Whether this is a system role
 * @returns {Array} Array of button rows
 */
export function buildRoleActionButtons(roleId, isSystemRole = false) {
  const buttons = [
    { text: 'ℹ️ Info', callback_data: `info_${roleId}` },
  ];

  if (!isSystemRole) {
    buttons.push(
      { text: '✏️ Edit', callback_data: `edit_${roleId}` },
      { text: '🗑️ Delete', callback_data: `delete_${roleId}` }
    );
  }

  return [buttons];
}

/**
 * Build edit options buttons for a role
 * @param {string} roleId - Role ID
 * @returns {Array} Array of button rows
 */
export function buildEditOptionsButtons(roleId) {
  return [
    [
      { text: '✏️ Edit Name', callback_data: `edit_name_${roleId}` },
      { text: '✏️ Edit Description', callback_data: `edit_desc_${roleId}` },
    ],
    [
      { text: '🎨 Change Color', callback_data: `edit_color_${roleId}` },
      { text: '🎭 Change Icon', callback_data: `edit_icon_${roleId}` },
    ],
    [
      { text: '🔐 Manage Permissions', callback_data: `edit_perms_${roleId}` },
    ],
    [
      { text: '« Back to Role', callback_data: `info_${roleId}` },
      { text: '❌ Cancel', callback_data: 'cancel' },
    ],
  ];
}

/**
 * Format permissions list for display
 * @param {Array<string>} permissions - Array of permission IDs
 * @param {boolean} detailed - Show detailed permission names
 * @returns {string} Formatted permission list
 */
export function formatPermissionsList(permissions, detailed = false) {
  if (!permissions || permissions.length === 0) {
    return 'No permissions';
  }

  if (!detailed) {
    return `${permissions.length} permission${permissions.length !== 1 ? 's' : ''}`;
  }

  const grouped = {};

  for (const perm of permissions) {
    const [category, action] = perm.split('.');
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(formatPermissionName(action));
  }

  const lines = [];
  for (const [category, actions] of Object.entries(grouped)) {
    const catInfo = PERMISSION_CATEGORIES[category];
    if (catInfo) {
      lines.push(`\n${catInfo.emoji} ${catInfo.name}:`);
      actions.forEach(action => {
        lines.push(`  • ${action}`);
      });
    }
  }

  return lines.join('\n');
}

/**
 * Get permission count by category
 * @param {Array<string>} permissions - Array of permission IDs
 * @returns {Object} Category counts
 */
export function getPermissionCountsByCategory(permissions) {
  const counts = {};

  for (const perm of permissions) {
    const [category] = perm.split('.');
    counts[category] = (counts[category] || 0) + 1;
  }

  return counts;
}
