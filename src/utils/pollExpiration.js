// src/utils/pollExpiration.js
import Poll from "../models/Poll.js";
import { getAlias, getIcon } from "../users/index.js";
import { escapeHTML, renderIconHTML } from "../utils/sanitize.js";
import bot from "../core/bot.js";
import logger from "../utils/logger.js";

/**
 * Check for expired polls and close them automatically
 * Runs every 5 minutes
 */
export async function checkExpiredPolls() {
  try {
    const now = new Date();

    // Find all active polls that have expired
    const expiredPolls = await Poll.find({
      isActive: true,
      expiresAt: { $lte: now, $ne: null },
    });

    if (expiredPolls.length === 0) {
      return;
    }

    logger.info(`Found ${expiredPolls.length} expired poll(s), closing...`);

    for (const poll of expiredPolls) {
      try {
        // Close the poll
        poll.isActive = false;
        poll.closedAt = now;
        await poll.save();

        // Get creator info
        const alias = await getAlias(poll.creatorId);
        const icon = await getIcon(poll.creatorId);

        // Build final message with results
        const finalMessage = await buildPollMessage(poll, alias, icon, true);

        // Update all relayed messages
        let updateCount = 0;
        for (const [userId, messageId] of poll.relayedMessageIds.entries()) {
          try {
            await bot.telegram.editMessageText(userId, messageId, null, finalMessage, {
              parse_mode: "HTML",
            });
            updateCount++;
          } catch (err) {
            // Silently fail if message can't be updated (user might have deleted it)
            if (!err.message.includes("message to edit not found")) {
              logger.error(`Failed to update expired poll message for user ${userId}`, {
                error: err.message,
                pollId: poll._id,
              });
            }
          }
        }

        logger.info(`Poll expired and closed`, {
          pollId: poll._id,
          question: poll.question.substring(0, 50),
          updatedMessages: updateCount,
          totalMessages: poll.relayedMessageIds.size,
        });

        // Notify creator
        try {
          await bot.telegram.sendMessage(
            poll.creatorId,
            `⏰ Your poll has expired and been closed:\n\n<b>${escapeHTML(poll.question)}</b>`,
            { parse_mode: "HTML" }
          );
        } catch (err) {
          // Silently fail if can't notify creator
          logger.debug(`Could not notify poll creator ${poll.creatorId}`, {
            error: err.message,
          });
        }
      } catch (err) {
        logger.error(`Error closing expired poll ${poll._id}`, {
          error: err.message,
          stack: err.stack,
        });
      }
    }
  } catch (err) {
    logger.error("Error checking expired polls", {
      error: err.message,
      stack: err.stack,
    });
  }
}

/**
 * Build poll message text with results
 */
async function buildPollMessage(poll, creatorAlias, creatorIcon, showResults = false) {
  const header = `${renderIconHTML(creatorIcon)} <b>${escapeHTML(creatorAlias)}</b>`;
  let status = poll.isActive ? "📊 <b>POLL</b>" : "📊 <b>POLL (CLOSED)</b>";

  // Add poll type indicators
  const indicators = [];
  if (poll.allowMultipleChoice) indicators.push("Multi-choice");
  else indicators.push("Single-choice");

  if (!poll.isAnonymous) indicators.push("Public");

  if (indicators.length > 0) {
    status += ` <i>(${indicators.join(", ")})</i>`;
  }

  const question = escapeHTML(poll.question);

  let message = `${header}\n${status}\n\n<b>${question}</b>\n\n`;

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  for (let i = 0; i < poll.options.length; i++) {
    const option = poll.options[i];
    const voteCount = option.votes.length;
    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

    const barLength = Math.floor(percentage / 10);
    const bar = "█".repeat(barLength) + "░".repeat(10 - barLength);

    message += `${i + 1}. ${escapeHTML(option.text)}\n`;

    if (showResults || !poll.isActive) {
      message += `   ${bar} ${percentage}% (${voteCount} vote${voteCount !== 1 ? "s" : ""})\n`;
    } else {
      message += `   ${voteCount} vote${voteCount !== 1 ? "s" : ""}\n`;
    }

    // Show voter names for public polls (when closed or showResults)
    if (!poll.isAnonymous && (showResults || !poll.isActive) && option.votes.length > 0) {
      const voterAliases = await Promise.all(
        option.votes.slice(0, 10).map(async (voterId) => {
          const alias = await getAlias(voterId);
          return alias || "Unknown";
        })
      );

      let votersText = voterAliases.join(", ");
      if (option.votes.length > 10) {
        votersText += `, +${option.votes.length - 10} more`;
      }
      message += `   <i>Voted by: ${escapeHTML(votersText)}</i>\n`;
    }

    message += `\n`;
  }

  message += `<i>Total votes: ${totalVotes}</i>`;

  return message;
}
