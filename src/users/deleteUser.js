// src/users/deleteUser.js
import { User } from "../models/User.js";
import { Activity } from "../models/Activity.js";
import RelayedMessage from "../models/RelayedMessage.js";
import QuoteLink from "../models/QuoteLink.js";
import Report from "../models/Report.js";
import Poll from "../models/Poll.js";

/**
 * Anonymizes all user data in the database
 * This breaks all links to the user while preserving data integrity for other users
 * @param {string} userId - The Telegram user ID to delete
 * @returns {Promise<Object>} Summary of what was deleted
 */
export async function deleteUserData(userId) {
  const summary = {
    userCleared: false,
    activityCleared: false,
    relayedMessagesUpdated: 0,
    quoteLinksUpdated: 0,
    reportsUpdated: 0,
    pollsUpdated: 0,
    pollVotesRemoved: 0,
  };

  try {
    // 1. Anonymize User record - reset to defaults
    const userResult = await User.updateOne(
      { _id: userId },
      {
        $set: {
          alias: null,
          icon: {
            customEmojiId: null,
            fallback: "👤",
          },
          inLobby: false,
          role: null,
          mutedUntil: null,
          bannedUntil: null,
          warnings: 0,
          mediaRestricted: false,
        },
        $unset: {
          preferences: "",
        },
      }
    );
    summary.userCleared = userResult.modifiedCount > 0;

    // 2. Clear Activity record - zero out all stats
    const activityResult = await Activity.updateOne(
      { userId },
      {
        $set: {
          status: "offline",
          lastActive: null,
          lastOnlineChange: null,
          mediaCounts: {
            first24h: 0,
            byDate: {},
          },
          totalMessages: 0,
          totalReplies: 0,
          totalTextMessages: 0,
          totalMediaMessages: 0,
        },
      }
    );
    summary.activityCleared = activityResult.modifiedCount > 0;

    // 3. Anonymize RelayedMessage records - break user linkage
    const relayedResult = await RelayedMessage.updateMany(
      { originalUserId: userId },
      { $set: { originalUserId: "deleted_user" } }
    );
    summary.relayedMessagesUpdated = relayedResult.modifiedCount;

    // 4. Anonymize QuoteLink records - break user linkage
    const quoteLinkResult = await QuoteLink.updateMany(
      { originalUserId: userId },
      { $set: { originalUserId: "deleted_user", alias: "Deleted User" } }
    );
    summary.quoteLinksUpdated = quoteLinkResult.modifiedCount;

    // 5. Anonymize Reports - both as reporter and reported
    const reportResult = await Report.updateMany(
      { $or: [{ reporterId: userId }, { reportedUserId: userId }] },
      [
        {
          $set: {
            reporterId: {
              $cond: {
                if: { $eq: ["$reporterId", userId] },
                then: "deleted_user",
                else: "$reporterId",
              },
            },
            reportedUserId: {
              $cond: {
                if: { $eq: ["$reportedUserId", userId] },
                then: "deleted_user",
                else: "$reportedUserId",
              },
            },
            reportedAlias: {
              $cond: {
                if: { $eq: ["$reportedUserId", userId] },
                then: "Deleted User",
                else: "$reportedAlias",
              },
            },
          },
        },
      ]
    );
    summary.reportsUpdated = reportResult.modifiedCount;

    // 6. Anonymize Polls - update creator and remove from votes
    const pollCreatorResult = await Poll.updateMany(
      { creatorId: userId },
      { $set: { creatorId: "deleted_user" } }
    );
    summary.pollsUpdated = pollCreatorResult.modifiedCount;

    // Remove user from all poll votes
    const pollsWithVotes = await Poll.find({
      "options.votes": userId,
    });

    for (const poll of pollsWithVotes) {
      let votesRemoved = false;
      for (const option of poll.options) {
        const index = option.votes.indexOf(userId);
        if (index !== -1) {
          option.votes.splice(index, 1);
          votesRemoved = true;
          summary.pollVotesRemoved++;
        }
      }
      if (votesRemoved) {
        await poll.save();
      }
    }

    return summary;
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw error;
  }
}
