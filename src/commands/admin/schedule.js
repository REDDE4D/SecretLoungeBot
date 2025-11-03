import { escapeMarkdownV2 } from '../../utils/sanitize.js';
import { formatTimeAgo } from '../../utils/timeFormat.js';
import logger from '../../utils/logger.js';
import ScheduledAnnouncement from '../../models/ScheduledAnnouncement.js';
import { User } from '../../models/User.js';

export const meta = {
  commands: ['schedule', 'schedules', 'scheduled'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Manage scheduled announcements',
  usage: '/schedule <list|create|pause|resume|delete|view|test>',
  showInMenu: false,
};

// Cron pattern presets for easy use
const CRON_PRESETS = {
  'daily-9am': { pattern: '0 9 * * *', description: 'Every day at 9:00 AM' },
  'daily-12pm': { pattern: '0 12 * * *', description: 'Every day at 12:00 PM (noon)' },
  'daily-6pm': { pattern: '0 18 * * *', description: 'Every day at 6:00 PM' },
  'daily-9pm': { pattern: '0 21 * * *', description: 'Every day at 9:00 PM' },
  'weekly-monday': { pattern: '0 9 * * 1', description: 'Every Monday at 9:00 AM' },
  'weekly-friday': { pattern: '0 18 * * 5', description: 'Every Friday at 6:00 PM' },
  'hourly': { pattern: '0 * * * *', description: 'Every hour at minute 0' },
  'every-3h': { pattern: '0 */3 * * *', description: 'Every 3 hours' },
  'every-6h': { pattern: '0 */6 * * *', description: 'Every 6 hours' },
};

// Parse time string to Date
function parseTimeString(timeStr) {
  // Support formats:
  // - "2025-11-05 14:30" (YYYY-MM-DD HH:MM)
  // - "14:30" (today at HH:MM)
  // - "tomorrow 14:30"
  // - "1h" (1 hour from now)
  // - "30m" (30 minutes from now)
  // - "2d" (2 days from now)

  const now = new Date();

  // Relative time (1h, 30m, 2d)
  const relativeMatch = timeStr.match(/^(\d+)(m|h|d)$/);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const ms = {
      m: parseInt(amount) * 60 * 1000,
      h: parseInt(amount) * 60 * 60 * 1000,
      d: parseInt(amount) * 24 * 60 * 60 * 1000,
    }[unit];
    return new Date(now.getTime() + ms);
  }

  // Today at HH:MM
  const todayMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (todayMatch) {
    const [, hours, minutes] = todayMatch;
    const date = new Date(now);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    // If time has passed today, schedule for tomorrow
    if (date <= now) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  // Tomorrow at HH:MM
  const tomorrowMatch = timeStr.match(/^tomorrow\s+(\d{1,2}):(\d{2})$/i);
  if (tomorrowMatch) {
    const [, hours, minutes] = tomorrowMatch;
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }

  // Full date-time (YYYY-MM-DD HH:MM)
  const fullMatch = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (fullMatch) {
    const [, year, month, day, hours, minutes] = fullMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), 0, 0);
  }

  return null;
}

// Validate cron pattern (basic validation)
function isValidCronPattern(pattern) {
  // Basic cron pattern: minute hour day month weekday
  const parts = pattern.split(' ');
  if (parts.length !== 5) return false;

  // Check each part is valid (number, range, *, or */n)
  const validPart = /^(\*|\d+|\d+-\d+|\*\/\d+|(\d+,)+\d+)$/;
  return parts.every(part => validPart.test(part));
}

// Get human-readable description from cron pattern
function describeCronPattern(pattern) {
  const [minute, hour, day, month, weekday] = pattern.split(' ');

  // Common patterns
  if (pattern === '0 9 * * *') return 'Every day at 9:00 AM';
  if (pattern === '0 12 * * *') return 'Every day at 12:00 PM (noon)';
  if (pattern === '0 18 * * *') return 'Every day at 6:00 PM';
  if (pattern === '0 21 * * *') return 'Every day at 9:00 PM';
  if (pattern === '0 * * * *') return 'Every hour';
  if (pattern === '0 */3 * * *') return 'Every 3 hours';
  if (pattern === '0 */6 * * *') return 'Every 6 hours';
  if (pattern === '0 9 * * 1') return 'Every Monday at 9:00 AM';
  if (pattern === '0 18 * * 5') return 'Every Friday at 6:00 PM';

  // Generic description
  let desc = '';
  if (weekday !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    desc += `Every ${days[parseInt(weekday)]} `;
  } else if (day !== '*') {
    desc += `On day ${day} of every month `;
  } else {
    desc += 'Every day ';
  }

  if (hour !== '*' && minute !== '*') {
    desc += `at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } else if (hour.includes('*/')) {
    const interval = hour.split('/')[1];
    desc += `every ${interval} hours`;
  } else {
    desc += 'every minute';
  }

  return desc;
}

// Format scheduled announcement for display
function formatScheduledAnnouncement(announcement, includeMessage = false) {
  let text = `📋 *Announcement #${announcement._id.toString().slice(-6)}*\n`;
  text += `Status: ${announcement.active ? '✅ Active' : '⏸ Paused'}\n`;
  text += `Type: ${announcement.scheduleType === 'once' ? '⏰ One\\-time' : '🔁 Recurring'}\n`;

  if (announcement.scheduleType === 'once') {
    const timeUntil = announcement.scheduledFor.getTime() - Date.now();
    if (timeUntil > 0) {
      text += `Scheduled: ${escapeMarkdownV2(announcement.scheduledFor.toLocaleString())}\n`;
      text += `Time until: ${escapeMarkdownV2(formatTimeAgo(announcement.scheduledFor, true))}\n`;
    } else {
      text += `Was scheduled: ${escapeMarkdownV2(announcement.scheduledFor.toLocaleString())}\n`;
      text += `Status: Waiting to send\\.\\.\\.`;
    }
  } else {
    text += `Pattern: \`${escapeMarkdownV2(announcement.cronPattern)}\`\n`;
    text += `Schedule: ${escapeMarkdownV2(announcement.cronDescription || 'Custom pattern')}\n`;
  }

  text += `Target: ${announcement.target === 'all' ? '🌐 All users' : '🏠 Lobby members'}\n`;
  text += `Created by: ${escapeMarkdownV2(announcement.createdByAlias)}\n`;

  if (announcement.sentCount > 0) {
    text += `Sent ${announcement.sentCount} time${announcement.sentCount === 1 ? '' : 's'}\n`;
    if (announcement.lastSent) {
      text += `Last sent: ${escapeMarkdownV2(formatTimeAgo(announcement.lastSent))}\n`;
    }
  }

  if (announcement.notes) {
    text += `Notes: ${escapeMarkdownV2(announcement.notes)}\n`;
  }

  if (includeMessage) {
    text += `\nMessage:\n${escapeMarkdownV2(announcement.message)}`;
  }

  return text;
}

// Send scheduled announcement
async function sendScheduledAnnouncement(bot, announcement) {
  try {
    logger.info(`Sending scheduled announcement #${announcement._id}`);

    let recipients;
    if (announcement.target === 'all') {
      // Send to all registered users
      recipients = await User.find({}).lean();
    } else {
      // Send to lobby members only
      recipients = await User.find({ inLobby: true }).lean();
    }

    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        await bot.telegram.sendMessage(
          recipient._id,
          announcement.message,
          { parse_mode: 'HTML' }
        );
        successCount++;
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        failCount++;
        logger.error(`Failed to send scheduled announcement to ${recipient._id}: ${err.message}`);
      }
    }

    // Mark as sent
    await announcement.markAsSent();

    logger.info(`Scheduled announcement #${announcement._id} sent to ${successCount} users (${failCount} failed)`);

    return { successCount, failCount };
  } catch (error) {
    logger.error(`Error sending scheduled announcement #${announcement._id}: ${error.message}`);
    throw error;
  }
}

function register(bot) {
  bot.command(['schedule', 'schedules', 'scheduled'], async (ctx) => {
    try {
      // Check if user is admin
      const user = await User.findById(ctx.from.id.toString());
      if (!user || user.role !== 'admin') {
        return ctx.reply('⛔️ This command is only available to admins.');
      }

      const args = ctx.message.text.split(' ').slice(1);
      const subcommand = args[0]?.toLowerCase();

      // Default: list scheduled announcements
      if (!subcommand || subcommand === 'list') {
        const announcements = await ScheduledAnnouncement.find({}).sort({ scheduledFor: 1, createdAt: 1 }).lean();

        if (announcements.length === 0) {
          return ctx.reply('📋 No scheduled announcements found.\n\nUse `/schedule create` to create one.', { parse_mode: 'Markdown' });
        }

        let text = `📋 *Scheduled Announcements* (${announcements.length})\n\n`;

        const activeAnnouncements = announcements.filter(a => a.active);
        const pausedAnnouncements = announcements.filter(a => !a.active);

        if (activeAnnouncements.length > 0) {
          text += `✅ *Active (${activeAnnouncements.length}):*\n`;
          for (const ann of activeAnnouncements) {
            const id = ann._id.toString().slice(-6);
            const type = ann.scheduleType === 'once' ? '⏰' : '🔁';
            const target = ann.target === 'all' ? '🌐' : '🏠';
            const preview = ann.message.substring(0, 40) + (ann.message.length > 40 ? '...' : '');

            if (ann.scheduleType === 'once') {
              const timeStr = ann.scheduledFor > new Date()
                ? formatTimeAgo(ann.scheduledFor, true)
                : 'Ready to send';
              text += `  ${type}${target} #${id}: ${escapeMarkdownV2(preview)}\n`;
              text += `      └ ${escapeMarkdownV2(timeStr)}\n`;
            } else {
              text += `  ${type}${target} #${id}: ${escapeMarkdownV2(preview)}\n`;
              text += `      └ ${escapeMarkdownV2(ann.cronDescription || ann.cronPattern)}\n`;
            }
          }
          text += '\n';
        }

        if (pausedAnnouncements.length > 0) {
          text += `⏸ *Paused (${pausedAnnouncements.length}):*\n`;
          for (const ann of pausedAnnouncements) {
            const id = ann._id.toString().slice(-6);
            const type = ann.scheduleType === 'once' ? '⏰' : '🔁';
            const preview = ann.message.substring(0, 40) + (ann.message.length > 40 ? '...' : '');
            text += `  ${type} #${id}: ${escapeMarkdownV2(preview)}\n`;
          }
        }

        text += '\n💡 Use `/schedule view <id>` to see details';
        text += '\n💡 Use `/schedule help` for more commands';

        return ctx.reply(text, { parse_mode: 'MarkdownV2' });
      }

      // Create scheduled announcement
      if (subcommand === 'create') {
        const type = args[1]?.toLowerCase();

        if (!type || !['once', 'recurring'].includes(type)) {
          let helpText = '📋 *Create Scheduled Announcement*\n\n';
          helpText += '*One\\-time announcements:*\n';
          helpText += '`/schedule create once <time> <message>`\n\n';
          helpText += '*Time formats:*\n';
          helpText += '• `14:30` \\- Today at 2:30 PM\n';
          helpText += '• `tomorrow 14:30` \\- Tomorrow at 2:30 PM\n';
          helpText += '• `2025-11-05 14:30` \\- Specific date and time\n';
          helpText += '• `1h` \\- 1 hour from now\n';
          helpText += '• `30m` \\- 30 minutes from now\n';
          helpText += '• `2d` \\- 2 days from now\n\n';
          helpText += '*Recurring announcements:*\n';
          helpText += '`/schedule create recurring <preset|pattern> <message>`\n\n';
          helpText += '*Presets:*\n';
          for (const [key, { description }] of Object.entries(CRON_PRESETS)) {
            helpText += `• \`${key}\` \\- ${escapeMarkdownV2(description)}\n`;
          }
          helpText += '\n*Custom cron patterns:*\n';
          helpText += '• `0 9 * * *` \\- Every day at 9:00 AM\n';
          helpText += '• `0 */3 * * *` \\- Every 3 hours\n';
          helpText += '• Format: `minute hour day month weekday`\n\n';
          helpText += '*Examples:*\n';
          helpText += '`/schedule create once 1h Welcome to the lobby!`\n';
          helpText += '`/schedule create recurring daily-9am Good morning everyone!`\n\n';
          helpText += '*Options:*\n';
          helpText += 'Add `--all` to send to all users instead of just lobby members\n';
          helpText += 'Add `--notes="text"` to add notes for your reference';

          return ctx.reply(helpText, { parse_mode: 'MarkdownV2' });
        }

        // Parse options
        const fullText = ctx.message.text;
        const options = {
          target: fullText.includes('--all') ? 'all' : 'lobby',
          notes: null,
        };

        const notesMatch = fullText.match(/--notes="([^"]+)"/);
        if (notesMatch) {
          options.notes = notesMatch[1];
        }

        // Extract message (everything after time/pattern, excluding options)
        let messageStartIndex;
        if (type === 'once') {
          // For once: /schedule create once <time> <message>
          const timeArg = args[2];
          if (!timeArg) {
            return ctx.reply('❌ Please specify the time.\n\nExample: `/schedule create once 1h Your message here`', { parse_mode: 'Markdown' });
          }

          const scheduledFor = parseTimeString(timeArg);
          if (!scheduledFor) {
            return ctx.reply('❌ Invalid time format.\n\nSupported formats:\n• `14:30` (today)\n• `tomorrow 14:30`\n• `2025-11-05 14:30`\n• `1h`, `30m`, `2d`', { parse_mode: 'Markdown' });
          }

          // Check if time is in the past
          if (scheduledFor <= new Date()) {
            return ctx.reply('❌ Scheduled time must be in the future.');
          }

          // Find where message starts
          const commandPart = `/schedule create once ${timeArg}`;
          messageStartIndex = fullText.indexOf(commandPart) + commandPart.length;
          let message = fullText.substring(messageStartIndex).trim();

          // Remove options from message
          message = message.replace(/--all/g, '').replace(/--notes="[^"]+"/g, '').trim();

          if (!message) {
            return ctx.reply('❌ Please provide a message to announce.');
          }

          // Create scheduled announcement
          const announcement = new ScheduledAnnouncement({
            message,
            createdBy: ctx.from.id.toString(),
            createdByAlias: user.alias,
            scheduleType: 'once',
            scheduledFor,
            target: options.target,
            notes: options.notes,
          });

          await announcement.save();

          logger.logModeration(ctx.from.id.toString(), null, 'schedule_create_once', {
            announcementId: announcement._id.toString(),
            scheduledFor: scheduledFor.toISOString(),
            target: options.target,
          });

          let reply = '✅ One\\-time announcement scheduled\\!\n\n';
          reply += formatScheduledAnnouncement(announcement, true);

          return ctx.reply(reply, { parse_mode: 'MarkdownV2' });

        } else if (type === 'recurring') {
          // For recurring: /schedule create recurring <preset|pattern> <message>
          const patternArg = args[2];
          if (!patternArg) {
            return ctx.reply('❌ Please specify a preset or cron pattern.\n\nExample: `/schedule create recurring daily-9am Your message here`', { parse_mode: 'Markdown' });
          }

          let cronPattern;
          let cronDescription;

          // Check if it's a preset
          if (CRON_PRESETS[patternArg]) {
            cronPattern = CRON_PRESETS[patternArg].pattern;
            cronDescription = CRON_PRESETS[patternArg].description;
          } else {
            // Try to use as cron pattern
            if (!isValidCronPattern(patternArg)) {
              return ctx.reply('❌ Invalid cron pattern.\n\nUse a preset like `daily-9am` or a valid cron pattern like `0 9 * * *`\n\nUse `/schedule create recurring` for help.', { parse_mode: 'Markdown' });
            }
            cronPattern = patternArg;
            cronDescription = describeCronPattern(patternArg);
          }

          // Find where message starts
          const commandPart = `/schedule create recurring ${patternArg}`;
          messageStartIndex = fullText.indexOf(commandPart) + commandPart.length;
          let message = fullText.substring(messageStartIndex).trim();

          // Remove options from message
          message = message.replace(/--all/g, '').replace(/--notes="[^"]+"/g, '').trim();

          if (!message) {
            return ctx.reply('❌ Please provide a message to announce.');
          }

          // Create scheduled announcement
          const announcement = new ScheduledAnnouncement({
            message,
            createdBy: ctx.from.id.toString(),
            createdByAlias: user.alias,
            scheduleType: 'recurring',
            cronPattern,
            cronDescription,
            target: options.target,
            notes: options.notes,
          });

          await announcement.save();

          logger.logModeration(ctx.from.id.toString(), null, 'schedule_create_recurring', {
            announcementId: announcement._id.toString(),
            cronPattern,
            cronDescription,
            target: options.target,
          });

          let reply = '✅ Recurring announcement scheduled\\!\n\n';
          reply += formatScheduledAnnouncement(announcement, true);

          return ctx.reply(reply, { parse_mode: 'MarkdownV2' });
        }
      }

      // View scheduled announcement
      if (subcommand === 'view') {
        const idArg = args[1];
        if (!idArg) {
          return ctx.reply('❌ Please specify announcement ID.\n\nExample: `/schedule view a1b2c3`', { parse_mode: 'Markdown' });
        }

        // Find by partial ID match
        const announcements = await ScheduledAnnouncement.find({});
        const announcement = announcements.find(a => a._id.toString().endsWith(idArg));

        if (!announcement) {
          return ctx.reply(`❌ Announcement #${idArg} not found.`);
        }

        const text = formatScheduledAnnouncement(announcement, true);
        return ctx.reply(text, { parse_mode: 'MarkdownV2' });
      }

      // Pause scheduled announcement
      if (subcommand === 'pause') {
        const idArg = args[1];
        if (!idArg) {
          return ctx.reply('❌ Please specify announcement ID.\n\nExample: `/schedule pause a1b2c3`', { parse_mode: 'Markdown' });
        }

        const announcements = await ScheduledAnnouncement.find({});
        const announcement = announcements.find(a => a._id.toString().endsWith(idArg));

        if (!announcement) {
          return ctx.reply(`❌ Announcement #${idArg} not found.`);
        }

        if (!announcement.active) {
          return ctx.reply(`⏸ Announcement #${idArg.slice(-6)} is already paused.`);
        }

        announcement.active = false;
        await announcement.save();

        logger.logModeration(ctx.from.id.toString(), null, 'schedule_pause', {
          announcementId: announcement._id.toString(),
        });

        return ctx.reply(`⏸ Paused announcement #${idArg.slice(-6)}.`);
      }

      // Resume scheduled announcement
      if (subcommand === 'resume') {
        const idArg = args[1];
        if (!idArg) {
          return ctx.reply('❌ Please specify announcement ID.\n\nExample: `/schedule resume a1b2c3`', { parse_mode: 'Markdown' });
        }

        const announcements = await ScheduledAnnouncement.find({});
        const announcement = announcements.find(a => a._id.toString().endsWith(idArg));

        if (!announcement) {
          return ctx.reply(`❌ Announcement #${idArg} not found.`);
        }

        if (announcement.active) {
          return ctx.reply(`✅ Announcement #${idArg.slice(-6)} is already active.`);
        }

        announcement.active = true;
        await announcement.save();

        logger.logModeration(ctx.from.id.toString(), null, 'schedule_resume', {
          announcementId: announcement._id.toString(),
        });

        return ctx.reply(`✅ Resumed announcement #${idArg.slice(-6)}.`);
      }

      // Delete scheduled announcement
      if (subcommand === 'delete') {
        const idArg = args[1];
        if (!idArg) {
          return ctx.reply('❌ Please specify announcement ID.\n\nExample: `/schedule delete a1b2c3`', { parse_mode: 'Markdown' });
        }

        const announcements = await ScheduledAnnouncement.find({});
        const announcement = announcements.find(a => a._id.toString().endsWith(idArg));

        if (!announcement) {
          return ctx.reply(`❌ Announcement #${idArg} not found.`);
        }

        await ScheduledAnnouncement.deleteOne({ _id: announcement._id });

        logger.logModeration(ctx.from.id.toString(), null, 'schedule_delete', {
          announcementId: announcement._id.toString(),
        });

        return ctx.reply(`🗑 Deleted announcement #${idArg.slice(-6)}.`);
      }

      // Test scheduled announcement (send now)
      if (subcommand === 'test') {
        const idArg = args[1];
        if (!idArg) {
          return ctx.reply('❌ Please specify announcement ID.\n\nExample: `/schedule test a1b2c3`', { parse_mode: 'Markdown' });
        }

        const announcements = await ScheduledAnnouncement.find({});
        const announcement = announcements.find(a => a._id.toString().endsWith(idArg));

        if (!announcement) {
          return ctx.reply(`❌ Announcement #${idArg} not found.`);
        }

        // Send just to the admin for testing
        await ctx.reply(`📤 *Test Announcement*\n\nThis is how it will appear:\n\n────────────\n${announcement.message}`, { parse_mode: 'Markdown' });

        return ctx.reply('✅ Test sent! This is how the announcement will look to recipients.');
      }

      // Help
      if (subcommand === 'help') {
        let helpText = '📋 *Scheduled Announcements Help*\n\n';
        helpText += '*Commands:*\n';
        helpText += '• `/schedule list` \\- List all scheduled announcements\n';
        helpText += '• `/schedule create` \\- Create a new announcement\n';
        helpText += '• `/schedule view <id>` \\- View announcement details\n';
        helpText += '• `/schedule pause <id>` \\- Pause an announcement\n';
        helpText += '• `/schedule resume <id>` \\- Resume a paused announcement\n';
        helpText += '• `/schedule delete <id>` \\- Delete an announcement\n';
        helpText += '• `/schedule test <id>` \\- Send test to yourself\n\n';
        helpText += 'Use `/schedule create` for detailed creation help\\.';

        return ctx.reply(helpText, { parse_mode: 'MarkdownV2' });
      }

      // Unknown subcommand
      return ctx.reply('❌ Unknown subcommand.\n\nUse `/schedule help` for available commands.', { parse_mode: 'Markdown' });

    } catch (error) {
      logger.error(`Error in schedule command: ${error.message}`);
      return ctx.reply('❌ An error occurred while processing your request.');
    }
  });
}

export { meta, register, sendScheduledAnnouncement };
