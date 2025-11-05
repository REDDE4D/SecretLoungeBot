import * as roleService from '../../../services/roleService.js';
import { escapeHTML } from '../../../utils/sanitize.js';
import logger from '../../../utils/logger.js';

export const meta = {
  commands: ['role_delete'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Delete a custom role',
  usage: '/role_delete <role_name or role_id>',
  showInMenu: false,
};

/**
 * Show delete confirmation
 */
async function showDeleteConfirmation(ctx, roleId, isEdit = false) {
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
        await ctx.answerCbQuery('❌ Cannot delete system roles');
      }
      return ctx.reply('❌ Cannot delete system roles.');
    }

    const users = await roleService.getUsersWithRole(roleId);
    const userCount = users.length;

    const message = [
      '⚠️ <b>Delete Role Confirmation</b>',
      '',
      `<b>Role:</b> ${role.icon || '👥'} ${escapeHTML(role.name)}`,
      `<b>Users with this role:</b> ${userCount}`,
      '',
      userCount > 0
        ? `⚠️ This will remove the role from <b>${userCount}</b> user${userCount !== 1 ? 's' : ''}.`
        : '',
      '<b>This action cannot be undone.</b>',
      '',
      'Are you sure you want to delete this role?',
    ]
      .filter(Boolean)
      .join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🗑️ Yes, Delete Role', callback_data: `confirm_delete_${roleId}` },
        ],
        [
          { text: '❌ Cancel', callback_data: 'cancel_delete' },
        ],
      ],
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
 * Delete the role
 */
async function deleteRole(ctx, roleId) {
  try {
    const role = await roleService.getRoleById(roleId);

    if (!role) {
      return ctx.answerCbQuery('❌ Role not found');
    }

    const users = await roleService.getUsersWithRole(roleId);
    const userCount = users.length;

    // Delete the role (force=true removes role from users)
    await roleService.deleteRole(roleId, true);

    logger.logModeration('role_delete', ctx.from.id, null, {
      roleId,
      roleName: role.name,
      affectedUsers: userCount,
    });

    const message = [
      '✅ <b>Role Deleted Successfully</b>',
      '',
      `<b>Deleted role:</b> ${role.icon || '👥'} ${escapeHTML(role.name)}`,
      userCount > 0 ? `<b>Removed from:</b> ${userCount} user${userCount !== 1 ? 's' : ''}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await ctx.editMessageText(message, { parse_mode: 'HTML' });
    await ctx.answerCbQuery('✅ Role deleted');
  } catch (err) {
    await ctx.answerCbQuery('❌ Failed to delete role');
    await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
  }
}

export function register(bot) {
  // Command to delete a role
  bot.command('role_delete', async (ctx) => {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    const roleIdentifier = args.join(' ');

    if (!roleIdentifier) {
      return ctx.reply('Usage: /role_delete <role_name or role_id>');
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

      await showDeleteConfirmation(ctx, role.roleId, false);
    } catch (err) {
      await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
    }
  });

  // Handle delete button from role info/list
  bot.action(/^delete_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await showDeleteConfirmation(ctx, roleId, true);
  });

  // Handle delete confirmation
  bot.action(/^confirm_delete_(.+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    await deleteRole(ctx, roleId);
  });

  // Handle delete cancellation
  bot.action('cancel_delete', async (ctx) => {
    await ctx.editMessageText('❌ Role deletion cancelled.', { parse_mode: 'HTML' });
    await ctx.answerCbQuery('Cancelled');
  });
}
