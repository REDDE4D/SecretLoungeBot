import {
  buildCategoryButtons,
  buildPermissionToggles,
  buildNavigationButtons,
  formatPermissionsList,
  PERMISSION_CATEGORIES,
} from '../../../utils/permissionButtons.js';
import * as roleService from '../../../services/roleService.js';
import { escapeHTML } from '../../../utils/sanitize.js';
import logger from '../../../utils/logger.js';

export const meta = {
  commands: ['role_create', 'newrole'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Create a custom role with interactive wizard',
  usage: '/role_create or /newrole',
  showInMenu: false,
};

// Store wizard sessions: userId -> wizardState
const wizardSessions = new Map();

// Wizard step constants
const STEP_NAME = 'NAME';
const STEP_DESCRIPTION = 'DESCRIPTION';
const STEP_ICON = 'ICON';
const STEP_COLOR = 'COLOR';
const STEP_PERMISSIONS = 'PERMISSIONS';
const STEP_CONFIRM = 'CONFIRM';

/**
 * Initialize a new wizard session
 */
function startWizard(userId) {
  wizardSessions.set(userId, {
    step: STEP_NAME,
    data: {
      name: null,
      description: null,
      icon: '👥',
      color: '#3B82F6',
      permissions: [],
    },
    messageId: null,
  });
}

/**
 * Get wizard session for user
 */
function getWizard(userId) {
  return wizardSessions.get(userId);
}

/**
 * Update wizard session
 */
function updateWizard(userId, updates) {
  const session = wizardSessions.get(userId);
  if (session) {
    Object.assign(session, updates);
  }
}

/**
 * Clear wizard session
 */
function clearWizard(userId) {
  wizardSessions.delete(userId);
}

/**
 * Show name input step
 */
async function showNameStep(ctx) {
  const message = [
    '🎭 <b>Create Custom Role - Step 1/5</b>',
    '',
    '📝 <b>Enter Role Name</b>',
    '',
    'What should this role be called?',
    '',
    '<i>Requirements:</i>',
    '• 2-32 characters',
    '• Must be unique',
    '• Letters, numbers, spaces, hyphens, underscores',
    '',
    '<i>Example: Support Team, Content Moderator, VIP Member</i>',
  ].join('\n');

  const keyboard = {
    inline_keyboard: buildNavigationButtons({
      showBack: false,
      showCancel: true,
      showDone: false,
    }),
  };

  return ctx.replyWithHTML(message, { reply_markup: keyboard });
}

/**
 * Show description input step
 */
async function showDescriptionStep(ctx, isEdit = false) {
  const wizard = getWizard(ctx.from.id);

  const message = [
    '🎭 <b>Create Custom Role - Step 2/5</b>',
    '',
    `📌 <b>Role:</b> ${escapeHTML(wizard.data.name)}`,
    '',
    '📝 <b>Enter Role Description</b>',
    '',
    'Provide a brief description of this role\'s purpose.',
    '',
    '<i>Requirements:</i>',
    '• 10-200 characters',
    '• Clear and concise',
    '',
    '<i>Example: Manages user reports and handles community moderation tasks.</i>',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [{ text: '« Back', callback_data: 'wizard_back' }],
      ...buildNavigationButtons({
        showBack: false,
        showCancel: true,
        showDone: false,
      }),
    ],
  };

  if (isEdit && wizard.messageId) {
    return ctx.telegram.editMessageText(
      ctx.chat.id,
      wizard.messageId,
      null,
      message,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  }

  const msg = await ctx.replyWithHTML(message, { reply_markup: keyboard });
  updateWizard(ctx.from.id, { messageId: msg.message_id });
  return msg;
}

/**
 * Show icon selection step
 */
async function showIconStep(ctx, isEdit = false) {
  const wizard = getWizard(ctx.from.id);

  const message = [
    '🎭 <b>Create Custom Role - Step 3/5</b>',
    '',
    `📌 <b>Role:</b> ${escapeHTML(wizard.data.name)}`,
    `📝 <b>Description:</b> ${escapeHTML(wizard.data.description)}`,
    '',
    '🎨 <b>Choose Role Icon (Optional)</b>',
    '',
    'Send an emoji to use as the role icon, or skip to use default 👥',
    '',
    '<i>Examples: 👮 🛡️ 💼 🎖️ ⭐ 🔧 📢</i>',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [{ text: '⏭️ Skip (Use Default 👥)', callback_data: 'wizard_skip_icon' }],
      [{ text: '« Back', callback_data: 'wizard_back' }],
      ...buildNavigationButtons({
        showBack: false,
        showCancel: true,
        showDone: false,
      }),
    ],
  };

  if (isEdit && wizard.messageId) {
    return ctx.telegram.editMessageText(
      ctx.chat.id,
      wizard.messageId,
      null,
      message,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  }

  const msg = await ctx.replyWithHTML(message, { reply_markup: keyboard });
  updateWizard(ctx.from.id, { messageId: msg.message_id });
  return msg;
}

/**
 * Show color selection step
 */
async function showColorStep(ctx, isEdit = false) {
  const wizard = getWizard(ctx.from.id);

  const message = [
    '🎭 <b>Create Custom Role - Step 4/5</b>',
    '',
    `📌 <b>Role:</b> ${wizard.data.icon} ${escapeHTML(wizard.data.name)}`,
    `📝 <b>Description:</b> ${escapeHTML(wizard.data.description)}`,
    '',
    '🎨 <b>Choose Role Color (Optional)</b>',
    '',
    'Select a color for this role, or skip to use default blue.',
  ].join('\n');

  const colorOptions = [
    [
      { text: '🔴 Red', callback_data: 'color_#EF4444' },
      { text: '🟠 Orange', callback_data: 'color_#F97316' },
      { text: '🟡 Yellow', callback_data: 'color_#EAB308' },
    ],
    [
      { text: '🟢 Green', callback_data: 'color_#22C55E' },
      { text: '🔵 Blue', callback_data: 'color_#3B82F6' },
      { text: '🟣 Purple', callback_data: 'color_#A855F7' },
    ],
    [
      { text: '🟤 Pink', callback_data: 'color_#EC4899' },
      { text: '⚫ Gray', callback_data: 'color_#6B7280' },
    ],
    [{ text: '⏭️ Skip (Use Default Blue)', callback_data: 'wizard_skip_color' }],
    [{ text: '« Back', callback_data: 'wizard_back' }],
    ...buildNavigationButtons({
      showBack: false,
      showCancel: true,
      showDone: false,
    }),
  ];

  const keyboard = { inline_keyboard: colorOptions };

  if (isEdit && wizard.messageId) {
    return ctx.telegram.editMessageText(
      ctx.chat.id,
      wizard.messageId,
      null,
      message,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  }

  const msg = await ctx.replyWithHTML(message, { reply_markup: keyboard });
  updateWizard(ctx.from.id, { messageId: msg.message_id });
  return msg;
}

/**
 * Show permission category selection
 */
async function showPermissionStep(ctx, isEdit = false) {
  const wizard = getWizard(ctx.from.id);

  const permCount = wizard.data.permissions.length;

  const message = [
    '🎭 <b>Create Custom Role - Step 5/5</b>',
    '',
    `📌 <b>Role:</b> ${wizard.data.icon} ${escapeHTML(wizard.data.name)}`,
    `🔐 <b>Permissions:</b> ${permCount} selected`,
    '',
    '🔐 <b>Select Permission Categories</b>',
    '',
    'Tap a category to view and toggle its permissions.',
    'When done, tap <b>Done</b> to review and create the role.',
  ].join('\n');

  const categoryButtons = buildCategoryButtons();
  const navButtons = buildNavigationButtons({
    showBack: true,
    showCancel: true,
    showDone: true,
    backData: 'wizard_back',
  });

  const keyboard = {
    inline_keyboard: [...categoryButtons, ...navButtons],
  };

  if (isEdit && wizard.messageId) {
    return ctx.telegram.editMessageText(
      ctx.chat.id,
      wizard.messageId,
      null,
      message,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  }

  const msg = await ctx.replyWithHTML(message, { reply_markup: keyboard });
  updateWizard(ctx.from.id, { messageId: msg.message_id });
  return msg;
}

/**
 * Show permission toggles for a category
 */
async function showCategoryPermissions(ctx, category) {
  const wizard = getWizard(ctx.from.id);
  const catInfo = PERMISSION_CATEGORIES[category];

  if (!catInfo) {
    return ctx.answerCbQuery('❌ Invalid category');
  }

  const permButtons = buildPermissionToggles(category, wizard.data.permissions);

  const message = [
    `🔐 <b>${catInfo.name} Permissions</b>`,
    '',
    'Tap permissions to toggle them on/off.',
    '✅ = Enabled | ☐ = Disabled',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      ...permButtons,
      [{ text: '« Back to Categories', callback_data: 'wizard_perms' }],
    ],
  };

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  await ctx.answerCbQuery();
}

/**
 * Show confirmation step
 */
async function showConfirmStep(ctx) {
  const wizard = getWizard(ctx.from.id);

  const permList = formatPermissionsList(wizard.data.permissions, true);

  const message = [
    '🎭 <b>Review New Role</b>',
    '',
    `<b>Name:</b> ${wizard.data.icon} ${escapeHTML(wizard.data.name)}`,
    `<b>Description:</b> ${escapeHTML(wizard.data.description)}`,
    `<b>Color:</b> ${wizard.data.color}`,
    '',
    `<b>Permissions:</b>`,
    permList,
    '',
    '⚠️ <i>Review carefully before creating.</i>',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Create Role', callback_data: 'wizard_create' },
        { text: '« Back', callback_data: 'wizard_back' },
      ],
      [{ text: '❌ Cancel', callback_data: 'cancel' }],
    ],
  };

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  await ctx.answerCbQuery();
}

/**
 * Create the role
 */
async function createRole(ctx) {
  const wizard = getWizard(ctx.from.id);

  try {
    const role = await roleService.createRole(
      {
        name: wizard.data.name,
        description: wizard.data.description,
        icon: wizard.data.icon,
        color: wizard.data.color,
        permissions: wizard.data.permissions,
      },
      String(ctx.from.id)
    );

    logger.logModeration('role_create', ctx.from.id, null, {
      roleId: role.roleId,
      roleName: role.name,
      permissionCount: role.permissions.length,
    });

    const message = [
      '✅ <b>Role Created Successfully!</b>',
      '',
      `<b>Role ID:</b> <code>${role.roleId}</code>`,
      `<b>Name:</b> ${role.icon} ${escapeHTML(role.name)}`,
      `<b>Permissions:</b> ${role.permissions.length}`,
      '',
      'Use <code>/setrole @user ' + role.roleId + '</code> to assign this role.',
    ].join('\n');

    await ctx.editMessageText(message, { parse_mode: 'HTML' });
    clearWizard(ctx.from.id);
    await ctx.answerCbQuery('✅ Role created!');
  } catch (err) {
    await ctx.answerCbQuery('❌ Failed to create role');
    await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
  }
}

/**
 * Handle text input during wizard
 */
async function handleWizardInput(ctx) {
  const wizard = getWizard(ctx.from.id);
  if (!wizard) return; // Not in wizard

  const text = ctx.message.text.trim();

  try {
    if (wizard.step === STEP_NAME) {
      // Validate name
      if (text.length < 2 || text.length > 32) {
        return ctx.reply('❌ Name must be 2-32 characters.');
      }

      if (!/^[a-zA-Z0-9\s\-_]+$/.test(text)) {
        return ctx.reply('❌ Name can only contain letters, numbers, spaces, hyphens, and underscores.');
      }

      // Check if name exists
      const existing = await roleService.getRoleByName(text);
      if (existing) {
        return ctx.reply('❌ A role with this name already exists.');
      }

      wizard.data.name = text;
      wizard.step = STEP_DESCRIPTION;
      updateWizard(ctx.from.id, wizard);

      await showDescriptionStep(ctx);
    } else if (wizard.step === STEP_DESCRIPTION) {
      // Validate description
      if (text.length < 10 || text.length > 200) {
        return ctx.reply('❌ Description must be 10-200 characters.');
      }

      wizard.data.description = text;
      wizard.step = STEP_ICON;
      updateWizard(ctx.from.id, wizard);

      await showIconStep(ctx);
    } else if (wizard.step === STEP_ICON) {
      // Check if it's an emoji (very basic check)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      if (emojiRegex.test(text) && text.length <= 4) {
        wizard.data.icon = text;
      } else {
        return ctx.reply('❌ Please send a single emoji, or click Skip.');
      }

      wizard.step = STEP_COLOR;
      updateWizard(ctx.from.id, wizard);

      await showColorStep(ctx);
    }
  } catch (err) {
    ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
  }
}

export function register(bot) {
  // Command to start wizard
  bot.command(['role_create', 'newrole'], async (ctx) => {
    startWizard(ctx.from.id);
    await showNameStep(ctx);
  });

  // Handle wizard text input
  bot.on('text', async (ctx, next) => {
    const wizard = getWizard(ctx.from.id);
    if (wizard) {
      await handleWizardInput(ctx);
    } else {
      return next();
    }
  });

  // Category selection
  bot.action(/^cat_(.+)$/, async (ctx) => {
    const category = ctx.match[1];
    await showCategoryPermissions(ctx, category);
  });

  // Permission toggle
  bot.action(/^perm_(.+)$/, async (ctx) => {
    const permission = ctx.match[1];
    const wizard = getWizard(ctx.from.id);

    if (!wizard) {
      return ctx.answerCbQuery('❌ Wizard session expired');
    }

    // Toggle permission
    const idx = wizard.data.permissions.indexOf(permission);
    if (idx >= 0) {
      wizard.data.permissions.splice(idx, 1);
    } else {
      wizard.data.permissions.push(permission);
    }

    updateWizard(ctx.from.id, wizard);

    // Extract category from permission (e.g., "users.ban" -> "users")
    const category = permission.split('.')[0];
    await showCategoryPermissions(ctx, category);
  });

  // Back to permission categories
  bot.action('wizard_perms', async (ctx) => {
    await showPermissionStep(ctx, true);
    await ctx.answerCbQuery();
  });

  // Skip icon
  bot.action('wizard_skip_icon', async (ctx) => {
    const wizard = getWizard(ctx.from.id);
    wizard.step = STEP_COLOR;
    updateWizard(ctx.from.id, wizard);

    await showColorStep(ctx, true);
    await ctx.answerCbQuery();
  });

  // Skip color
  bot.action('wizard_skip_color', async (ctx) => {
    const wizard = getWizard(ctx.from.id);
    wizard.step = STEP_PERMISSIONS;
    updateWizard(ctx.from.id, wizard);

    await showPermissionStep(ctx, true);
    await ctx.answerCbQuery();
  });

  // Color selection
  bot.action(/^color_(.+)$/, async (ctx) => {
    const color = ctx.match[1];
    const wizard = getWizard(ctx.from.id);

    wizard.data.color = color;
    wizard.step = STEP_PERMISSIONS;
    updateWizard(ctx.from.id, wizard);

    await showPermissionStep(ctx, true);
    await ctx.answerCbQuery();
  });

  // Back button
  bot.action('wizard_back', async (ctx) => {
    const wizard = getWizard(ctx.from.id);
    if (!wizard) {
      return ctx.answerCbQuery('❌ Wizard session expired');
    }

    // Move to previous step
    if (wizard.step === STEP_DESCRIPTION) {
      wizard.step = STEP_NAME;
      clearWizard(ctx.from.id);
      await ctx.deleteMessage();
      await showNameStep(ctx);
    } else if (wizard.step === STEP_ICON) {
      wizard.step = STEP_DESCRIPTION;
      updateWizard(ctx.from.id, wizard);
      await showDescriptionStep(ctx, true);
    } else if (wizard.step === STEP_COLOR) {
      wizard.step = STEP_ICON;
      updateWizard(ctx.from.id, wizard);
      await showIconStep(ctx, true);
    } else if (wizard.step === STEP_PERMISSIONS) {
      wizard.step = STEP_COLOR;
      updateWizard(ctx.from.id, wizard);
      await showColorStep(ctx, true);
    } else if (wizard.step === STEP_CONFIRM) {
      wizard.step = STEP_PERMISSIONS;
      updateWizard(ctx.from.id, wizard);
      await showPermissionStep(ctx, true);
    }

    await ctx.answerCbQuery();
  });

  // Done button (move to confirmation)
  bot.action('done', async (ctx) => {
    const wizard = getWizard(ctx.from.id);
    if (!wizard) {
      return ctx.answerCbQuery('❌ Wizard session expired');
    }

    wizard.step = STEP_CONFIRM;
    updateWizard(ctx.from.id, wizard);

    await showConfirmStep(ctx);
  });

  // Create button
  bot.action('wizard_create', async (ctx) => {
    await createRole(ctx);
  });

  // Cancel button
  bot.action('cancel', async (ctx) => {
    clearWizard(ctx.from.id);
    await ctx.editMessageText('❌ Role creation cancelled.', { parse_mode: 'HTML' });
    await ctx.answerCbQuery('Cancelled');
  });
}
