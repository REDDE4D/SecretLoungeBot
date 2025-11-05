import { User } from '../../models/User.js';
import { getAlias } from '../../users/index.js';
import { escapeHTML } from '../../utils/sanitize.js';
import { resolveTargetUser } from '../utils/resolvers.js';
import logger from '../../utils/logger.js';

export const meta = {
  commands: ['link_permission', 'linkperm'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Manage user link posting permissions',
  usage: '/link_permission <alias|reply> <on|off>',
  showInMenu: false,
};

/**
 * Set link permission for a user
 */
async function setLinkPermission(ctx, args, adminId) {
  if (args.length < 1) {
    return ctx.reply('Usage: /link_permission <alias|reply> <on|off>');
  }

  try {
    // Resolve target user
    const userIdentifier = args[0];
    const action = args[1]?.toLowerCase();

    if (!action || !['on', 'off', 'enable', 'disable'].includes(action)) {
      return ctx.reply('Usage: /link_permission <alias|reply> <on|off>');
    }

    const userId = await resolveTargetUser(ctx, userIdentifier);
    const user = await User.findById(userId);

    if (!user) {
      return ctx.reply('❌ User not found.');
    }

    const alias = await getAlias(userId);
    const enable = ['on', 'enable'].includes(action);

    // Check if already set
    if (user.canPostLinks === enable) {
      const status = enable ? 'already has' : 'already does not have';
      return ctx.reply(`ℹ️ ${escapeHTML(alias)} ${status} link posting permission.`);
    }

    // Update permission
    user.canPostLinks = enable;
    await user.save();

    logger.logModeration('link_permission', adminId, userId, {
      alias,
      canPostLinks: enable,
    });

    const status = enable ? 'granted' : 'revoked';
    const statusIcon = enable ? '✅' : '❌';

    const message = [
      `${statusIcon} <b>Link Permission ${status.charAt(0).toUpperCase() + status.slice(1)}</b>`,
      '',
      `<b>User:</b> ${escapeHTML(alias)}`,
      `<b>Can post links:</b> ${enable ? 'Yes' : 'No'}`,
    ].join('\n');

    await ctx.replyWithHTML(message);
  } catch (err) {
    console.error('Error setting link permission:', err);
    await ctx.reply(`❌ Error: ${escapeHTML(err.message || 'Could not resolve user.')}`);
  }
}

/**
 * List users with link posting permission
 */
async function listLinkPermissions(ctx, page = 1) {
  try {
    const perPage = 10;
    const skip = (page - 1) * perPage;

    const [users, total] = await Promise.all([
      User.find({ canPostLinks: true })
        .sort({ alias: 1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      User.countDocuments({ canPostLinks: true }),
    ]);

    if (total === 0) {
      return ctx.reply(
        'ℹ️ No users have link posting permission.\n\n' +
          'Note: Admins and moderators can always post links.'
      );
    }

    const totalPages = Math.ceil(total / perPage);

    const userLines = users.map((user) => {
      const statusIcon = user.inLobby ? '🟢' : '⚫';
      const roleIcon = user.role === 'admin' ? '👑' : user.role === 'mod' ? '🛡️' : '';
      return `${statusIcon} ${roleIcon} ${user.icon?.fallback || '👤'} ${escapeHTML(user.alias || 'Unknown')}`;
    });

    const message = [
      `🔗 <b>Users with Link Permission</b> (Page ${page}/${totalPages})`,
      '',
      ...userLines,
      '',
      `Total: ${total} user${total !== 1 ? 's' : ''}`,
    ].join('\n');

    // Pagination buttons
    const buttons = [];
    const row = [];

    if (page > 1) {
      row.push({ text: '◀️ Previous', callback_data: `linkperm_page:${page - 1}` });
    }

    if (page < totalPages) {
      row.push({ text: 'Next ▶️', callback_data: `linkperm_page:${page + 1}` });
    }

    if (row.length > 0) {
      buttons.push(row);
    }

    const keyboard = buttons.length > 0 ? { inline_keyboard: buttons } : undefined;

    await ctx.replyWithHTML(message, { reply_markup: keyboard });
  } catch (err) {
    console.error('Error listing link permissions:', err);
    await ctx.reply(`❌ Error: ${err.message}`);
  }
}

export function register(bot) {
  bot.command(['link_permission', 'linkperm'], async (ctx) => {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    const adminId = ctx.from.id;

    if (args.length === 0) {
      // Show list
      await listLinkPermissions(ctx);
    } else if (args.length === 1 && args[0].toLowerCase() === 'list') {
      await listLinkPermissions(ctx);
    } else {
      await setLinkPermission(ctx, args, adminId);
    }
  });

  // Handle pagination callbacks
  bot.action(/^linkperm_page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await listLinkPermissions(ctx, page);
  });
}
