import "dotenv/config";
import bot from "./core/bot.js";
import "./core/runtime.js"; // Initialize runtime state (startTime)
import setupCommands from "./setupCommands.js";
import registerHandlers from "./handlers/relayHandler.js";
import { connectMongo } from "./db/mongoose.js";
import { checkCompliance } from "./users/compliance.js";
import { runAllCleanupTasks } from "./utils/cleanup.js";
import { sendMetrics } from "./metrics/sender.js";
import { escapeMarkdownV2 } from "./utils/sanitize.js";
import logger from "./utils/logger.js";
import * as spamHandler from "./handlers/spamHandler.js";
import { checkExpiredPolls } from "./utils/pollExpiration.js";
import cron from "node-cron";
import ScheduledAnnouncement from "./models/ScheduledAnnouncement.js";
import { sendScheduledAnnouncement } from "./commands/admin/schedule.js";
import { logError, shutdownLogger } from "./services/dashboardLogger.js";

// Validate required environment variables
if (!process.env.ADMIN_ID) {
  throw new Error(
    "❌ ADMIN_ID environment variable is required. Please check your .env file."
  );
}

await connectMongo();
const ADMIN_ID = process.env.ADMIN_ID;
const ERROR_NOTIFICATION_ID = process.env.ERROR_NOTIFICATION_ID || ADMIN_ID;

// Initialize spam detection handler and register commands in parallel
await Promise.all([
  spamHandler.initialize(),
  setupCommands(bot)
]);

// Register message relay
registerHandlers(bot);

// Error tracking for rate limiting and aggregation
const errorCache = new Map(); // key: error signature, value: { count, firstSeen, lastSeen, lastNotified }
const recentErrors = []; // Array of timestamps for rate limiting
const MAX_ERRORS_PER_MINUTE = 5;
const NOTIFICATION_COOLDOWN_MS = 300000; // 5 minutes per unique error

// Cleanup old error cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of errorCache.entries()) {
    if (now - value.lastSeen > NOTIFICATION_COOLDOWN_MS * 2) {
      errorCache.delete(key);
    }
  }
}, 600000);

// Catch all bot errors
bot.catch(async (err, ctx) => {
  logger.error("Bot error", { error: err.message, stack: err.stack });

  const now = Date.now();

  // Rate limiting: check if we've sent too many errors recently
  recentErrors.push(now);
  const recentCount = recentErrors.filter(t => now - t < 60000).length;

  // Clean up old timestamps
  while (recentErrors.length > 0 && now - recentErrors[0] > 60000) {
    recentErrors.shift();
  }

  if (recentCount > MAX_ERRORS_PER_MINUTE) {
    logger.warn(`Rate limit: Skipping error notification`, { recentCount });
    return;
  }

  // Extract error details
  const userId = ctx?.from?.id ?? "unknown";
  const updateType = ctx?.updateType ?? "unknown";
  const errorText = (err.message || err.toString()).slice(0, 300);

  // Extract first line of stack trace
  let stackPreview = "N/A";
  if (err.stack) {
    const stackLines = err.stack.split("\n").filter(line => line.trim().startsWith("at "));
    if (stackLines.length > 0) {
      stackPreview = stackLines[0].trim().slice(0, 100);
    }
  }

  // Create error signature for aggregation (based on error message + stack location)
  const errorSignature = `${err.name || "Error"}:${errorText.slice(0, 50)}:${stackPreview.slice(0, 50)}`;

  // Check if we've seen this error recently
  const cached = errorCache.get(errorSignature);

  if (cached) {
    cached.count++;
    cached.lastSeen = now;

    // Don't send notification if we've notified about this error recently
    if (now - cached.lastNotified < NOTIFICATION_COOLDOWN_MS) {
      logger.info(`Aggregated error`, { count: cached.count, lastNotified: Math.floor((now - cached.lastNotified) / 1000) });
      return;
    }
  } else {
    errorCache.set(errorSignature, {
      count: 1,
      firstSeen: now,
      lastSeen: now,
      lastNotified: 0
    });
  }

  // Format timestamp
  const timestamp = new Date(now).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  // Build error message
  const errorMsg = [
    `🚨 *Bot Error*`,
    `⏰ ${escapeMarkdownV2(timestamp)}`,
    `👤 User: \`${escapeMarkdownV2(String(userId))}\``,
    `📋 Type: \`${escapeMarkdownV2(updateType)}\``,
    `❌ Error: \`${escapeMarkdownV2(errorText)}\``,
    `📍 Stack: \`${escapeMarkdownV2(stackPreview)}\``,
  ];

  // Add aggregation info if this error has occurred multiple times
  if (cached && cached.count > 1) {
    const occurrenceWindow = Math.floor((now - cached.firstSeen) / 1000);
    errorMsg.push(`🔢 Occurrences: \`${cached.count}\` \\(in ${occurrenceWindow}s\\)`);
  }

  try {
    // Send notification to admin via Telegram
    await ctx.telegram.sendMessage(ERROR_NOTIFICATION_ID, errorMsg.join("\n"), {
      parse_mode: "MarkdownV2",
    });

    // Update last notified timestamp
    if (cached) {
      cached.lastNotified = now;
    } else {
      errorCache.get(errorSignature).lastNotified = now;
    }
  } catch (notifyErr) {
    logger.error("Failed to notify admin", { error: notifyErr.message });
  }

  // Log to dashboard for real-time visibility
  logError(
    errorText,
    {
      critical: true,
      updateType,
      stack: stackPreview,
      occurrences: cached ? cached.count : 1,
      errorSignature,
    },
    userId !== "unknown" ? String(userId) : null,
    "bot_error_handler"
  );
});

function scheduleDailyMidnight(fn) {
  const now = new Date();
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
    now.getTime();

  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000); // every 24h
  }, msUntilMidnight);
}

scheduleDailyMidnight(checkCompliance);
scheduleDailyMidnight(runAllCleanupTasks);
scheduleDailyMidnight(sendMetrics);

// Check for expired polls every 5 minutes
setInterval(checkExpiredPolls, 5 * 60 * 1000);
// Run immediately on startup as well
checkExpiredPolls();

// Scheduled announcements checker
async function checkScheduledAnnouncements() {
  try {
    // Check for one-time announcements that are due
    const oneTimeAnnouncements = await ScheduledAnnouncement.getActiveOneTime();

    for (const announcement of oneTimeAnnouncements) {
      try {
        await sendScheduledAnnouncement(bot, announcement);
        logger.info(`Sent one-time scheduled announcement #${announcement._id}`);

        // Log to audit trail
        logger.logModeration('system', null, 'schedule_send', {
          announcementId: announcement._id.toString(),
          scheduleType: 'once',
          target: announcement.target,
        });
      } catch (error) {
        logger.error(`Failed to send scheduled announcement #${announcement._id}: ${error.message}`);
      }
    }

    // Check for recurring announcements (we'll use cron for these)
    // This function is called by cron every minute
  } catch (error) {
    logger.error(`Error checking scheduled announcements: ${error.message}`);
  }
}

// Schedule recurring announcements using cron
async function setupRecurringAnnouncements() {
  try {
    const recurringAnnouncements = await ScheduledAnnouncement.getActiveRecurring();

    for (const announcement of recurringAnnouncements) {
      try {
        // Create a cron job for each recurring announcement
        cron.schedule(announcement.cronPattern, async () => {
          try {
            await sendScheduledAnnouncement(bot, announcement);
            logger.info(`Sent recurring scheduled announcement #${announcement._id}`);

            // Log to audit trail
            logger.logModeration('system', null, 'schedule_send', {
              announcementId: announcement._id.toString(),
              scheduleType: 'recurring',
              cronPattern: announcement.cronPattern,
              target: announcement.target,
            });
          } catch (error) {
            logger.error(`Failed to send recurring announcement #${announcement._id}: ${error.message}`);
          }
        }, {
          timezone: "Europe/Berlin" // Adjust to your timezone
        });

        logger.info(`Set up cron job for recurring announcement #${announcement._id} (${announcement.cronDescription})`);
      } catch (error) {
        logger.error(`Failed to set up cron job for announcement #${announcement._id}: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error setting up recurring announcements: ${error.message}`);
  }
}

// Check one-time announcements every minute
setInterval(checkScheduledAnnouncements, 60 * 1000);
// Run immediately on startup
checkScheduledAnnouncements();

// Set up recurring announcements on startup
setupRecurringAnnouncements();

// Re-scan for new recurring announcements every hour
setInterval(setupRecurringAnnouncements, 60 * 60 * 1000);

// Launch the bot
bot.launch({
  allowedUpdates: ['message', 'edited_message', 'message_reaction']
});

// Graceful shutdown handlers
process.once("SIGINT", async () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  await shutdownLogger();
  bot.stop("SIGINT");
});

process.once("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  await shutdownLogger();
  bot.stop("SIGTERM");
});
