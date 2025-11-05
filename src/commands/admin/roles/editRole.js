import * as roleService from '../../../services/roleService.js';
import {
  buildEditOptionsButtons,
  buildCategoryButtons,
  buildPermissionToggles,
  buildNavigationButtons,
  formatPermissionsList,
  PERMISSION_CATEGORIES,
} from '../../../utils/permissionButtons.js';
import { escapeHTML } from '../../../utils/sanitize.js';
import logger from '../../../utils/logger.js';

export const meta = {
  commands: ['role_edit'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Edit a custom role',
  usage: '/role_edit <role_name or role_id>',
  showInMenu: false,
};

// Store edit sessions: userId -> editState
const editSessions = new Map();

const EDIT_MODE_NAME = 'NAME';
const EDIT_MODE_DESCRIPTION = 'DESCRIPTION';
const EDIT_MODE_ICON = 'ICON';
const EDIT_MODE_COLOR = 'COLOR';

/**
 * Start an edit session
 */
function startEditSession(userId, roleId, mode = null) {
  editSessions.set(userId, {
    roleId,
    mode,
    messageId: null,
  });
}

/**
 * Get edit session
 */
function getEditSession(userId) {
  return editSessions.get(userId);
}

/**
 * Update edit session
 */
function updateEditSession(userId, updates) {
  const session = editSessions.get(userId);
  if (session) {
    Object.assign(session, updates);
  }
}

/**
 * Clear edit session
 */
function clearEditSession(userId) {
  editSessions.delete(userId);
}

/**
 * Show edit options menu
 */
async function showEditMenu(ctx, roleId, isEdit = false) {
  try {
    const role = await roleService.getRoleById(roleId);

    if (!role) {
      if (isEdit) {
        await ctx.answerCbQuery('❌ Role not found');
      }
      return ctx.reply('❌ Role not found.');
    }

    if (role.isSystemRole) {
      if (isEdit) {
        await ctx.answerCbQuery('❌ Cannot edit system roles');
      }
      return ctx.reply('❌ Cannot edit system roles.');
    }

    const message = [
      `✏️ <b>Edit Role: ${role.icon || '👥'} ${escapeHTML(role.name)}</b>`,
      '',
      `<b>Current Settings:</b>`,
      `• Name: ${escapeHTML(role.name)}`,
      `• Description: ${escapeHTML(role.description || 'No description')}`,
      `• Icon: ${role.icon || '👥'}`,
      `• Color: ${role.color || '#3B82F6'}`,
      `• Permissions: ${role.permissions ? role.permissions.length : 0}`,
      '',
      'Select what you want to edit:',
    ].join('\n');

    const keyboard = {
      inline_keyboard: buildEditOptionsButtons(roleId),
    };

    if (isEdit) {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithHTML(message, { reply_markup: keyboard });
    }
  } catch (err) {
    if (isEdit) {
      await ctx.answerCbQuery('❌ Error loading role');
    }
    await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
  }
}

/**
 * Prompt for name edit
 */
async function promptNameEdit(ctx, roleId) {
  const role = await roleService.getRoleById(roleId);

  const message = [
    `✏️ <b>Edit Role Name</b>`,
    '',
    `<b>Current name:</b> ${escapeHTML(role.name)}`,
    '',
    'Send the new role name:',
    '',
    '<i>Requirements:</i>',
    '• 2-32 characters',
    '• Must be unique',
    '• Letters, numbers, spaces, hyphens, underscores',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [[{ text: '❌ Cancel', callback_data: `edit_${roleId}` }]],
  };

  startEditSession(ctx.from.id, roleId, EDIT_MODE_NAME);
  const msg = await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  updateEditSession(ctx.from.id, { messageId: msg.message_id });
  await ctx.answerCbQuery();
}

/**
 * Prompt for description edit
 */
async function promptDescriptionEdit(ctx, roleId) {
  const role = await roleService.getRoleById(roleId);

  const message = [
    `✏️ <b>Edit Role Description</b>`,
    '',
    `<b>Current description:</b> ${escapeHTML(role.description || 'No description')}`,
    '',
    'Send the new role description:',
    '',
    '<i>Requirements:</i>',
    '• 10-200 characters',
    '• Clear and concise',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [[{ text: '❌ Cancel', callback_data: `edit_${roleId}` }]],
  };

  startEditSession(ctx.from.id, roleId, EDIT_MODE_DESCRIPTION);
  const msg = await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  updateEditSession(ctx.from.id, { messageId: msg.message_id });
  await ctx.answerCbQuery();
}

/**
 * Prompt for icon edit
 */
async function promptIconEdit(ctx, roleId) {
  const role = await roleService.getRoleById(roleId);

  const message = [
    `🎨 <b>Edit Role Icon</b>`,
    '',
    `<b>Current icon:</b> ${role.icon || '👥'}`,
    '',
    'Send an emoji to use as the new role icon:',
    '',
    '<i>Examples: 👮 🛡️ 💼 🎖️ ⭐ 🔧 📢</i>',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [[{ text: '❌ Cancel', callback_data: `edit_${roleId}` }]],
  };

  startEditSession(ctx.from.id, roleId, EDIT_MODE_ICON);
  const msg = await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  updateEditSession(ctx.from.id, { messageId: msg.message_id });
  await ctx.answerCbQuery();
}

/**
 * Show color selection
 */
async function showColorSelection(ctx, roleId) {
  const role = await roleService.getRoleById(roleId);

  const message = [
    `🎨 <b>Edit Role Color</b>`,
    '',
    `<b>Current color:</b> ${role.color || '#3B82F6'}`,
    '',
    'Select a new color:',
  ].join('\n');

  const colorOptions = [
    [
      { text: '🔴 Red', callback_data: `editcolor_${roleId}_#EF4444` },
      { text: '🟠 Orange', callback_data: `editcolor_${roleId}_#F97316` },
      { text: '🟡 Yellow', callback_data: `editcolor_${roleId}_#EAB308` },
    ],
    [
      { text: '🟢 Green', callback_data: `editcolor_${roleId}_#22C55E` },
      { text: '🔵 Blue', callback_data: `editcolor_${roleId}_#3B82F6` },
      { text: '🟣 Purple', callback_data: `editcolor_${roleId}_#A855F7` },
    ],
    [
      { text: '🟤 Pink', callback_data: `editcolor_${roleId}_#EC4899` },
      { text: '⚫ Gray', callback_data: `editcolor_${roleId}_#6B7280` },
    ],
    [{ text: '❌ Cancel', callback_data: `edit_${roleId}` }],
  ];

  const keyboard = { inline_keyboard: colorOptions };

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  await ctx.answerCbQuery();
}

/**
 * Show permission management interface
 */
async function showPermissionManagement(ctx, roleId) {
  const role = await roleService.getRoleById(roleId);

  const permCount = role.permissions ? role.permissions.length : 0;

  const message = [
    `🔐 <b>Manage Permissions: ${role.icon || '👥'} ${escapeHTML(role.name)}</b>`,
    '',
    `<b>Current permissions:</b> ${permCount}`,
    '',
    'Select a category to view and toggle permissions:',
  ].join('\n');

  const categoryButtons = buildCategoryButtons();

  // Update callback data to use editcat_ prefix
  const editCategoryButtons = categoryButtons.map(row =>
    row.map(btn => ({
      ...btn,
      callback_data: btn.callback_data.replace('cat_', `editcat_${roleId}_`)
    }))
  );

  const navButtons = [
    [
      { text: '💾 Save Changes', callback_data: `save_perms_${roleId}` },
      { text: '❌ Cancel', callback_data: `edit_${roleId}` },
    ],
  ];

  const keyboard = {
    inline_keyboard: [...editCategoryButtons, ...navButtons],
  };

  // Store current permissions in session for editing
  startEditSession(ctx.from.id, roleId, 'PERMISSIONS');
  updateEditSession(ctx.from.id, { permissions: [...(role.permissions || [])] });

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  await ctx.answerCbQuery();
}

/**
 * Show category permissions for editing
 */
async function showEditCategoryPermissions(ctx, roleId, category) {
  const session = getEditSession(ctx.from.id);
  if (!session) {
    return ctx.answerCbQuery('❌ Edit session expired');
  }

  const catInfo = PERMISSION_CATEGORIES[category];
  if (!catInfo) {
    return ctx.answerCbQuery('❌ Invalid category');
  }

  const permButtons = buildPermissionToggles(category, session.permissions || []);

  // Update callback data to use editperm_ prefix
  const editPermButtons = permButtons.map(row =>
    row.map(btn => ({
      ...btn,
      callback_data: btn.callback_data.replace('perm_', `editperm_${roleId}_`)
    }))
  );

  const message = [
    `🔐 <b>${catInfo.name} Permissions</b>`,
    '',
    'Tap permissions to toggle them on/off.',
    '✅ = Enabled | ☐ = Disabled',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      ...editPermButtons,
      [{ text: '« Back to Categories', callback_data: `edit_perms_${roleId}` }],
    ],
  };

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  await ctx.answerCbQuery();
}

/**
 * Handle text input during edit session
 */
async function handleEditInput(ctx) {
  const session = getEditSession(ctx.from.id);
  if (!session) return; // Not in edit session

  const text = ctx.message.text.trim();

  try {
    const role = await roleService.getRoleById(session.roleId);
    if (!role) {
      clearEditSession(ctx.from.id);
      return ctx.reply('❌ Role not found.');
    }

    if (session.mode === EDIT_MODE_NAME) {
      // Validate name
      if (text.length < 2 || text.length > 32) {
        return ctx.reply('❌ Name must be 2-32 characters.');
      }

      if (!/^[a-zA-Z0-9\s\-_]+$/.test(text)) {
        return ctx.reply('❌ Name can only contain letters, numbers, spaces, hyphens, and underscores.');
      }

      // Check if name exists (and is not this role)
      const existing = await roleService.getRoleByName(text);
      if (existing && existing.roleId !== session.roleId) {
        return ctx.reply('❌ A role with this name already exists.');
      }

      await roleService.updateRole(session.roleId, { name: text });

      logger.logModeration('role_edit_name', ctx.from.id, null, {
        roleId: session.roleId,
        oldName: role.name,
        newName: text,
      });

      clearEditSession(ctx.from.id);
      await ctx.reply(`✅ Role name updated to: ${escapeHTML(text)}`, { parse_mode: 'HTML' });
      await showEditMenu(ctx, session.roleId, false);
    } else if (session.mode === EDIT_MODE_DESCRIPTION) {
      // Validate description
      if (text.length < 10 || text.length > 200) {
        return ctx.reply('❌ Description must be 10-200 characters.');
      }

      await roleService.updateRole(session.roleId, { description: text });

      logger.logModeration('role_edit_description', ctx.from.id, null, {
        roleId: session.roleId,
      });

      clearEditSession(ctx.from.id);
      await ctx.reply('✅ Role description updated.', { parse_mode: 'HTML' });
      await showEditMenu(ctx, session.roleId, false);
    } else if (session.mode === EDIT_MODE_ICON) {
      // Check if it's an emoji
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      if (!emojiRegex.test(text) || text.length > 4) {
        return ctx.reply('❌ Please send a single emoji.');
      }

      await roleService.updateRole(session.roleId, { icon: text });

      logger.logModeration('role_edit_icon', ctx.from.id, null, {
        roleId: session.roleId,
        newIcon: text,
      });

      clearEditSession(ctx.from.id);
      await ctx.reply(`✅ Role icon updated to: ${text}`, { parse_mode: 'HTML' });
      await showEditMenu(ctx, session.roleId, false);
    }
  } catch (err) {
    await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
  }
}

export function register(bot) {
  // Command to start editing
  bot.command('role_edit', async (ctx) => {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    const roleIdentifier = args.join(' ');

    if (!roleIdentifier) {
      return ctx.reply('Usage: /role_edit <role_name or role_id>');
    }

    try {
      // Try to find by ID first, then by name
      let role = await roleService.getRoleById(roleIdentifier);
      if (!role) {
        role = await roleService.getRoleByName(roleIdentifier);
      }

      if (!role) {
        return ctx.reply('❌ Role not found. Use /role_list to see all roles.');
      }

      await showEditMenu(ctx, role.roleId, false);
    } catch (err) {
      await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
    }
  });

  // Handle text input during edit
  bot.on('text', async (ctx, next) => {
    const session = getEditSession(ctx.from.id);
    if (session) {
      await handleEditInput(ctx);
    } else {
      return next();
    }
  });

  // Handle edit button from role info/list
  bot.action(/^edit_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await showEditMenu(ctx, roleId, true);
  });

  // Handle edit name button
  bot.action(/^edit_name_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await promptNameEdit(ctx, roleId);
  });

  // Handle edit description button
  bot.action(/^edit_desc_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await promptDescriptionEdit(ctx, roleId);
  });

  // Handle edit icon button
  bot.action(/^edit_icon_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await promptIconEdit(ctx, roleId);
  });

  // Handle edit color button
  bot.action(/^edit_color_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await showColorSelection(ctx, roleId);
  });

  // Handle color selection
  bot.action(/^editcolor_(.+)_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    const color = ctx.match[2];

    try {
      await roleService.updateRole(roleId, { color });

      logger.logModeration('role_edit_color', ctx.from.id, null, {
        roleId,
        newColor: color,
      });

      await ctx.answerCbQuery('✅ Color updated');
      await showEditMenu(ctx, roleId, true);
    } catch (err) {
      await ctx.answerCbQuery('❌ Failed to update color');
    }
  });

  // Handle edit permissions button
  bot.action(/^edit_perms_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await showPermissionManagement(ctx, roleId);
  });

  // Handle category selection in permission edit
  bot.action(/^editcat_(.+)_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    const category = ctx.match[2];
    await showEditCategoryPermissions(ctx, roleId, category);
  });

  // Handle permission toggle in edit mode
  bot.action(/^editperm_(.+)_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    const permission = ctx.match[2];
    const session = getEditSession(ctx.from.id);

    if (!session) {
      return ctx.answerCbQuery('❌ Edit session expired');
    }

    // Toggle permission in session
    const idx = session.permissions.indexOf(permission);
    if (idx >= 0) {
      session.permissions.splice(idx, 1);
    } else {
      session.permissions.push(permission);
    }

    updateEditSession(ctx.from.id, session);

    // Extract category from permission
    const category = permission.split('.')[0];
    await showEditCategoryPermissions(ctx, roleId, category);
  });

  // Handle save permissions
  bot.action(/^save_perms_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    const session = getEditSession(ctx.from.id);

    if (!session) {
      return ctx.answerCbQuery('❌ Edit session expired');
    }

    try {
      await roleService.setRolePermissions(roleId, session.permissions);

      logger.logModeration('role_edit_permissions', ctx.from.id, null, {
        roleId,
        permissionCount: session.permissions.length,
      });

      clearEditSession(ctx.from.id);
      await ctx.answerCbQuery('✅ Permissions saved');
      await showEditMenu(ctx, roleId, true);
    } catch (err) {
      await ctx.answerCbQuery('❌ Failed to save permissions');
      await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
    }
  });
}
