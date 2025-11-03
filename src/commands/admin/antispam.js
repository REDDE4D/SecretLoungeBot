import { Markup } from 'telegraf';
import { User } from '../../models/User.js';
import SpamDetection from '../../models/SpamDetection.js';
import * as spamHandler from '../../handlers/spamHandler.js';
import { escapeMarkdownV2 } from '../../utils/sanitize.js';
import { formatDuration } from '../../utils/timeFormat.js';
import logger from '../../utils/logger.js';

/**
 * Admin commands for managing anti-spam system
 */

export const meta = {
  commands: ['antispam'],
  category: 'admin',
  roleRequired: ['admin'],
  description: 'Manage anti-spam detection system',
  usage: [
    '/antispam - Show current configuration and statistics',
    '/antispam status - Show spam detection status',
    '/antispam config - View all configuration options',
    '/antispam set <option> <value> - Update configuration',
    '/antispam whitelist <alias> - Exempt user from spam checks',
    '/antispam unwhitelist <alias> - Remove spam check exemption',
    '/antispam reset <alias> - Reset user violations',
    '/antispam top - Show top spammers',
    '/antispam clear <alias> - Clear auto-mute for user'
  ],
  showInMenu: false
};

/**
 * Format configuration for display
 */
function formatConfig(config) {
  const sections = [];

  // Flood detection
  sections.push('**Flood Detection:**');
  sections.push(`Enabled: ${config.floodEnabled ? '✅' : '❌'}`);
  sections.push(`Max identical: ${config.floodMaxIdentical} messages`);
  sections.push(`Similarity threshold: ${(config.floodSimilarityThreshold * 100).toFixed(0)}%`);
  sections.push(`Time window: ${config.floodTimeWindow / 1000}s`);

  sections.push('');

  // Link spam detection
  sections.push('**Link Spam Detection:**');
  sections.push(`Enabled: ${config.linkSpamEnabled ? '✅' : '❌'}`);
  sections.push(`Max links per message: ${config.linkSpamMaxLinks}`);
  sections.push(`Max links in window: ${config.linkSpamMaxLinksInWindow}`);
  sections.push(`Time window: ${config.linkSpamTimeWindow / 1000}s`);

  sections.push('');

  // Rapid-fire detection
  sections.push('**Rapid-Fire Detection:**');
  sections.push(`Enabled: ${config.rapidFireEnabled ? '✅' : '❌'}`);
  sections.push(`Max messages: ${config.rapidFireMaxMessages}`);
  sections.push(`Time window: ${config.rapidFireTimeWindow / 1000}s`);

  sections.push('');

  // Auto-mute settings
  sections.push('**Auto-Mute:**');
  sections.push(`Enabled: ${config.autoMuteEnabled ? '✅' : '❌'}`);
  sections.push(`Notify admins: ${config.notifyAdmins ? '✅' : '❌'}`);
  sections.push('Escalation: 5m → 15m → 1h → 24h → 7d');

  return sections.join('\n');
}

/**
 * Main antispam command
 */
async function handleAntispam(ctx) {
  const userId = ctx.from.id.toString();

  try {
    // Check admin permission
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command requires admin privileges.');
    }

    const config = spamHandler.getConfig();

    // Get statistics
    const totalRecords = await SpamDetection.countDocuments();
    const autoMuted = await SpamDetection.countDocuments({
      autoMuteUntil: { $gt: new Date() }
    });
    const whitelisted = await SpamDetection.countDocuments({ whitelisted: true });

    const stats = await SpamDetection.aggregate([
      {
        $group: {
          _id: null,
          totalViolations: { $sum: '$violations.total' },
          totalFlood: { $sum: '$violations.flood' },
          totalLinkSpam: { $sum: '$violations.linkSpam' },
          totalRapidFire: { $sum: '$violations.rapidFire' }
        }
      }
    ]);

    const totals = stats[0] || {
      totalViolations: 0,
      totalFlood: 0,
      totalLinkSpam: 0,
      totalRapidFire: 0
    };

    const message = [
      '🛡️ **Anti-Spam System**',
      '',
      '**Statistics:**',
      `📊 Tracked users: ${totalRecords}`,
      `🚫 Currently auto-muted: ${autoMuted}`,
      `✅ Whitelisted: ${whitelisted}`,
      '',
      `Total violations: ${totals.totalViolations}`,
      `├─ Flood: ${totals.totalFlood}`,
      `├─ Link spam: ${totals.totalLinkSpam}`,
      `└─ Rapid-fire: ${totals.totalRapidFire}`,
      '',
      '**Configuration:**',
      formatConfig(config),
      '',
      '**Commands:**',
      '`/antispam config` - View configuration options',
      '`/antispam set <option> <value>` - Update setting',
      '`/antispam whitelist <alias>` - Exempt user',
      '`/antispam top` - Show top spammers',
      '`/antispam reset <alias>` - Reset violations',
      '`/antispam clear <alias>` - Clear auto-mute'
    ].join('\n');

    await ctx.reply(escapeMarkdownV2(message), { parse_mode: 'MarkdownV2' });

  } catch (error) {
    logger.error('Error in antispam command', { userId, error: error.message });
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Show configuration options
 */
async function handleConfig(ctx) {
  const userId = ctx.from.id.toString();

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command requires admin privileges.');
    }

    const config = spamHandler.getConfig();

    const message = [
      '⚙️ **Anti-Spam Configuration**',
      '',
      '**Available Options:**',
      '',
      '**Flood Detection:**',
      '`floodEnabled` - Enable/disable (true/false)',
      '`floodMaxIdentical` - Max identical messages (1-10)',
      '`floodSimilarityThreshold` - Similarity % (0.5-1.0)',
      '`floodTimeWindow` - Time window in ms (10000-120000)',
      '',
      '**Link Spam:**',
      '`linkSpamEnabled` - Enable/disable (true/false)',
      '`linkSpamMaxLinks` - Max links per message (1-10)',
      '`linkSpamMaxLinksInWindow` - Max links in window (1-20)',
      '`linkSpamTimeWindow` - Time window in ms (10000-300000)',
      '',
      '**Rapid-Fire:**',
      '`rapidFireEnabled` - Enable/disable (true/false)',
      '`rapidFireMaxMessages` - Max messages in window (5-30)',
      '`rapidFireTimeWindow` - Time window in ms (10000-120000)',
      '',
      '**Auto-Mute:**',
      '`autoMuteEnabled` - Enable/disable (true/false)',
      '`notifyAdmins` - Notify on violations (true/false)',
      '',
      '**Current Values:**',
      formatConfig(config),
      '',
      '**Usage:**',
      '`/antispam set floodMaxIdentical 5`',
      '`/antispam set autoMuteEnabled false`'
    ].join('\n');

    await ctx.reply(escapeMarkdownV2(message), { parse_mode: 'MarkdownV2' });

  } catch (error) {
    logger.error('Error in antispam config command', { userId, error: error.message });
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Update configuration setting
 */
async function handleSet(ctx) {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ').slice(2);

  if (args.length < 2) {
    return ctx.reply('❌ Usage: /antispam set <option> <value>\n\nExample: /antispam set floodMaxIdentical 5\n\nUse /antispam config to see available options.');
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command requires admin privileges.');
    }

    const option = args[0];
    let value = args[1];

    // Parse value based on type
    if (value === 'true' || value === 'false') {
      value = value === 'true';
    } else if (!isNaN(value)) {
      value = parseFloat(value);
    }

    // Update configuration
    const success = await spamHandler.updateConfig(option, value);

    if (!success) {
      return ctx.reply(`❌ Invalid option: ${option}\n\nUse /antispam config to see available options.`);
    }

    // Log to audit
    logger.logModeration(userId, null, 'antispam_config', {
      option,
      value,
      moderatorAlias: user.alias
    });

    await ctx.reply(`✅ Updated ${option} to: ${value}\n\nUse /antispam to view current configuration.`);

  } catch (error) {
    logger.error('Error in antispam set command', { userId, error: error.message });
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Whitelist user from spam checks
 */
async function handleWhitelist(ctx) {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ').slice(2);

  if (args.length === 0) {
    return ctx.reply('❌ Usage: /antispam whitelist <alias>');
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command requires admin privileges.');
    }

    const targetAlias = args.join(' ').trim();
    const targetUser = await User.findOne({ alias: new RegExp(`^${targetAlias}$`, 'i') });

    if (!targetUser) {
      return ctx.reply(`❌ User not found: ${targetAlias}`);
    }

    await SpamDetection.whitelist(targetUser._id, userId);

    logger.logModeration(userId, targetUser._id, 'spam_whitelist', {
      moderatorAlias: user.alias,
      targetAlias: targetUser.alias
    });

    await ctx.reply(`✅ ${targetUser.alias} is now exempt from spam detection.`);

  } catch (error) {
    logger.error('Error in antispam whitelist command', { userId, error: error.message });
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Remove user from spam whitelist
 */
async function handleUnwhitelist(ctx) {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ').slice(2);

  if (args.length === 0) {
    return ctx.reply('❌ Usage: /antispam unwhitelist <alias>');
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command requires admin privileges.');
    }

    const targetAlias = args.join(' ').trim();
    const targetUser = await User.findOne({ alias: new RegExp(`^${targetAlias}$`, 'i') });

    if (!targetUser) {
      return ctx.reply(`❌ User not found: ${targetAlias}`);
    }

    await SpamDetection.unwhitelist(targetUser._id);

    logger.logModeration(userId, targetUser._id, 'spam_unwhitelist', {
      moderatorAlias: user.alias,
      targetAlias: targetUser.alias
    });

    await ctx.reply(`✅ ${targetUser.alias} removed from spam whitelist.`);

  } catch (error) {
    logger.error('Error in antispam unwhitelist command', { userId, error: error.message });
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Reset user violations
 */
async function handleReset(ctx) {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ').slice(2);

  if (args.length === 0) {
    return ctx.reply('❌ Usage: /antispam reset <alias>');
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command requires admin privileges.');
    }

    const targetAlias = args.join(' ').trim();
    const targetUser = await User.findOne({ alias: new RegExp(`^${targetAlias}$`, 'i') });

    if (!targetUser) {
      return ctx.reply(`❌ User not found: ${targetAlias}`);
    }

    const record = await SpamDetection.findOne({ userId: targetUser._id });

    if (!record) {
      return ctx.reply(`✅ ${targetUser.alias} has no spam violations.`);
    }

    await record.resetViolations();

    logger.logModeration(userId, targetUser._id, 'spam_reset', {
      moderatorAlias: user.alias,
      targetAlias: targetUser.alias
    });

    await ctx.reply(`✅ Reset spam violations for ${targetUser.alias}.`);

  } catch (error) {
    logger.error('Error in antispam reset command', { userId, error: error.message });
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Clear auto-mute for user
 */
async function handleClear(ctx) {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ').slice(2);

  if (args.length === 0) {
    return ctx.reply('❌ Usage: /antispam clear <alias>');
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command requires admin privileges.');
    }

    const targetAlias = args.join(' ').trim();
    const targetUser = await User.findOne({ alias: new RegExp(`^${targetAlias}$`, 'i') });

    if (!targetUser) {
      return ctx.reply(`❌ User not found: ${targetAlias}`);
    }

    const success = await spamHandler.clearAutoMute(targetUser._id, false);

    if (!success) {
      return ctx.reply(`✅ ${targetUser.alias} is not auto-muted.`);
    }

    logger.logModeration(userId, targetUser._id, 'spam_unmute', {
      moderatorAlias: user.alias,
      targetAlias: targetUser.alias
    });

    await ctx.reply(`✅ Cleared auto-mute for ${targetUser.alias}.`);

  } catch (error) {
    logger.error('Error in antispam clear command', { userId, error: error.message });
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Show top spammers
 */
async function handleTop(ctx) {
  const userId = ctx.from.id.toString();

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command requires admin privileges.');
    }

    const topSpammers = await SpamDetection.getTopSpammers(10);

    if (topSpammers.length === 0) {
      return ctx.reply('✅ No spam violations recorded yet.');
    }

    // Get user aliases
    const userIds = topSpammers.map(s => s.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const aliasMap = {};
    users.forEach(u => { aliasMap[u._id] = u.alias; });

    const lines = ['🚫 **Top Spammers**', ''];

    for (let i = 0; i < topSpammers.length; i++) {
      const spammer = topSpammers[i];
      const alias = aliasMap[spammer.userId] || 'Unknown';
      const total = spammer.violations.total;
      const flood = spammer.violations.flood;
      const links = spammer.violations.linkSpam;
      const rapid = spammer.violations.rapidFire;

      const autoMuted = spammer.autoMuteUntil && spammer.autoMuteUntil > new Date();
      const status = autoMuted ? ' 🔇' : '';

      lines.push(`${i + 1}. **${alias}**${status} - ${total} violations`);
      lines.push(`   └ Flood: ${flood}, Links: ${links}, Rapid: ${rapid}`);
    }

    await ctx.reply(escapeMarkdownV2(lines.join('\n')), { parse_mode: 'MarkdownV2' });

  } catch (error) {
    logger.error('Error in antispam top command', { userId, error: error.message });
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Register all antispam commands
 */
export function register(bot) {
  // Main command with subcommands
  bot.command('antispam', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length === 0) {
      return handleAntispam(ctx);
    }

    const subcommand = args[0].toLowerCase();

    switch (subcommand) {
      case 'status':
        return handleAntispam(ctx);
      case 'config':
        return handleConfig(ctx);
      case 'set':
        return handleSet(ctx);
      case 'whitelist':
        return handleWhitelist(ctx);
      case 'unwhitelist':
        return handleUnwhitelist(ctx);
      case 'reset':
        return handleReset(ctx);
      case 'clear':
        return handleClear(ctx);
      case 'top':
        return handleTop(ctx);
      default:
        return ctx.reply('❌ Invalid subcommand. Use /antispam for help.');
    }
  });
}
