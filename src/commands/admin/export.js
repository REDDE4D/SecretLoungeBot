import { User } from '../../models/User.js';
import { Activity } from '../../models/Activity.js';
import RelayedMessage from '../../models/RelayedMessage.js';
import Report from '../../models/Report.js';
import Poll from '../../models/Poll.js';
import Block from '../../models/Block.js';
import AuditLog from '../../models/AuditLog.js';
import SpamDetection from '../../models/SpamDetection.js';
import PinnedMessage from '../../models/PinnedMessage.js';
import { Preferences } from '../../models/Preferences.js';
import ScheduledAnnouncement from '../../models/ScheduledAnnouncement.js';
import Setting from '../../models/Setting.js';
import logger from '../../utils/logger.js';
import { escapeMarkdownV2 } from '../../utils/sanitize.js';
import { findUserIdByAlias, getUserMeta } from '../../users/index.js';

export const meta = {
  commands: ['export', 'backup'],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Export bot data for backup or GDPR compliance',
  usage: '/export <type> [options]',
  showInMenu: false,
};

/**
 * Export all user data
 */
async function exportUsers() {
  const users = await User.find({}).lean();
  const activities = await Activity.find({}).lean();
  const preferences = await Preferences.find({}).lean();
  const blocks = await Block.find({}).lean();
  const spamDetections = await SpamDetection.find({}).lean();

  // Build activity map
  const activityMap = {};
  activities.forEach(act => {
    activityMap[act.userId] = act;
  });

  // Build preferences map
  const preferencesMap = {};
  preferences.forEach(pref => {
    preferencesMap[pref.userId] = pref;
  });

  // Build blocks map
  const blocksMap = {};
  blocks.forEach(block => {
    if (!blocksMap[block.userId]) {
      blocksMap[block.userId] = [];
    }
    blocksMap[block.userId].push(block.blockedUserId);
  });

  // Build spam detection map
  const spamMap = {};
  spamDetections.forEach(spam => {
    spamMap[spam.userId] = spam;
  });

  // Combine all user data
  const exportData = users.map(user => {
    const userData = {
      userId: user._id,
      alias: user.alias,
      icon: user.icon,
      inLobby: user.inLobby,
      role: user.role,
      registeredAt: user.registeredAt,
      joinedAt: user.joinedAt,
      lastLeftAt: user.lastLeftAt
    };

    // Add activity data
    if (activityMap[user._id]) {
      userData.activity = {
        status: activityMap[user._id].status,
        lastActive: activityMap[user._id].lastActive,
        totalMessages: activityMap[user._id].totalMessages,
        totalReplies: activityMap[user._id].totalReplies,
        totalTextMessages: activityMap[user._id].totalTextMessages,
        totalMediaMessages: activityMap[user._id].totalMediaMessages
      };
    }

    // Add preferences
    if (preferencesMap[user._id]) {
      userData.preferences = {
        compactMode: preferencesMap[user._id].compactMode,
        hideStatusAnnouncements: preferencesMap[user._id].hideStatusAnnouncements,
        hideJoinLeaveAnnouncements: preferencesMap[user._id].hideJoinLeaveAnnouncements,
        notificationPreference: preferencesMap[user._id].notificationPreference,
        autoMarkRead: preferencesMap[user._id].autoMarkRead
      };
    }

    // Add blocks (count only, not actual IDs for privacy)
    if (blocksMap[user._id]) {
      userData.blockedUsersCount = blocksMap[user._id].length;
    }

    // Add spam violations
    if (spamMap[user._id]) {
      userData.spamViolations = {
        violationCount: spamMap[user._id].violationCount,
        lastViolation: spamMap[user._id].lastViolation,
        autoMutedUntil: spamMap[user._id].autoMutedUntil
      };
    }

    // Add moderation info
    if (user.mutedUntil) userData.mutedUntil = user.mutedUntil;
    if (user.bannedUntil) userData.bannedUntil = user.bannedUntil;
    if (user.warnings) userData.warnings = user.warnings;
    if (user.mediaRestricted) userData.mediaRestricted = user.mediaRestricted;

    return userData;
  });

  return {
    exportType: 'users',
    exportDate: new Date().toISOString(),
    totalUsers: exportData.length,
    data: exportData
  };
}

/**
 * Export message history
 * @param {number} days - Number of days to export (0 = all time)
 */
async function exportMessages(days = 0) {
  const query = {};

  if (days > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    query.relayedAt = { $gte: cutoffDate };
  }

  const messages = await RelayedMessage.find(query)
    .sort({ relayedAt: 1 })
    .lean();

  // Group by unique original messages
  const messageMap = {};
  messages.forEach(msg => {
    const key = `${msg.originalUserId}_${msg.originalMsgId}`;
    if (!messageMap[key]) {
      messageMap[key] = {
        originalUserId: msg.originalUserId,
        originalMsgId: msg.originalMsgId,
        messageType: msg.messageType,
        caption: msg.caption,
        albumId: msg.albumId,
        relayedAt: msg.relayedAt,
        recipientCount: 0
      };
    }
    messageMap[key].recipientCount++;
  });

  const uniqueMessages = Object.values(messageMap);

  return {
    exportType: 'messages',
    exportDate: new Date().toISOString(),
    timeRange: days > 0 ? `last ${days} days` : 'all time',
    totalMessages: uniqueMessages.length,
    totalRelayedCopies: messages.length,
    data: uniqueMessages
  };
}

/**
 * Export full backup (all data)
 * @param {number} days - Number of days for messages (0 = all time)
 */
async function exportFull(days = 0) {
  const userData = await exportUsers();
  const messageData = await exportMessages(days);

  // Export additional data
  const reports = await Report.find({}).lean();
  const polls = await Poll.find({}).lean();
  const auditLogs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(1000).lean();
  const pinnedMessages = await PinnedMessage.find({}).lean();
  const reactions = await Reaction.find({}).lean();
  const scheduledAnnouncements = await ScheduledAnnouncement.find({}).lean();
  const settings = await Setting.findOne({ _id: 'global' }).lean();

  return {
    exportType: 'full',
    exportDate: new Date().toISOString(),
    timeRange: days > 0 ? `messages from last ${days} days` : 'all data',
    users: userData,
    messages: messageData,
    statistics: {
      totalReports: reports.length,
      totalPolls: polls.length,
      totalAuditLogs: auditLogs.length,
      totalPinnedMessages: pinnedMessages.length,
      totalReactions: reactions.length,
      totalScheduledAnnouncements: scheduledAnnouncements.length
    },
    reports: reports.map(r => ({
      reportId: r._id,
      reporterId: r.reporterId,
      reportedUserId: r.reportedUserId,
      reportedAlias: r.reportedAlias,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      resolvedBy: r.resolvedBy,
      resolutionAction: r.resolutionAction
    })),
    polls: polls.map(p => ({
      pollId: p._id,
      creatorId: p.creatorId,
      question: p.question,
      optionCount: p.options.length,
      totalVotes: p.totalVotes,
      isActive: p.isActive,
      isAnonymous: p.isAnonymous,
      allowMultipleChoice: p.allowMultipleChoice,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt
    })),
    auditLogs: auditLogs.map(log => ({
      action: log.action,
      moderatorId: log.moderatorId,
      moderatorAlias: log.moderatorAlias,
      targetUserId: log.targetUserId,
      targetAlias: log.targetAlias,
      timestamp: log.timestamp,
      details: log.details
    })),
    pinnedMessages: pinnedMessages.map(pin => ({
      pinId: pin.pinId,
      message: pin.message,
      pinnedBy: pin.pinnedBy,
      pinnedAt: pin.pinnedAt
    })),
    reactions: reactions.map(r => ({
      originalUserId: r.originalUserId,
      originalMsgId: r.originalMsgId,
      reactionCounts: Object.keys(r.reactions).map(emoji => ({
        emoji,
        count: r.reactions.get(emoji).length
      }))
    })),
    scheduledAnnouncements: scheduledAnnouncements.map(sa => ({
      scheduleId: sa.scheduleId,
      type: sa.type,
      message: sa.message,
      schedule: sa.schedule,
      isActive: sa.isActive,
      targetLobbyOnly: sa.targetLobbyOnly,
      createdBy: sa.createdBy,
      createdAt: sa.createdAt,
      sendCount: sa.sendCount,
      lastSentAt: sa.lastSentAt
    })),
    globalSettings: settings ? {
      inviteOnly: settings.inviteOnly,
      slowmodeEnabled: settings.slowmodeEnabled,
      slowmodeSeconds: settings.slowmodeSeconds,
      maintenanceMode: settings.maintenanceMode,
      welcomeEnabled: settings.welcomeEnabled,
      antispamEnabled: settings.antispamEnabled
    } : null
  };
}

/**
 * Export specific user's data (GDPR compliance)
 * @param {string} userId - User ID to export
 */
async function exportUserData(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    return null;
  }

  const activity = await Activity.findOne({ userId }).lean();
  const preferences = await Preferences.findOne({ userId }).lean();
  const blocks = await Block.find({ userId }).lean();
  const spamDetection = await SpamDetection.findOne({ userId }).lean();

  // Get all messages sent by this user
  const sentMessages = await RelayedMessage.find({ originalUserId: userId })
    .sort({ relayedAt: 1 })
    .lean();

  // Group by unique messages
  const messageMap = {};
  sentMessages.forEach(msg => {
    const key = `${msg.originalMsgId}`;
    if (!messageMap[key]) {
      messageMap[key] = {
        messageId: msg.originalMsgId,
        messageType: msg.messageType,
        caption: msg.caption,
        relayedAt: msg.relayedAt
      };
    }
  });

  // Get reports involving this user
  const reportsBy = await Report.find({ reporterId: userId }).lean();
  const reportsAgainst = await Report.find({ reportedUserId: userId }).lean();

  // Get polls created by user
  const polls = await Poll.find({ creatorId: userId }).lean();

  // Get audit logs involving this user
  const auditLogs = await AuditLog.find({
    $or: [
      { moderatorId: userId },
      { targetUserId: userId }
    ]
  }).sort({ timestamp: -1 }).lean();

  return {
    exportType: 'user_gdpr',
    exportDate: new Date().toISOString(),
    userId: user._id,
    personalData: {
      alias: user.alias,
      icon: user.icon,
      inLobby: user.inLobby,
      role: user.role,
      registeredAt: user.registeredAt,
      joinedAt: user.joinedAt,
      lastLeftAt: user.lastLeftAt,
      mutedUntil: user.mutedUntil,
      bannedUntil: user.bannedUntil,
      warnings: user.warnings,
      mediaRestricted: user.mediaRestricted
    },
    activity: activity ? {
      status: activity.status,
      lastActive: activity.lastActive,
      totalMessages: activity.totalMessages,
      totalReplies: activity.totalReplies,
      totalTextMessages: activity.totalTextMessages,
      totalMediaMessages: activity.totalMediaMessages
    } : null,
    preferences: preferences ? {
      compactMode: preferences.compactMode,
      hideStatusAnnouncements: preferences.hideStatusAnnouncements,
      hideJoinLeaveAnnouncements: preferences.hideJoinLeaveAnnouncements,
      notificationPreference: preferences.notificationPreference,
      autoMarkRead: preferences.autoMarkRead
    } : null,
    blockedUsers: blocks.map(b => b.blockedUserId),
    spamViolations: spamDetection ? {
      violationCount: spamDetection.violationCount,
      lastViolation: spamDetection.lastViolation,
      autoMutedUntil: spamDetection.autoMutedUntil
    } : null,
    messagesSent: {
      totalUniqueMessages: Object.keys(messageMap).length,
      messages: Object.values(messageMap)
    },
    reports: {
      reportsMade: reportsBy.length,
      reportsReceived: reportsAgainst.length,
      reportsMadeList: reportsBy.map(r => ({
        reportId: r._id,
        reportedUserId: r.reportedUserId,
        reportedAlias: r.reportedAlias,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt
      })),
      reportsReceivedList: reportsAgainst.map(r => ({
        reportId: r._id,
        reporterId: r.reporterId,
        reason: r.reason,
        status: r.status,
        resolutionAction: r.resolutionAction,
        createdAt: r.createdAt
      }))
    },
    polls: polls.map(p => ({
      pollId: p._id,
      question: p.question,
      options: p.options.map(o => ({
        text: o.text,
        voteCount: o.votes.length
      })),
      isActive: p.isActive,
      createdAt: p.createdAt
    })),
    moderationHistory: {
      totalActions: auditLogs.length,
      actionsAsModerator: auditLogs.filter(log => log.moderatorId === userId).length,
      actionsAsTarget: auditLogs.filter(log => log.targetUserId === userId).length,
      recentActions: auditLogs.slice(0, 50).map(log => ({
        action: log.action,
        role: log.moderatorId === userId ? 'moderator' : 'target',
        timestamp: log.timestamp,
        details: log.details
      }))
    }
  };
}

/**
 * Send export file to admin
 */
async function sendExportFile(ctx, data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(jsonString, 'utf-8');

  await ctx.replyWithDocument(
    { source: buffer, filename },
    {
      caption: `✅ *Export Complete*\n\n` +
        `📁 File: \`${filename}\`\n` +
        `📊 Size: ${(buffer.length / 1024).toFixed(2)} KB\n` +
        `⏰ Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}`,
      parse_mode: 'Markdown'
    }
  );
}

/**
 * Register command
 */
function register(bot) {
  bot.command(['export', 'backup'], async (ctx) => {
    const userId = ctx.from.id.toString();
    const user = await User.findById(userId);

    // Check admin permission
    if (!user || user.role !== 'admin') {
      return ctx.reply('❌ This command is only available to administrators.');
    }

    const args = ctx.message.text.split(/\s+/).slice(1);
    const subcommand = args[0]?.toLowerCase();

    try {
      // Show help
      if (!subcommand || subcommand === 'help') {
        const helpText = `📦 *Backup/Export System*

Export bot data for backup or GDPR compliance\\. All exports are in JSON format\\.

*Commands:*
\`/export users\` \\- Export all user data
\`/export messages [days]\` \\- Export message history
  \\• Without days: export all messages
  \\• With days: export last N days \\(e\\.g\\., \`/export messages 30\`\\)
\`/export full [days]\` \\- Export everything \\(users \\+ messages \\+ settings\\)
\`/export user <alias>\` \\- Export specific user's data \\(GDPR\\)

*Examples:*
\`/export users\` \\- All user data
\`/export messages 7\` \\- Last 7 days of messages
\`/export full\` \\- Complete backup
\`/export user alice\` \\- Alice's personal data

*Note:* Large exports may take a few moments to generate\\.`;

        return ctx.reply(helpText, { parse_mode: 'MarkdownV2' });
      }

      // Export users
      if (subcommand === 'users') {
        await ctx.reply('⏳ Generating user data export...');

        const exportData = await exportUsers();
        const filename = `users_export_${Date.now()}.json`;

        await sendExportFile(ctx, exportData, filename);

        logger.logCommand(userId, user.alias, 'export_users', { totalUsers: exportData.totalUsers });
        logger.logModeration(userId, user.alias, null, null, 'export_users', { totalUsers: exportData.totalUsers });

        return;
      }

      // Export messages
      if (subcommand === 'messages') {
        const days = parseInt(args[1]) || 0;

        if (days < 0) {
          return ctx.reply('❌ Days must be a positive number or 0 for all time.');
        }

        await ctx.reply(`⏳ Generating message history export${days > 0 ? ` (last ${days} days)` : ' (all time)'}...`);

        const exportData = await exportMessages(days);
        const filename = `messages_export_${days > 0 ? `${days}d_` : ''}${Date.now()}.json`;

        await sendExportFile(ctx, exportData, filename);

        logger.logCommand(userId, user.alias, 'export_messages', { days, totalMessages: exportData.totalMessages });
        logger.logModeration(userId, user.alias, null, null, 'export_messages', { days, totalMessages: exportData.totalMessages });

        return;
      }

      // Export full backup
      if (subcommand === 'full') {
        const days = parseInt(args[1]) || 0;

        if (days < 0) {
          return ctx.reply('❌ Days must be a positive number or 0 for all time.');
        }

        await ctx.reply('⏳ Generating full backup... This may take a moment.');

        const exportData = await exportFull(days);
        const filename = `full_backup_${Date.now()}.json`;

        await sendExportFile(ctx, exportData, filename);

        logger.logCommand(userId, user.alias, 'export_full', {
          days,
          totalUsers: exportData.users.totalUsers,
          totalMessages: exportData.messages.totalMessages
        });
        logger.logModeration(userId, user.alias, null, null, 'export_full', {
          days,
          totalUsers: exportData.users.totalUsers,
          totalMessages: exportData.messages.totalMessages
        });

        return;
      }

      // Export specific user (GDPR)
      if (subcommand === 'user') {
        const alias = args[1];

        if (!alias) {
          return ctx.reply('❌ Usage: `/export user <alias>`\n\nExample: `/export user alice`');
        }

        const userId = await findUserIdByAlias(alias);
        if (!userId) {
          return ctx.reply(`❌ User "${escapeMarkdownV2(alias)}" not found\\.`, { parse_mode: 'MarkdownV2' });
        }

        const targetUser = await getUserMeta(userId);
        if (!targetUser) {
          return ctx.reply(`❌ User "${escapeMarkdownV2(alias)}" not found\\.`, { parse_mode: 'MarkdownV2' });
        }

        await ctx.reply(`⏳ Generating GDPR export for ${escapeMarkdownV2(targetUser.alias)}...`, { parse_mode: 'MarkdownV2' });

        const exportData = await exportUserData(targetUser._id);

        if (!exportData) {
          return ctx.reply('❌ Failed to generate user export.');
        }

        const filename = `user_${targetUser.alias}_${Date.now()}.json`;

        await sendExportFile(ctx, exportData, filename);

        logger.logCommand(userId, user.alias, 'export_user', {
          targetUserId: targetUser._id,
          targetAlias: targetUser.alias
        });
        logger.logModeration(userId, user.alias, targetUser._id, targetUser.alias, 'export_user', {});

        return;
      }

      // Unknown subcommand
      return ctx.reply(`❌ Unknown export type: "${subcommand}"\n\nUse \`/export help\` to see available options.`);

    } catch (error) {
      logger.error('Export command error:', error);
      return ctx.reply('❌ An error occurred while generating the export. Please try again.');
    }
  });
}

export { register };
