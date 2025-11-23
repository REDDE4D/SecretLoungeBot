/**
 * Karma Service
 *
 * Handles karma transactions, cooldowns, limits, and statistics.
 */

import { User } from "../models/User.js";
import Karma from "../models/Karma.js";
import { checkAchievements } from "./achievementService.js";
import bot from "../core/bot.js";
import { getAlias } from "../users/index.js";

// Configuration
const COOLDOWN_HOURS = 24; // Hours before same user can give karma to same person again
const DAILY_LIMIT = 10; // Maximum karma points a user can give per day
const HIGH_KARMA_THRESHOLD = 50; // Karma level to show positive emoji
const LEGENDARY_THRESHOLD = 100; // Karma level for legendary emoji
const NEGATIVE_THRESHOLD = -10; // Karma level to show warning emoji
const VERY_NEGATIVE_THRESHOLD = -50; // Karma level for severe negative emoji

/**
 * Process a karma trigger from a message
 *
 * @param {string} giverId - User ID giving karma
 * @param {string} receiverId - User ID receiving karma
 * @param {number} messageId - Message ID being karma'd
 * @param {string} trigger - What triggered the karma
 * @param {number} amount - Karma amount (+1 or -1)
 * @returns {Promise<Object>} - { success: boolean, message: string, karma?: number }
 */
export async function processKarmaTrigger(
  giverId,
  receiverId,
  messageId,
  trigger,
  amount
) {
  try {
    // Validate amount
    if (amount !== 1 && amount !== -1) {
      const errorMsg = "❌ Invalid karma amount";
      await sendErrorToUser(giverId, errorMsg);
      return { success: false, message: errorMsg };
    }

    // Check if giver exists and is registered
    const giver = await User.findById(giverId);
    if (!giver || !giver.alias) {
      const errorMsg = "❌ You must be registered to give karma";
      await sendErrorToUser(giverId, errorMsg);
      return { success: false, message: errorMsg };
    }

    // Check if receiver exists and is registered
    const receiver = await User.findById(receiverId);
    if (!receiver || !receiver.alias) {
      const errorMsg = "❌ Target user is not registered";
      await sendErrorToUser(giverId, errorMsg);
      return { success: false, message: errorMsg };
    }

    // Check cooldown (24h between giving karma to same person)
    const cooldownCheck = await checkCooldown(giverId, receiverId);
    if (!cooldownCheck.allowed) {
      const receiverAlias = await getAlias(receiverId);
      const errorMsg = `⏳ <b>Cooldown Active</b>\n\nYou can give karma to ${receiverAlias} again in <b>${cooldownCheck.hoursRemaining} hours</b>`;
      await sendErrorToUser(giverId, errorMsg);
      return {
        success: false,
        message: `You can give karma to this user again in ${cooldownCheck.hoursRemaining} hours`,
      };
    }

    // Check daily limit
    const dailyCheck = await checkDailyLimit(giverId);
    if (!dailyCheck.allowed) {
      const errorMsg = `⚠️ <b>Daily Limit Reached</b>\n\nYou've used all ${DAILY_LIMIT} karma points today.\nResets in <b>${dailyCheck.hoursRemaining} hours</b>`;
      await sendErrorToUser(giverId, errorMsg);
      return {
        success: false,
        message: `Daily karma limit reached (${DAILY_LIMIT} per day). Resets in ${dailyCheck.hoursRemaining} hours`,
      };
    }

    // Update receiver's karma
    receiver.karma = (receiver.karma || 0) + amount;
    await receiver.save();

    // Update giver's daily usage
    await resetDailyLimitIfNeeded(giver);
    giver.karmaGivenToday = (giver.karmaGivenToday || 0) + Math.abs(amount);
    await giver.save();

    // Record transaction
    await Karma.create({
      giverId,
      receiverId,
      amount,
      messageId,
      trigger,
    });

    // Check for achievements (fire and forget)
    checkAchievements(receiverId).catch((err) =>
      console.error("Karma achievement check error:", err.message)
    );
    checkAchievements(giverId).catch((err) =>
      console.error("Karma giver achievement check error:", err.message)
    );

    // Get aliases for notifications
    const giverAlias = await getAlias(giverId);
    const receiverAlias = await getAlias(receiverId);

    // Send confirmation to giver
    const karmaEmoji = getKarmaEmoji(receiver.karma);
    const karmaDisplay = karmaEmoji ? `${karmaEmoji} ` : "";
    const amountText = amount > 0 ? "+1" : "-1";
    const actionText = amount > 0 ? "given to" : "taken from";

    const giverMessage = [
      `✅ <b>Karma ${actionText}</b> ${receiverAlias}`,
      ``,
      `${receiverAlias}'s karma: ${karmaDisplay}<b>${receiver.karma}</b>`,
      ``,
      `<i>Daily karma remaining: ${DAILY_LIMIT - giver.karmaGivenToday}/${DAILY_LIMIT}</i>`,
    ].join("\n");

    try {
      await bot.telegram.sendMessage(giverId, giverMessage, { parse_mode: "HTML" });
    } catch (err) {
      if (err.response?.error_code !== 403) {
        console.error(`Failed to send karma confirmation to ${giverId}:`, err.message);
      }
    }

    // Send notification to receiver
    const receiverMessage = [
      amount > 0 ? `🎉 <b>You received +1 karma!</b>` : `⚠️ <b>You received -1 karma</b>`,
      ``,
      `Your karma: ${karmaDisplay}<b>${receiver.karma}</b>`,
      ``,
      `<i>Use /karma to see your full stats</i>`,
    ].join("\n");

    try {
      await bot.telegram.sendMessage(receiverId, receiverMessage, { parse_mode: "HTML" });
    } catch (err) {
      if (err.response?.error_code !== 403) {
        console.error(`Failed to send karma notification to ${receiverId}:`, err.message);
      }
    }

    return {
      success: true,
      message: `Karma ${amount > 0 ? "given" : "taken"}!`,
      karma: receiver.karma,
      giverAlias,
      receiverAlias,
    };
  } catch (error) {
    console.error("Error processing karma:", error);
    return { success: false, message: "Failed to process karma" };
  }
}

/**
 * Check if user can give karma to another user (cooldown check)
 *
 * @param {string} giverId - User ID giving karma
 * @param {string} receiverId - User ID receiving karma
 * @returns {Promise<Object>} - { allowed: boolean, hoursRemaining?: number }
 */
export async function checkCooldown(giverId, receiverId) {
  try {
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - cooldownMs);

    // Find most recent karma transaction from giver to receiver
    const recentKarma = await Karma.findOne({
      giverId,
      receiverId,
      createdAt: { $gte: cutoffTime },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!recentKarma) {
      return { allowed: true };
    }

    // Calculate hours remaining
    const timeSince = Date.now() - recentKarma.createdAt.getTime();
    const hoursRemaining = Math.ceil((cooldownMs - timeSince) / (60 * 60 * 1000));

    return {
      allowed: false,
      hoursRemaining: Math.max(1, hoursRemaining),
    };
  } catch (error) {
    console.error("Error checking cooldown:", error);
    return { allowed: true }; // Allow on error to prevent blocking
  }
}

/**
 * Check if user has exceeded daily karma limit
 *
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} - { allowed: boolean, remaining?: number, hoursRemaining?: number }
 */
export async function checkDailyLimit(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { allowed: true };
    }

    // Reset if new day
    await resetDailyLimitIfNeeded(user);

    const used = user.karmaGivenToday || 0;
    const remaining = DAILY_LIMIT - used;

    if (remaining <= 0) {
      // Calculate hours until reset (midnight)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const hoursRemaining = Math.ceil((tomorrow - now) / (60 * 60 * 1000));

      return {
        allowed: false,
        remaining: 0,
        hoursRemaining: Math.max(1, hoursRemaining),
      };
    }

    return {
      allowed: true,
      remaining,
    };
  } catch (error) {
    console.error("Error checking daily limit:", error);
    return { allowed: true }; // Allow on error
  }
}

/**
 * Reset daily karma counter if it's a new day
 *
 * @param {Object} user - User document
 */
async function resetDailyLimitIfNeeded(user) {
  const now = new Date();
  const lastReset = user.lastKarmaReset || new Date(0);

  // Check if it's a new day (midnight passed)
  const isNewDay =
    now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear();

  if (isNewDay) {
    user.karmaGivenToday = 0;
    user.lastKarmaReset = now;
    await user.save();
  }
}

/**
 * Get karma level name based on karma value
 *
 * @param {number} karma - Karma value
 * @returns {string} - Level name
 */
export function getKarmaLevel(karma) {
  if (karma >= LEGENDARY_THRESHOLD) return "legendary";
  if (karma >= HIGH_KARMA_THRESHOLD) return "high";
  if (karma >= 10) return "positive";
  if (karma > NEGATIVE_THRESHOLD) return "neutral";
  if (karma > VERY_NEGATIVE_THRESHOLD) return "negative";
  return "very_negative";
}

/**
 * Get karma emoji based on karma value
 * Only returns emoji for high positive or negative karma (minimal display)
 *
 * @param {number} karma - Karma value
 * @returns {string} - Emoji or empty string
 */
export function getKarmaEmoji(karma) {
  if (karma >= LEGENDARY_THRESHOLD) return "⭐"; // Legendary
  if (karma >= HIGH_KARMA_THRESHOLD) return "🌟"; // High positive
  if (karma <= VERY_NEGATIVE_THRESHOLD) return "💀"; // Very negative
  if (karma <= NEGATIVE_THRESHOLD) return "⚠️"; // Negative
  return ""; // Hidden for neutral/low karma
}

/**
 * Get comprehensive karma statistics for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Karma stats
 */
export async function getKarmaStats(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    const karma = user.karma || 0;
    const level = getKarmaLevel(karma);
    const emoji = getKarmaEmoji(karma);

    // Get karma received count
    const receivedCount = await Karma.countDocuments({ receiverId: userId });

    // Get karma given count
    const givenCount = await Karma.countDocuments({ giverId: userId });

    // Get top karma givers (users who gave this user the most karma)
    const topGivers = await Karma.aggregate([
      { $match: { receiverId: userId } },
      {
        $group: {
          _id: "$giverId",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 3 },
    ]);

    // Get top karma receivers (users this user gave the most karma to)
    const topReceivers = await Karma.aggregate([
      { $match: { giverId: userId } },
      {
        $group: {
          _id: "$receiverId",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 3 },
    ]);

    // Get karma rank (position in leaderboard)
    const rank = await User.countDocuments({ karma: { $gt: karma } });

    return {
      karma,
      level,
      emoji,
      receivedCount,
      givenCount,
      topGivers,
      topReceivers,
      rank: rank + 1,
      dailyRemaining: DAILY_LIMIT - (user.karmaGivenToday || 0),
    };
  } catch (error) {
    console.error("Error getting karma stats:", error);
    return null;
  }
}

/**
 * Get karma leaderboard
 *
 * @param {number} limit - Number of top users to return
 * @returns {Promise<Array>} - Top users by karma
 */
export async function getKarmaLeaderboard(limit = 10) {
  try {
    const topUsers = await User.find({ alias: { $ne: null } })
      .sort({ karma: -1 })
      .limit(limit)
      .select("_id alias karma")
      .lean();

    return topUsers.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      alias: user.alias,
      karma: user.karma || 0,
      emoji: getKarmaEmoji(user.karma || 0),
    }));
  } catch (error) {
    console.error("Error getting karma leaderboard:", error);
    return [];
  }
}

/**
 * Get total karma given by a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Total karma given
 */
export async function getTotalKarmaGiven(userId) {
  try {
    const result = await Karma.aggregate([
      { $match: { giverId: userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  } catch (error) {
    console.error("Error getting total karma given:", error);
    return 0;
  }
}

/**
 * Get total karma received by a user (should match user.karma)
 *
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Total karma received
 */
export async function getTotalKarmaReceived(userId) {
  try {
    const result = await Karma.aggregate([
      { $match: { receiverId: userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  } catch (error) {
    console.error("Error getting total karma received:", error);
    return 0;
  }
}

/**
 * Send error message to user
 *
 * @param {string} userId - User ID
 * @param {string} message - Error message
 */
async function sendErrorToUser(userId, message) {
  try {
    await bot.telegram.sendMessage(userId, message, { parse_mode: "HTML" });
  } catch (err) {
    if (err.response?.error_code !== 403) {
      console.error(`Failed to send error message to ${userId}:`, err.message);
    }
  }
}
