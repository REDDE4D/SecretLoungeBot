import * as roleService from '../../services/roleService.js';
import { User } from '../../models/User.js';
import { formatPermissionsList } from '../../utils/permissionButtons.js';
import { escapeHTML } from '../../utils/sanitize.js';

export const meta = {
  commands: ['myroles'],
  category: 'user',
  description: 'View your roles and permissions',
  usage: '/myroles',
  showInMenu: true,
};

/**
 * Show detailed permissions list
 */
async function showDetailedPermissions(ctx, userId) {
  try {
    const permissions = await roleService.getUserPermissions(userId);

    if (permissions.length === 0) {
      await ctx.answerCbQuery('You have no permissions');
      return;
    }

    const permList = formatPermissionsList(permissions, true);

    const message = [
      '🔐 <b>Your Permissions</b>',
      '',
      permList,
      '',
      `<i>Total: ${permissions.length} permission${permissions.length !== 1 ? 's' : ''}</i>`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [[{ text: '« Back to Roles', callback_data: 'back_to_roles' }]],
    };

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    await ctx.answerCbQuery();
  } catch (err) {
    await ctx.answerCbQuery('❌ Error loading permissions');
  }
}

/**
 * Show user's roles
 */
async function showUserRoles(ctx, isEdit = false) {
  try {
    const userId = String(ctx.from.id);
    const user = await User.findById(userId);

    if (!user) {
      return ctx.reply('❌ User not found. Please /register first.');
    }

    const userRoles = await roleService.getUserRoles(userId);
    const permissions = await roleService.getUserPermissions(userId);

    let message;

    if (userRoles.length === 0) {
      message = [
        '👤 <b>Your Roles</b>',
        '',
        '<i>You have no special roles assigned.</i>',
        '',
        'You have the default user permissions.',
      ].join('\n');

      const options = { parse_mode: 'HTML' };

      if (isEdit) {
        await ctx.editMessageText(message, options);
      } else {
        await ctx.replyWithHTML(message);
      }
      return;
    }

    // Build role list
    const roleLines = userRoles.map((role) => {
      const type = role.isSystemRole ? 'System Role' : 'Custom Role';
      const permCount = role.permissions ? role.permissions.length : 0;

      return [
        `${role.icon || '👥'} <b>${escapeHTML(role.name)}</b> ${role.isSystemRole ? '(System)' : ''}`,
        `  ${escapeHTML(role.description || 'No description')}`,
        `  Permissions: ${permCount}`,
      ].join('\n');
    });

    message = [
      '👤 <b>Your Roles</b>',
      '',
      ...roleLines,
      '',
      `<b>Total Permissions:</b> ${permissions.length}`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [[{ text: '🔐 View All Permissions', callback_data: 'view_my_perms' }]],
    };

    const options = {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    };

    if (isEdit) {
      await ctx.editMessageText(message, options);
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithHTML(message, options);
    }
  } catch (err) {
    const errorMsg = `❌ Error: ${escapeHTML(err.message)}`;
    if (isEdit) {
      await ctx.answerCbQuery('❌ Error loading roles');
      await ctx.reply(errorMsg, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(errorMsg, { parse_mode: 'HTML' });
    }
  }
}

export function register(bot) {
  // /myroles command
  bot.command('myroles', async (ctx) => {
    await showUserRoles(ctx, false);
  });

  // View all permissions button
  bot.action('view_my_perms', async (ctx) => {
    await showDetailedPermissions(ctx, String(ctx.from.id));
  });

  // Back to roles button
  bot.action('back_to_roles', async (ctx) => {
    await showUserRoles(ctx, true);
  });
}
