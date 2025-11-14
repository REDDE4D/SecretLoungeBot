import mongoose from "mongoose";
import bot from "../core/bot.js";
import { escapeHTML } from "../utils/sanitize.js";

// Helper functions to get models at runtime
const getAchievement = () => mongoose.model("Achievement");
const getUserAchievement = () => mongoose.model("UserAchievement");
const getUser = () => mongoose.model("User");
const getActivity = () => mongoose.model("Activity");

/**
 * Initialize default achievements in the database
 * Should be called on bot startup
 */
export async function initializeAchievements() {
  const Achievement = getAchievement();

  const defaultAchievements = [
    // Messaging Achievements
    {
      achievementId: "first_message",
      name: "First Words",
      description: "Send your first message in the lobby",
      icon: "💬",
      category: "messaging",
      tier: "bronze",
      points: 5,
      condition: { totalMessages: 1 },
    },
    {
      achievementId: "messages_10",
      name: "Getting Started",
      description: "Send 10 messages",
      icon: "🥉",
      category: "messaging",
      tier: "bronze",
      points: 10,
      condition: { totalMessages: 10 },
    },
    {
      achievementId: "messages_100",
      name: "Chatterbox",
      description: "Send 100 messages",
      icon: "🥈",
      category: "messaging",
      tier: "silver",
      points: 25,
      condition: { totalMessages: 100 },
    },
    {
      achievementId: "messages_500",
      name: "Conversation Master",
      description: "Send 500 messages",
      icon: "🥇",
      category: "messaging",
      tier: "gold",
      points: 50,
      condition: { totalMessages: 500 },
    },
    {
      achievementId: "messages_1000",
      name: "Legendary Chatter",
      description: "Send 1,000 messages",
      icon: "💎",
      category: "messaging",
      tier: "diamond",
      points: 100,
      condition: { totalMessages: 1000 },
    },
    {
      achievementId: "messages_5000",
      name: "Lobby Veteran",
      description: "Send 5,000 messages",
      icon: "🌟",
      category: "messaging",
      tier: "platinum",
      points: 250,
      condition: { totalMessages: 5000 },
    },

    // Social Achievements
    {
      achievementId: "replies_10",
      name: "Conversationalist",
      description: "Reply to others 10 times",
      icon: "↩️",
      category: "social",
      tier: "bronze",
      points: 15,
      condition: { totalReplies: 10 },
    },
    {
      achievementId: "replies_100",
      name: "Active Participant",
      description: "Reply to others 100 times",
      icon: "💭",
      category: "social",
      tier: "silver",
      points: 30,
      condition: { totalReplies: 100 },
    },
    {
      achievementId: "replies_500",
      name: "Discussion Expert",
      description: "Reply to others 500 times",
      icon: "🗨️",
      category: "social",
      tier: "gold",
      points: 75,
      condition: { totalReplies: 500 },
    },

    // Media Achievements
    {
      achievementId: "media_enthusiast",
      name: "Media Enthusiast",
      description: "Share 100 media messages",
      icon: "📸",
      category: "messaging",
      tier: "silver",
      points: 30,
      condition: { totalMediaMessages: 100 },
    },
    {
      achievementId: "media_master",
      name: "Media Master",
      description: "Share 500 media messages",
      icon: "🎬",
      category: "messaging",
      tier: "gold",
      points: 60,
      condition: { totalMediaMessages: 500 },
    },
    {
      achievementId: "text_master",
      name: "Wordsmith",
      description: "Send 100 text messages",
      icon: "✍️",
      category: "messaging",
      tier: "silver",
      points: 25,
      condition: { totalTextMessages: 100 },
    },
    {
      achievementId: "text_expert",
      name: "Text Expert",
      description: "Send 500 text messages",
      icon: "📝",
      category: "messaging",
      tier: "gold",
      points: 50,
      condition: { totalTextMessages: 500 },
    },

    // Tenure Achievements
    {
      achievementId: "member_1day",
      name: "Welcome!",
      description: "Be a member for 1 day",
      icon: "🎉",
      category: "tenure",
      tier: "bronze",
      points: 5,
      condition: { daysInLobby: 1 },
    },
    {
      achievementId: "member_1week",
      name: "One Week Strong",
      description: "Be a member for 1 week",
      icon: "🆕",
      category: "tenure",
      tier: "bronze",
      points: 10,
      condition: { daysInLobby: 7 },
    },
    {
      achievementId: "member_1month",
      name: "Monthly Regular",
      description: "Be a member for 1 month",
      icon: "📅",
      category: "tenure",
      tier: "silver",
      points: 25,
      condition: { daysInLobby: 30 },
    },
    {
      achievementId: "member_3months",
      name: "Seasoned Member",
      description: "Be a member for 3 months",
      icon: "🎖️",
      category: "tenure",
      tier: "gold",
      points: 50,
      condition: { daysInLobby: 90 },
    },
    {
      achievementId: "member_6months",
      name: "Dedicated Member",
      description: "Be a member for 6 months",
      icon: "🏅",
      category: "tenure",
      tier: "gold",
      points: 75,
      condition: { daysInLobby: 180 },
    },
    {
      achievementId: "member_1year",
      name: "Anniversary",
      description: "Be a member for 1 year",
      icon: "🎂",
      category: "tenure",
      tier: "platinum",
      points: 150,
      condition: { daysInLobby: 365 },
    },

    // Milestone Achievements
    {
      achievementId: "early_bird",
      name: "Early Bird",
      description: "Be among the first 100 members",
      icon: "🐦",
      category: "special",
      tier: "gold",
      points: 50,
      secret: true,
      condition: { memberNumber: 100 },
    },
    {
      achievementId: "top_10",
      name: "Top 10",
      description: "Reach top 10 on the leaderboard",
      icon: "🏆",
      category: "milestone",
      tier: "platinum",
      points: 100,
      condition: { rank: 10 },
    },
    {
      achievementId: "top_3",
      name: "Podium Finish",
      description: "Reach top 3 on the leaderboard",
      icon: "🥇",
      category: "milestone",
      tier: "diamond",
      points: 200,
      condition: { rank: 3 },
    },
    {
      achievementId: "number_one",
      name: "Champion",
      description: "Reach #1 on the leaderboard",
      icon: "👑",
      category: "milestone",
      tier: "diamond",
      points: 500,
      secret: true,
      condition: { rank: 1 },
    },

    // Special Achievements
    {
      achievementId: "night_owl",
      name: "Night Owl",
      description: "Send 50 messages between midnight and 5 AM",
      icon: "🦉",
      category: "special",
      tier: "silver",
      points: 30,
      secret: true,
      condition: { nightMessages: 50 },
    },
    {
      achievementId: "early_riser",
      name: "Early Riser",
      description: "Send 50 messages between 5 AM and 8 AM",
      icon: "🌅",
      category: "special",
      tier: "silver",
      points: 30,
      secret: true,
      condition: { morningMessages: 50 },
    },
    {
      achievementId: "active_streak_7",
      name: "Weekly Streak",
      description: "Be active for 7 days in a row",
      icon: "🔥",
      category: "special",
      tier: "gold",
      points: 50,
      condition: { activeStreak: 7 },
    },
    {
      achievementId: "active_streak_30",
      name: "Monthly Streak",
      description: "Be active for 30 days in a row",
      icon: "🌟",
      category: "special",
      tier: "platinum",
      points: 150,
      condition: { activeStreak: 30 },
    },

    // Role Achievements
    {
      achievementId: "role_mod",
      name: "Moderator",
      description: "Become a moderator",
      icon: "🛡️",
      category: "role",
      tier: "gold",
      points: 100,
      condition: { role: "mod" },
    },
    {
      achievementId: "role_admin",
      name: "Administrator",
      description: "Become an administrator",
      icon: "👑",
      category: "role",
      tier: "platinum",
      points: 200,
      condition: { role: "admin" },
    },
  ];

  for (const achievement of defaultAchievements) {
    try {
      await Achievement.findOneAndUpdate(
        { achievementId: achievement.achievementId },
        achievement,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error(`Failed to initialize achievement ${achievement.achievementId}:`, err.message);
    }
  }

  console.log(`✅ Initialized ${defaultAchievements.length} achievements`);
}

/**
 * Check if user has earned an achievement
 * @param {string} userId - User ID
 * @param {string} achievementId - Achievement ID
 * @returns {Promise<boolean>}
 */
export async function hasAchievement(userId, achievementId) {
  const UserAchievement = getUserAchievement();
  const existing = await UserAchievement.findOne({ userId, achievementId });
  return !!existing;
}

/**
 * Award an achievement to a user
 * @param {string} userId - User ID
 * @param {string} achievementId - Achievement ID
 * @param {boolean} notify - Whether to send notification (default: true)
 * @returns {Promise<Object|null>} Achievement object if newly awarded, null if already had it
 */
export async function awardAchievement(userId, achievementId, notify = true) {
  const UserAchievement = getUserAchievement();
  const Achievement = getAchievement();

  // Check if user already has this achievement
  if (await hasAchievement(userId, achievementId)) {
    return null;
  }

  // Award the achievement
  const userAchievement = await UserAchievement.create({
    userId,
    achievementId,
    notified: false,
  });

  // Get achievement details
  const achievement = await Achievement.findOne({ achievementId }).lean();

  if (notify && achievement) {
    await notifyAchievement(userId, achievement);
    userAchievement.notified = true;
    await userAchievement.save();
  }

  console.log(`🏆 Achievement unlocked: ${userId} earned "${achievement?.name || achievementId}"`);

  return achievement;
}

/**
 * Send achievement notification to user
 * @param {string} userId - User ID
 * @param {Object} achievement - Achievement object
 */
async function notifyAchievement(userId, achievement) {
  try {
    const message = [
      `🎉 <b>Achievement Unlocked!</b>`,
      "",
      `${achievement.icon} <b>${escapeHTML(achievement.name)}</b>`,
      escapeHTML(achievement.description),
      "",
      `<i>+${achievement.points} points</i>`,
    ].join("\n");

    await bot.telegram.sendMessage(userId, message, { parse_mode: "HTML" });
  } catch (err) {
    if (err.response?.error_code === 403) {
      console.log(`User ${userId} has blocked the bot, skipping achievement notification`);
    } else {
      console.error(`Failed to send achievement notification to ${userId}:`, err.message);
    }
  }
}

/**
 * Check all achievements for a user based on their current stats
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of newly awarded achievements
 */
export async function checkAchievements(userId) {
  const User = getUser();
  const Activity = getActivity();
  const Achievement = getAchievement();

  const user = await User.findById(userId).lean();
  const activity = await Activity.findOne({ userId }).lean();

  if (!user || !activity) return [];

  const newAchievements = [];

  // Calculate stats
  const totalMessages = activity.totalMessages || 0;
  const totalReplies = activity.totalReplies || 0;
  const totalMediaMessages = activity.totalMediaMessages || 0;
  const totalTextMessages = activity.totalTextMessages || 0;
  const daysInLobby = activity.firstSeen
    ? Math.floor((Date.now() - activity.firstSeen.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get all achievements
  const allAchievements = await Achievement.find({}).lean();

  for (const achievement of allAchievements) {
    // Skip if already awarded
    if (await hasAchievement(userId, achievement.achievementId)) {
      continue;
    }

    let shouldAward = false;

    // Check conditions based on achievement type
    const condition = achievement.condition || {};

    if (condition.totalMessages && totalMessages >= condition.totalMessages) {
      shouldAward = true;
    } else if (condition.totalReplies && totalReplies >= condition.totalReplies) {
      shouldAward = true;
    } else if (condition.totalMediaMessages && totalMediaMessages >= condition.totalMediaMessages) {
      shouldAward = true;
    } else if (condition.totalTextMessages && totalTextMessages >= condition.totalTextMessages) {
      shouldAward = true;
    } else if (condition.daysInLobby && daysInLobby >= condition.daysInLobby) {
      shouldAward = true;
    } else if (condition.role && user.role === condition.role) {
      shouldAward = true;
    }

    if (shouldAward) {
      const awarded = await awardAchievement(userId, achievement.achievementId);
      if (awarded) {
        newAchievements.push(awarded);
      }
    }
  }

  return newAchievements;
}

/**
 * Get all achievements earned by a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of achievement objects
 */
export async function getUserAchievements(userId) {
  const UserAchievement = getUserAchievement();
  const Achievement = getAchievement();

  const userAchievements = await UserAchievement.find({ userId })
    .sort({ unlockedAt: -1 })
    .lean();

  const achievementIds = userAchievements.map((ua) => ua.achievementId);
  const achievements = await Achievement.find({
    achievementId: { $in: achievementIds },
  }).lean();

  // Merge with unlock times
  return achievements.map((achievement) => {
    const userAchievement = userAchievements.find(
      (ua) => ua.achievementId === achievement.achievementId
    );
    return {
      ...achievement,
      unlockedAt: userAchievement?.unlockedAt,
    };
  });
}

/**
 * Get total achievement points for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
export async function getUserAchievementPoints(userId) {
  const achievements = await getUserAchievements(userId);
  return achievements.reduce((sum, achievement) => sum + (achievement.points || 0), 0);
}

/**
 * Get achievement progress statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
export async function getAchievementStats(userId) {
  const Achievement = getAchievement();
  const achievements = await getUserAchievements(userId);
  const totalAchievements = await Achievement.countDocuments({});

  return {
    earned: achievements.length,
    total: totalAchievements,
    points: await getUserAchievementPoints(userId),
    percentage: totalAchievements > 0 ? Math.round((achievements.length / totalAchievements) * 100) : 0,
  };
}
