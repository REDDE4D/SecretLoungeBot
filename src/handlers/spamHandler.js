import SpamDetection from '../models/SpamDetection.js';
import Setting from '../models/Setting.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Spam Handler
 * Detects and prevents spam patterns in lobby messages
 *
 * Features:
 * - Flood detection (repeated identical/similar messages)
 * - Link spam detection (suspicious URLs)
 * - Rapid-fire detection (burst messaging)
 * - Auto-temporary mute with escalation
 */

// Default thresholds (can be configured via admin commands)
const DEFAULT_CONFIG = {
  // Flood detection
  floodEnabled: true,
  floodMaxIdentical: 3,           // Max identical messages in window
  floodSimilarityThreshold: 0.85,  // 85% similarity = flood
  floodTimeWindow: 30 * 1000,      // 30 seconds

  // Link spam detection
  linkSpamEnabled: true,
  linkSpamMaxLinks: 3,             // Max links in message
  linkSpamMaxLinksInWindow: 5,     // Max links in time window
  linkSpamTimeWindow: 60 * 1000,   // 1 minute

  // Rapid-fire detection
  rapidFireEnabled: true,
  rapidFireMaxMessages: 10,        // Max messages per window
  rapidFireTimeWindow: 60 * 1000,  // 1 minute

  // Auto-mute settings
  autoMuteEnabled: true,
  notifyAdmins: true
};

// In-memory config cache (updated from database)
let config = { ...DEFAULT_CONFIG };

/**
 * Load spam detection configuration from database
 */
async function loadConfig() {
  try {
    const settings = await Setting.findOne({ _id: 'global' });

    if (settings && settings.spamDetectionConfig) {
      config = { ...DEFAULT_CONFIG, ...settings.spamDetectionConfig };
    }
  } catch (error) {
    logger.error('Failed to load spam detection config', { error: error.message });
  }
}

/**
 * Save spam detection configuration to database
 */
async function saveConfig() {
  try {
    await Setting.findOneAndUpdate(
      { _id: 'global' },
      { $set: { spamDetectionConfig: config } },
      { upsert: true }
    );
  } catch (error) {
    logger.error('Failed to save spam detection config', { error: error.message });
  }
}

/**
 * Update configuration value
 */
async function updateConfig(key, value) {
  if (key in config) {
    config[key] = value;
    await saveConfig();
    return true;
  }
  return false;
}

/**
 * Get current configuration
 */
function getConfig() {
  return { ...config };
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  // Edge cases
  if (len1 === 0) return 0;
  if (len2 === 0) return 0;

  // Create matrix
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  // Fill matrix
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);

  return 1 - (distance / maxLen);
}

/**
 * Extract URLs from text
 */
function extractUrls(text) {
  if (!text) return [];

  const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(com|net|org|io|co|app|me|tv|gg)[^\s]*/gi;
  const matches = text.match(urlRegex) || [];

  return matches;
}

/**
 * Check if message contains suspicious links
 */
function containsSuspiciousLinks(text) {
  const urls = extractUrls(text);

  // Suspicious patterns
  const suspiciousPatterns = [
    /bit\.ly|tinyurl|goo\.gl/i,      // URL shorteners
    /discord\.gg|discord\.com\/invite/i, // Discord invites
    /t\.me\/|telegram\.me\//i,        // Telegram links
    /\.(ru|cn|tk|ml|ga|cf|gq)$/i,   // Suspicious TLDs
    /free|win|prize|click|download/i // Suspicious words in URL
  ];

  for (const url of urls) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check for flood (repeated identical/similar messages)
 */
async function checkFlood(userId, messageText) {
  if (!config.floodEnabled) return null;
  if (!messageText || messageText.trim().length === 0) return null;

  const record = await SpamDetection.getOrCreate(userId);

  // Clean old data first
  record.cleanOldData();

  // Get recent messages within time window
  const now = new Date();
  const windowStart = new Date(now - config.floodTimeWindow);

  const recentMessages = record.recentMessages.filter(msg =>
    msg.timestamp > windowStart
  );

  // Check for identical messages
  let identicalCount = 0;
  let similarCount = 0;

  for (const msg of recentMessages) {
    const similarity = calculateSimilarity(messageText, msg.content);

    if (similarity === 1) {
      identicalCount++;
    } else if (similarity >= config.floodSimilarityThreshold) {
      similarCount++;
    }
  }

  // Violation detected
  if (identicalCount >= config.floodMaxIdentical) {
    return {
      type: 'flood',
      reason: `Identical message repeated ${identicalCount + 1} times`,
      details: `Message: "${messageText.substring(0, 50)}..."`
    };
  }

  if (similarCount >= config.floodMaxIdentical) {
    return {
      type: 'flood',
      reason: `Similar messages repeated ${similarCount + 1} times`,
      details: `Message: "${messageText.substring(0, 50)}..."`
    };
  }

  return null;
}

/**
 * Check for link spam
 */
async function checkLinkSpam(userId, messageText) {
  if (!config.linkSpamEnabled) return null;
  if (!messageText) return null;

  const urls = extractUrls(messageText);

  // Check for too many links in single message
  if (urls.length > config.linkSpamMaxLinks) {
    return {
      type: 'linkSpam',
      reason: `Message contains ${urls.length} links (max ${config.linkSpamMaxLinks})`,
      details: urls.slice(0, 3).join(', ')
    };
  }

  // Check for suspicious links
  if (containsSuspiciousLinks(messageText)) {
    return {
      type: 'linkSpam',
      reason: 'Message contains suspicious link',
      details: urls.slice(0, 3).join(', ')
    };
  }

  // Check for too many links in time window
  if (urls.length > 0) {
    const record = await SpamDetection.getOrCreate(userId);

    const now = new Date();
    const windowStart = new Date(now - config.linkSpamTimeWindow);

    const recentMessages = record.recentMessages.filter(msg =>
      msg.timestamp > windowStart && msg.hasLinks
    );

    const totalLinks = recentMessages.reduce((sum, msg) => {
      const msgUrls = extractUrls(msg.content);
      return sum + msgUrls.length;
    }, urls.length);

    if (totalLinks > config.linkSpamMaxLinksInWindow) {
      return {
        type: 'linkSpam',
        reason: `Too many links in ${config.linkSpamTimeWindow / 1000}s (${totalLinks} links)`,
        details: `Current: ${urls.length}, Recent: ${totalLinks - urls.length}`
      };
    }
  }

  return null;
}

/**
 * Check for rapid-fire messaging
 */
async function checkRapidFire(userId) {
  if (!config.rapidFireEnabled) return null;

  const record = await SpamDetection.getOrCreate(userId);

  const now = new Date();
  const windowStart = new Date(now - config.rapidFireTimeWindow);

  // Count messages in time window
  const recentCount = record.messageTimestamps.filter(ts =>
    ts > windowStart
  ).length;

  if (recentCount >= config.rapidFireMaxMessages) {
    return {
      type: 'rapidFire',
      reason: `${recentCount + 1} messages in ${config.rapidFireTimeWindow / 1000}s`,
      details: `Max allowed: ${config.rapidFireMaxMessages}`
    };
  }

  return null;
}

/**
 * Check message for spam (main entry point)
 * @param {String} userId - Telegram user ID
 * @param {String} messageText - Message text content
 * @returns {Object|null} - Violation object or null if clean
 */
async function checkSpam(userId, messageText) {
  try {
    // Check if user is whitelisted
    const isWhitelisted = await SpamDetection.isWhitelisted(userId);
    if (isWhitelisted) return null;

    // Check if user has admin/mod/whitelist role (exempt from spam checks)
    const user = await User.findById(userId);
    if (user && ['admin', 'mod', 'whitelist'].includes(user.role)) {
      return null;
    }

    // Run all checks
    const floodViolation = await checkFlood(userId, messageText);
    if (floodViolation) return floodViolation;

    const linkSpamViolation = await checkLinkSpam(userId, messageText);
    if (linkSpamViolation) return linkSpamViolation;

    const rapidFireViolation = await checkRapidFire(userId);
    if (rapidFireViolation) return rapidFireViolation;

    return null;
  } catch (error) {
    logger.error('Error checking spam', { userId, error: error.message });
    return null; // Don't block on error
  }
}

/**
 * Handle spam violation (log, auto-mute, notify)
 * @param {String} userId - Telegram user ID
 * @param {Object} violation - Violation object
 * @returns {Object} - Result with mute info
 */
async function handleViolation(userId, violation) {
  try {
    const record = await SpamDetection.getOrCreate(userId);

    // Add violation and apply auto-mute
    const result = await record.addViolation(
      violation.type,
      violation.details,
      config.autoMuteEnabled
    );

    // Log violation
    logger.logModeration(
      'SYSTEM',
      userId,
      'spam_detected',
      {
        violationType: violation.type,
        reason: violation.reason,
        details: violation.details,
        muteApplied: result.muteApplied,
        muteDuration: result.muteDuration,
        level: result.level,
        totalViolations: result.totalViolations
      }
    );

    return {
      blocked: true,
      ...result,
      violation
    };
  } catch (error) {
    logger.error('Error handling spam violation', { userId, error: error.message });
    return { blocked: false };
  }
}

/**
 * Track message for spam detection
 * Call this AFTER message is allowed (for pattern tracking)
 */
async function trackMessage(userId, messageText) {
  try {
    const record = await SpamDetection.getOrCreate(userId);

    const hasLinks = extractUrls(messageText || '').length > 0;

    record.trackMessage(messageText || '', hasLinks);

    await record.save();
  } catch (error) {
    logger.error('Error tracking message for spam detection', { userId, error: error.message });
  }
}

/**
 * Check if user is currently auto-muted
 */
async function isAutoMuted(userId) {
  try {
    const record = await SpamDetection.findOne({ userId });
    if (!record) return false;

    return record.isAutoMuted();
  } catch (error) {
    logger.error('Error checking auto-mute status', { userId, error: error.message });
    return false;
  }
}

/**
 * Get remaining auto-mute time (in milliseconds)
 */
async function getAutoMuteRemaining(userId) {
  try {
    const record = await SpamDetection.findOne({ userId });
    if (!record || !record.autoMuteUntil) return 0;

    const remaining = record.autoMuteUntil - new Date();
    return Math.max(0, remaining);
  } catch (error) {
    logger.error('Error getting auto-mute remaining time', { userId, error: error.message });
    return 0;
  }
}

/**
 * Clear auto-mute for user
 */
async function clearAutoMute(userId, resetViolations = false) {
  try {
    const record = await SpamDetection.findOne({ userId });
    if (!record) return false;

    await record.clearAutoMute(resetViolations);
    return true;
  } catch (error) {
    logger.error('Error clearing auto-mute', { userId, error: error.message });
    return false;
  }
}

/**
 * Initialize spam handler (load config, schedule cleanups)
 */
async function initialize() {
  await loadConfig();

  // Schedule periodic cleanup of expired mutes (every 5 minutes)
  setInterval(async () => {
    try {
      const cleaned = await SpamDetection.cleanExpiredMutes();
      if (cleaned > 0) {
        logger.info('Cleaned expired auto-mutes', { count: cleaned });
      }
    } catch (error) {
      logger.error('Error cleaning expired mutes', { error: error.message });
    }
  }, 5 * 60 * 1000);

  logger.info('Spam handler initialized', { config });
}

export {
  initialize,
  checkSpam,
  handleViolation,
  trackMessage,
  isAutoMuted,
  getAutoMuteRemaining,
  clearAutoMute,
  getConfig,
  updateConfig,
  loadConfig,
  saveConfig
};
