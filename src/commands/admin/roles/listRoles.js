import * as roleService from '../../../services/roleService.js';
import {
  buildRoleActionButtons,
  formatPermissionsList,
  PERMISSION_CATEGORIES,
} from '../../../utils/permissionButtons.js';
import { escapeHTML } from '../../../utils/sanitize.js';
import { paginate, buildPaginationKeyboard, getPaginationFooter } from '../../../utils/pagination.js';

export const meta = {
  commands: ['role_list', 'roles', 'role_info'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'List and view role information',
  usage: '/role_list or /roles or /role_info <role_name>',
  showInMenu: false,
};

/**
 * Show paginated roles list
 */
async function showRolesListPage(ctx, page = 1, isEdit = false) {
  const allRoles = await roleService.getAllRoles();

  if (!allRoles.length) {
    const message = 'ℹ️ No custom roles created yet.';
    if (isEdit) {
      await ctx.editMessageText(message, { parse_mode: 'HTML' });
    } else {
      await ctx.replyWithHTML(message);
    }
    return;
  }

  // Paginate roles
  const paginationResult = paginate(allRoles, page, 5);
  const { items, currentPage, totalPages, totalItems } = paginationResult;

  // Build role list
  const roleLines = await Promise.all(
    items.map(async (role) => {
      const userCount = await roleService.getUsersWithRole(role.roleId);
      const permCount = role.permissions ? role.permissions.length : 0;
      const type = role.isSystemRole ? 'System' : 'Custom';

      return [
        `${role.icon || '👥'} <b>${escapeHTML(role.name)}</b>`,
        `  Type: ${type} | Users: ${userCount.length} | Permissions: ${permCount}`,
        `  ID: <code>${role.roleId}</code>`,
      ].join('\n');
    })
  );

  let message = ['👥 <b>All Roles</b>', '', ...roleLines].join('\n');
  message += getPaginationFooter(currentPage, totalPages, totalItems);

  // Build role action buttons
  const roleButtons = items.map((role) => {
    const buttons = [
      { text: `${role.icon || '👥'} ${role.name}`, callback_data: `info_${role.roleId}` },
    ];

    if (!role.isSystemRole) {
      buttons.push({ text: '✏️', callback_data: `edit_${role.roleId}` });
      buttons.push({ text: '🗑️', callback_data: `delete_${role.roleId}` });
    }

    return buttons;
  });

  // Add pagination
  const paginationButtons = buildPaginationKeyboard('roles_page', currentPage, totalPages);

  const keyboard = {
    inline_keyboard: [...roleButtons, ...paginationButtons],
  };

  const options = {
    parse_mode: 'HTML',
    reply_markup: keyboard.inline_keyboard.length > 0 ? keyboard : undefined,
  };

  if (isEdit) {
    await ctx.editMessageText(message, options);
  } else {
    await ctx.replyWithHTML(message, options);
  }
}

/**
 * Show detailed role information
 */
async function showRoleInfo(ctx, roleId, isEdit = false) {
  try {
    const role = await roleService.getRoleById(roleId);

    if (!role) {
      await ctx.answerCbQuery('❌ Role not found');
      return;
    }

    const users = await roleService.getUsersWithRole(roleId);
    const permList = formatPermissionsList(role.permissions || [], true);

    const message = [
      `${role.icon || '👥'} <b>${escapeHTML(role.name)}</b>`,
      '',
      `<b>Description:</b> ${escapeHTML(role.description || 'No description')}`,
      `<b>Role ID:</b> <code>${role.roleId}</code>`,
      `<b>Type:</b> ${role.isSystemRole ? 'System Role' : 'Custom Role'}`,
      `<b>Color:</b> ${role.color || '#3B82F6'}`,
      '',
      `<b>Users:</b> ${users.length}`,
      users.length > 0 ? `  <i>Use /whohas ${role.roleId} to view users</i>` : '',
      '',
      `<b>Permissions:</b>`,
      permList || '  <i>No permissions assigned</i>',
    ]
      .filter(Boolean)
      .join('\n');

    // Build action buttons
    const buttons = [];

    if (users.length > 0) {
      buttons.push([{ text: '👥 View Users', callback_data: `whohas_${roleId}` }]);
    }

    if (!role.isSystemRole) {
      buttons.push([
        { text: '✏️ Edit', callback_data: `edit_${roleId}` },
        { text: '🗑️ Delete', callback_data: `delete_${roleId}` },
      ]);
    }

    buttons.push([{ text: '« Back to List', callback_data: 'role_list' }]);

    // Add creation info for custom roles
    let footer = '';
    if (!role.isSystemRole && role.createdBy) {
      const createdDate = role.createdAt ? new Date(role.createdAt).toLocaleDateString() : 'Unknown';
      footer = `\n\n<i>Created: ${createdDate}</i>`;
    }

    const fullMessage = message + footer;

    const keyboard = { inline_keyboard: buttons };

    if (isEdit) {
      await ctx.editMessageText(fullMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.replyWithHTML(fullMessage, { reply_markup: keyboard });
    }

    if (isEdit) {
      await ctx.answerCbQuery();
    }
  } catch (err) {
    if (isEdit) {
      await ctx.answerCbQuery('❌ Error loading role');
    }
    await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
  }
}

/**
 * Show users with a specific role
 */
async function showUsersWithRole(ctx, roleId) {
  try {
    const role = await roleService.getRoleById(roleId);
    if (!role) {
      return ctx.answerCbQuery('❌ Role not found');
    }

    const users = await roleService.getUsersWithRole(roleId);

    if (users.length === 0) {
      await ctx.answerCbQuery('No users with this role');
      return;
    }

    const userLines = users.map((user) => {
      return `• ${user.icon?.fallback || '👤'} ${escapeHTML(user.alias || 'Unknown')} (<code>${user._id}</code>)`;
    });

    const message = [
      `👥 <b>Users with ${role.icon || '👥'} ${escapeHTML(role.name)}</b>`,
      '',
      ...userLines,
      '',
      `<i>Total: ${users.length} user${users.length !== 1 ? 's' : ''}</i>`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [[{ text: '« Back to Role', callback_data: `info_${roleId}` }]],
    };

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    await ctx.answerCbQuery();
  } catch (err) {
    await ctx.answerCbQuery('❌ Error loading users');
    await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
  }
}

export function register(bot) {
  // List all roles
  bot.command(['role_list', 'roles'], async (ctx) => {
    await showRolesListPage(ctx, 1);
  });

  // Show specific role info
  bot.command('role_info', async (ctx) => {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    const roleIdentifier = args.join(' ');

    if (!roleIdentifier) {
      return ctx.reply('Usage: /role_info <role_name or role_id>');
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

      await showRoleInfo(ctx, role.roleId, false);
    } catch (err) {
      await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
    }
  });

  // Handle pagination for role list
  bot.action(/^roles_page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await showRolesListPage(ctx, page, true);
    await ctx.answerCbQuery();
  });

  // Handle role info button
  bot.action(/^info_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await showRoleInfo(ctx, roleId, true);
  });

  // Handle "back to list" button
  bot.action('role_list', async (ctx) => {
    await showRolesListPage(ctx, 1, true);
    await ctx.answerCbQuery();
  });

  // Handle "who has" button
  bot.action(/^whohas_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await showUsersWithRole(ctx, roleId);
  });
}
