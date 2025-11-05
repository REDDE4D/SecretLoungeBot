import { LinkWhitelist } from '../../models/LinkWhitelist.js';
import { escapeHTML } from '../../utils/sanitize.js';
import { extractDomain } from '../../utils/linkDetection.js';
import logger from '../../utils/logger.js';

export const meta = {
  commands: ['link_whitelist', 'linkwl'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Manage link whitelist',
  usage: '/link_whitelist add <pattern> [notes] | /link_whitelist remove <id> | /link_whitelist list',
  showInMenu: false,
};

/**
 * Add a pattern to the whitelist
 */
async function addWhitelist(ctx, args, adminId) {
  if (args.length < 1) {
    return ctx.reply('Usage: /link_whitelist add <domain or URL> [notes]');
  }

  const pattern = args[0].toLowerCase().trim();
  const notes = args.slice(1).join(' ') || '';

  // Determine if it's a domain or full URL
  const isFullURL = pattern.startsWith('http://') || pattern.startsWith('https://');
  const type = isFullURL ? 'full_url' : 'domain';

  // Extract domain for validation
  const domain = extractDomain(pattern);
  if (!domain) {
    return ctx.reply('❌ Invalid domain or URL pattern.');
  }

  try {
    // Check if already exists
    const existing = await LinkWhitelist.findOne({ pattern });
    if (existing) {
      return ctx.reply(`❌ Pattern "${pattern}" is already whitelisted.`);
    }

    // Create new whitelist entry
    const whitelist = new LinkWhitelist({
      pattern,
      type,
      notes,
      addedBy: String(adminId),
      active: true,
    });

    await whitelist.save();

    logger.logModeration('link_whitelist_add', adminId, null, {
      pattern,
      type,
      notes,
    });

    const message = [
      '✅ <b>Link Whitelisted</b>',
      '',
      `<b>Pattern:</b> <code>${escapeHTML(pattern)}</code>`,
      `<b>Type:</b> ${type === 'domain' ? 'Domain' : 'Full URL'}`,
      notes ? `<b>Notes:</b> ${escapeHTML(notes)}` : '',
      '',
      `<b>ID:</b> <code>${whitelist._id}</code>`,
    ]
      .filter(Boolean)
      .join('\n');

    await ctx.replyWithHTML(message);
  } catch (err) {
    console.error('Error adding to whitelist:', err);
    await ctx.reply(`❌ Error: ${err.message}`);
  }
}

/**
 * Remove a pattern from the whitelist
 */
async function removeWhitelist(ctx, args, adminId) {
  if (args.length < 1) {
    return ctx.reply('Usage: /link_whitelist remove <id>');
  }

  const id = args[0];

  try {
    const whitelist = await LinkWhitelist.findById(id);

    if (!whitelist) {
      return ctx.reply('❌ Whitelist entry not found.');
    }

    const pattern = whitelist.pattern;

    await LinkWhitelist.deleteOne({ _id: id });

    logger.logModeration('link_whitelist_remove', adminId, null, {
      pattern,
      id,
    });

    await ctx.reply(`✅ Removed pattern "${pattern}" from whitelist.`);
  } catch (err) {
    console.error('Error removing from whitelist:', err);
    await ctx.reply(`❌ Error: ${err.message}`);
  }
}

/**
 * List all whitelisted patterns
 */
async function listWhitelist(ctx, page = 1) {
  try {
    const perPage = 10;
    const skip = (page - 1) * perPage;

    const [entries, total] = await Promise.all([
      LinkWhitelist.find().sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
      LinkWhitelist.countDocuments(),
    ]);

    if (total === 0) {
      return ctx.reply('ℹ️ No whitelisted links yet.');
    }

    const totalPages = Math.ceil(total / perPage);

    const entryLines = entries.map((entry) => {
      const typeIcon = entry.type === 'domain' ? '🌐' : '🔗';
      const statusIcon = entry.active ? '✅' : '❌';
      const notesPreview = entry.notes ? ` — ${entry.notes.substring(0, 30)}${entry.notes.length > 30 ? '...' : ''}` : '';

      return [
        `${statusIcon} ${typeIcon} <code>${escapeHTML(entry.pattern)}</code>`,
        `   ID: <code>${entry._id}</code>${notesPreview}`,
      ].join('\n');
    });

    const message = [
      `🔗 <b>Link Whitelist</b> (Page ${page}/${totalPages})`,
      '',
      ...entryLines,
      '',
      `Total: ${total} whitelisted pattern${total !== 1 ? 's' : ''}`,
    ].join('\n');

    // Pagination buttons
    const buttons = [];
    const row = [];

    if (page > 1) {
      row.push({ text: '◀️ Previous', callback_data: `linkwl_page:${page - 1}` });
    }

    if (page < totalPages) {
      row.push({ text: 'Next ▶️', callback_data: `linkwl_page:${page + 1}` });
    }

    if (row.length > 0) {
      buttons.push(row);
    }

    const keyboard = buttons.length > 0 ? { inline_keyboard: buttons } : undefined;

    await ctx.replyWithHTML(message, { reply_markup: keyboard });
  } catch (err) {
    console.error('Error listing whitelist:', err);
    await ctx.reply(`❌ Error: ${err.message}`);
  }
}

/**
 * Toggle active status of a whitelist entry
 */
async function toggleWhitelist(ctx, args, adminId) {
  if (args.length < 1) {
    return ctx.reply('Usage: /link_whitelist toggle <id>');
  }

  const id = args[0];

  try {
    const whitelist = await LinkWhitelist.findById(id);

    if (!whitelist) {
      return ctx.reply('❌ Whitelist entry not found.');
    }

    whitelist.active = !whitelist.active;
    await whitelist.save();

    logger.logModeration('link_whitelist_toggle', adminId, null, {
      pattern: whitelist.pattern,
      id,
      active: whitelist.active,
    });

    const status = whitelist.active ? 'enabled' : 'disabled';
    await ctx.reply(`✅ Whitelist entry "${whitelist.pattern}" ${status}.`);
  } catch (err) {
    console.error('Error toggling whitelist:', err);
    await ctx.reply(`❌ Error: ${err.message}`);
  }
}

export function register(bot) {
  bot.command(['link_whitelist', 'linkwl'], async (ctx) => {
    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    const subcommand = args[0]?.toLowerCase();
    const adminId = ctx.from.id;

    if (!subcommand || subcommand === 'list') {
      await listWhitelist(ctx);
    } else if (subcommand === 'add') {
      await addWhitelist(ctx, args.slice(1), adminId);
    } else if (subcommand === 'remove' || subcommand === 'delete') {
      await removeWhitelist(ctx, args.slice(1), adminId);
    } else if (subcommand === 'toggle') {
      await toggleWhitelist(ctx, args.slice(1), adminId);
    } else {
      await ctx.reply(
        'Usage:\n' +
          '  /link_whitelist add <domain or URL> [notes]\n' +
          '  /link_whitelist remove <id>\n' +
          '  /link_whitelist toggle <id>\n' +
          '  /link_whitelist list'
      );
    }
  });

  // Handle pagination callbacks
  bot.action(/^linkwl_page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await listWhitelist(ctx, page);
  });
}
