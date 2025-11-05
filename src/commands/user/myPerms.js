import { getUserMeta } from '../../users/index.js';
import { escapeHTML } from '../../utils/sanitize.js';

export const meta = {
  commands: ['myperms', 'mypermissions'],
  category: 'user',
  roleRequired: null,
  description: 'Check your permissions',
  usage: '/myperms',
  showInMenu: true,
};

export function register(bot) {
  bot.command(['myperms', 'mypermissions'], async (ctx) => {
    try {
      const userId = ctx.from.id;
      const user = await getUserMeta(userId);

      if (!user) {
        return ctx.reply('❌ You are not registered. Use /register to get started.');
      }

      const permissions = [];

      // Role
      if (user.role) {
        const roleEmoji = {
          admin: '👑',
          mod: '🛡️',
          whitelist: '⭐',
        };
        permissions.push(`<b>Role:</b> ${roleEmoji[user.role] || ''} ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`);
      } else {
        permissions.push('<b>Role:</b> Regular User');
      }

      // Link posting
      const canPostLinks = user.role === 'admin' || user.role === 'mod' || user.canPostLinks === true;
      permissions.push(`<b>Can post links:</b> ${canPostLinks ? '✅ Yes' : '❌ No'}`);

      // Media posting
      const canPostMedia = !user.mediaRestricted;
      permissions.push(`<b>Can post media:</b> ${canPostMedia ? '✅ Yes' : '❌ No'}`);

      // Muted status
      if (user.mutedUntil && new Date(user.mutedUntil) > new Date()) {
        const until = new Date(user.mutedUntil).toLocaleString();
        permissions.push(`<b>Muted until:</b> ${until}`);
      }

      const message = [
        `👤 <b>Your Permissions</b>`,
        '',
        `<b>Alias:</b> ${escapeHTML(user.alias || 'Not set')}`,
        '',
        ...permissions,
      ].join('\n');

      await ctx.replyWithHTML(message);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      await ctx.reply('❌ Error fetching your permissions.');
    }
  });
}
