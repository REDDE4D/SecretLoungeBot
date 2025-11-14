import * as roleService from '../../../services/roleService.js';
import { getAlias, setRole } from '../../../users/index.js';
import { User } from '../../../models/User.js';
import { escapeHTML, escapeMarkdownV2 } from '../../../utils/sanitize.js';
import { resolveTargetUser } from '../../utils/resolvers.js';
import { paginate, buildPaginationKeyboard, getPaginationFooter } from '../../../utils/pagination.js';
import logger from '../../../utils/logger.js';
import { notifyRoleChange } from '../../../utils/roleNotifications.js';

export const meta = {
  commands: ['setrole', 'removerole', 'clearroles', 'whohas'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Assign and manage user roles',
  usage: '/setrole <@user|alias|id> <role>, /removerole <@user|alias|id> [role], /clearroles <@user|alias|id>, /whohas <role>',
  showInMenu: false,
};

/**
 * Assign a role to a user
 */
async function assignRole(ctx) {
  try {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);

    if (args.length < 2) {
      return ctx.reply('Usage: /setrole <@user|alias|id> <role_name or role_id>');
    }

    // First arg might be alias/user
    const userIdentifier = args[0];
    const roleIdentifier = args.slice(1).join(' ');

    // Resolve target user
    const userId = await resolveTargetUser(ctx, userIdentifier);
    const user = await User.findById(userId);

    if (!user) {
      return ctx.reply('❌ User not found.');
    }

    // Find role (system or custom)
    let role = await roleService.getRoleById(roleIdentifier);
    if (!role) {
      role = await roleService.getRoleByName(roleIdentifier);
    }

    if (!role) {
      return ctx.reply(
        '❌ Role not found. Use /role_list to see all roles.\n\nSystem roles: admin, mod, whitelist'
      );
    }

    // Check if it's a system role
    if (role.isSystemRole) {
      // System roles replace the current system role
      const oldRole = user.role;
      const result = await setRole(userId, role.roleId);

      logger.logModeration('setrole_system', ctx.from.id, userId, {
        oldRole,
        newRole: role.roleId,
      });

      // Notify user about role change
      await notifyRoleChange(userId, {
        oldRole,
        newRole: role.roleId,
      });

      return ctx.reply(escapeMarkdownV2(result), { parse_mode: 'MarkdownV2' });
    } else {
      // Custom roles are additive
      const result = await roleService.assignRoleToUser(userId, role.roleId);

      logger.logModeration('setrole_custom', ctx.from.id, userId, {
        roleId: role.roleId,
        roleName: role.name,
      });

      // Notify user about custom role assignment
      await notifyRoleChange(userId, {
        customRole: {
          roleId: role.roleId,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          icon: role.icon,
        },
      });

      const alias = await getAlias(userId);
      const message = `✅ Assigned <b>${role.icon || '👥'} ${escapeHTML(role.name)}</b> to ${escapeHTML(alias)}`;

      return ctx.replyWithHTML(message);
    }
  } catch (err) {
    ctx.reply(`❌ Error: ${escapeHTML(err.message || 'Could not resolve user.')}`, {
      parse_mode: 'HTML',
    });
  }
}

/**
 * Remove a role from a user
 */
async function removeRole(ctx) {
  try {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);

    if (args.length < 1) {
      return ctx.reply('Usage: /removerole <@user|alias|id> [role_name or role_id]');
    }

    const userIdentifier = args[0];
    const roleIdentifier = args.slice(1).join(' ');

    // Resolve target user
    const userId = await resolveTargetUser(ctx, userIdentifier);
    const user = await User.findById(userId);

    if (!user) {
      return ctx.reply('❌ User not found.');
    }

    const alias = await getAlias(userId);

    // If no role specified, show list of user's roles
    if (!roleIdentifier) {
      const userRoles = await roleService.getUserRoles(userId);

      if (userRoles.length === 0) {
        return ctx.reply(`${escapeHTML(alias)} has no roles to remove.`);
      }

      const roleButtons = userRoles.map((role) => [
        {
          text: `${role.icon || '👥'} ${role.name} ${role.isSystemRole ? '(System)' : ''}`,
          callback_data: `rmrole_${userId}_${role.roleId}`,
        },
      ]);

      roleButtons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

      const message = `<b>Remove role from ${escapeHTML(alias)}:</b>\n\nSelect a role to remove:`;

      return ctx.replyWithHTML(message, {
        reply_markup: { inline_keyboard: roleButtons },
      });
    }

    // Find and remove the specified role
    let role = await roleService.getRoleById(roleIdentifier);
    if (!role) {
      role = await roleService.getRoleByName(roleIdentifier);
    }

    if (!role) {
      return ctx.reply('❌ Role not found.');
    }

    // Prevent removing admin role
    if (role.roleId === 'admin') {
      return ctx.reply('❌ Cannot remove admin role for security reasons. Use /clearroles instead.');
    }

    // Remove role
    if (role.isSystemRole) {
      // System role - set to null
      const result = await setRole(userId, null);

      logger.logModeration('removerole_system', ctx.from.id, userId, {
        removedRole: role.roleId,
      });

      // Notify user about role removal
      await notifyRoleChange(userId, {
        oldRole: role.roleId,
        newRole: null,
        isRemoval: true,
      });

      return ctx.reply(escapeMarkdownV2(result), { parse_mode: 'MarkdownV2' });
    } else {
      // Custom role - remove from array
      await roleService.removeRoleFromUser(userId, role.roleId);

      logger.logModeration('removerole_custom', ctx.from.id, userId, {
        roleId: role.roleId,
        roleName: role.name,
      });

      // Notify user about custom role removal
      await notifyRoleChange(userId, {
        customRole: {
          roleId: role.roleId,
          name: role.name,
          description: role.description,
          icon: role.icon,
        },
        isRemoval: true,
      });

      const message = `✅ Removed <b>${role.icon || '👥'} ${escapeHTML(role.name)}</b> from ${escapeHTML(alias)}`;
      return ctx.replyWithHTML(message);
    }
  } catch (err) {
    ctx.reply(`❌ Error: ${escapeHTML(err.message || 'Could not resolve user.')}`, {
      parse_mode: 'HTML',
    });
  }
}

/**
 * Clear all roles from a user
 */
async function clearRoles(ctx) {
  try {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);

    if (args.length < 1) {
      return ctx.reply('Usage: /clearroles <@user|alias|id>');
    }

    const userIdentifier = args[0];

    // Resolve target user
    const userId = await resolveTargetUser(ctx, userIdentifier);
    const user = await User.findById(userId);

    if (!user) {
      return ctx.reply('❌ User not found.');
    }

    const alias = await getAlias(userId);

    // Show confirmation
    const userRoles = await roleService.getUserRoles(userId);

    if (userRoles.length === 0) {
      return ctx.reply(`${escapeHTML(alias)} has no roles to clear.`);
    }

    const roleList = userRoles
      .map((r) => `  • ${r.icon || '👥'} ${escapeHTML(r.name)} ${r.isSystemRole ? '(System)' : ''}`)
      .join('\n');

    const message = [
      `⚠️ <b>Clear All Roles</b>`,
      '',
      `<b>User:</b> ${escapeHTML(alias)}`,
      `<b>Roles to remove:</b>`,
      roleList,
      '',
      '<b>This action cannot be undone.</b>',
      '',
      'Are you sure?',
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [{ text: '🗑️ Yes, Clear All Roles', callback_data: `confirm_clear_${userId}` }],
        [{ text: '❌ Cancel', callback_data: 'cancel' }],
      ],
    };

    return ctx.replyWithHTML(message, { reply_markup: keyboard });
  } catch (err) {
    ctx.reply(`❌ Error: ${escapeHTML(err.message || 'Could not resolve user.')}`, {
      parse_mode: 'HTML',
    });
  }
}

/**
 * Show users with a specific role
 */
async function showUsersWithRole(ctx, roleId, page = 1, isEdit = false) {
  try {
    const role = await roleService.getRoleById(roleId);

    if (!role) {
      if (isEdit) {
        await ctx.answerCbQuery('❌ Role not found');
      }
      return ctx.reply('❌ Role not found.');
    }

    const users = await roleService.getUsersWithRole(roleId);

    if (users.length === 0) {
      const message = `ℹ️ No users have the <b>${role.icon || '👥'} ${escapeHTML(role.name)}</b> role.`;
      if (isEdit) {
        await ctx.editMessageText(message, { parse_mode: 'HTML' });
      } else {
        await ctx.replyWithHTML(message);
      }
      return;
    }

    // Paginate users
    const paginationResult = paginate(users, page, 10);
    const { items, currentPage, totalPages, totalItems } = paginationResult;

    const userLines = items.map((user) => {
      const status = user.inLobby ? '🟢 Online' : '⚫ Offline';
      return `• ${user.icon?.fallback || '👤'} ${escapeHTML(user.alias || 'Unknown')} — ${status}`;
    });

    let message = [
      `👥 <b>Users with ${role.icon || '👥'} ${escapeHTML(role.name)}</b>`,
      '',
      ...userLines,
    ].join('\n');

    message += getPaginationFooter(currentPage, totalPages, totalItems);

    const paginationButtons = buildPaginationKeyboard(`whohas_${roleId}_page`, currentPage, totalPages);

    const keyboard = {
      inline_keyboard: paginationButtons,
    };

    const options = {
      parse_mode: 'HTML',
      reply_markup: keyboard.inline_keyboard.length > 0 ? keyboard : undefined,
    };

    if (isEdit) {
      await ctx.editMessageText(message, options);
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithHTML(message, options);
    }
  } catch (err) {
    if (isEdit) {
      await ctx.answerCbQuery('❌ Error loading users');
    }
    ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
  }
}

export function register(bot) {
  // /setrole command
  bot.command('setrole', assignRole);

  // /removerole command
  bot.command('removerole', removeRole);

  // /clearroles command
  bot.command('clearroles', clearRoles);

  // /whohas command
  bot.command('whohas', async (ctx) => {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    const roleIdentifier = args.join(' ');

    if (!roleIdentifier) {
      return ctx.reply('Usage: /whohas <role_name or role_id>');
    }

    // Find role
    let role = await roleService.getRoleById(roleIdentifier);
    if (!role) {
      role = await roleService.getRoleByName(roleIdentifier);
    }

    if (!role) {
      return ctx.reply('❌ Role not found. Use /role_list to see all roles.');
    }

    await showUsersWithRole(ctx, role.roleId, 1, false);
  });

  // Handle remove role button callback
  bot.action(/^rmrole_(.+)_(.+)$/, async (ctx) => {
    const userId = ctx.match[1];
    const roleId = ctx.match[2];

    try {
      const user = await User.findById(userId);
      const role = await roleService.getRoleById(roleId);

      if (!user || !role) {
        return ctx.answerCbQuery('❌ User or role not found');
      }

      const alias = await getAlias(userId);

      // Prevent removing admin role
      if (roleId === 'admin') {
        return ctx.answerCbQuery('❌ Cannot remove admin role');
      }

      // Remove role
      if (role.isSystemRole) {
        await setRole(userId, null);

        logger.logModeration('removerole_system', ctx.from.id, userId, {
          removedRole: roleId,
        });

        // Notify user about role removal
        await notifyRoleChange(userId, {
          oldRole: roleId,
          newRole: null,
          isRemoval: true,
        });
      } else {
        await roleService.removeRoleFromUser(userId, roleId);

        logger.logModeration('removerole_custom', ctx.from.id, userId, {
          roleId,
          roleName: role.name,
        });

        // Notify user about custom role removal
        await notifyRoleChange(userId, {
          customRole: {
            roleId: role.roleId,
            name: role.name,
            description: role.description,
            icon: role.icon,
          },
          isRemoval: true,
        });
      }

      const message = `✅ Removed <b>${role.icon || '👥'} ${escapeHTML(role.name)}</b> from ${escapeHTML(alias)}`;

      await ctx.editMessageText(message, { parse_mode: 'HTML' });
      await ctx.answerCbQuery('✅ Role removed');
    } catch (err) {
      await ctx.answerCbQuery('❌ Failed to remove role');
      await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
    }
  });

  // Handle clear all roles confirmation
  bot.action(/^confirm_clear_(.+)$/, async (ctx) => {
    const userId = ctx.match[1];

    try {
      const user = await User.findById(userId);
      if (!user) {
        return ctx.answerCbQuery('❌ User not found');
      }

      const alias = await getAlias(userId);

      // Cannot clear admin
      if (user.role === 'admin') {
        return ctx.answerCbQuery('❌ Cannot clear admin role for security');
      }

      // Clear all roles
      await roleService.clearUserRoles(userId, false); // includeAdmin=false

      logger.logModeration('clearroles', ctx.from.id, userId);

      // Notify user about roles being cleared
      await notifyRoleChange(userId, {
        isClear: true,
      });

      const message = `✅ <b>Cleared all roles from ${escapeHTML(alias)}</b>`;

      await ctx.editMessageText(message, { parse_mode: 'HTML' });
      await ctx.answerCbQuery('✅ All roles cleared');
    } catch (err) {
      await ctx.answerCbQuery('❌ Failed to clear roles');
      await ctx.reply(`❌ Error: ${escapeHTML(err.message)}`, { parse_mode: 'HTML' });
    }
  });

  // Handle whohas pagination
  bot.action(/^whohas_(.+)_page:(\d+)$/, async (ctx) => {
    const roleId = ctx.match[1];
    const page = parseInt(ctx.match[2], 10);
    await showUsersWithRole(ctx, roleId, page, true);
  });
}
