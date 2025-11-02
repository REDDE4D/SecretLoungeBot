// src/commands/user/poll.js
import Poll from "../../models/Poll.js";
import { getLobbyUsers, getAlias, getIcon } from "../../users/index.js";
import { escapeHTML, renderIconHTML } from "../../utils/sanitize.js";

export const meta = {
  commands: ["poll", "endpoll"],
  category: "user",
  roleRequired: null,
  description: "Create anonymous polls",
  usage: "/poll <question> | <option1> | <option2> | ...",
  showInMenu: true,
};

export function register(bot) {
  // Create poll command
  bot.command("poll", async (ctx) => {
    try {
      const creatorId = String(ctx.from.id);
      const commandText = ctx.message.text;

      // Parse poll format: /poll question | option1 | option2 | option3
      const parts = commandText.substring(5).trim().split("|").map((p) => p.trim());

      if (parts.length < 3) {
        return ctx.reply(
          "❌ Invalid poll format.\n\n" +
            "Usage: /poll <question> | <option1> | <option2> | ...\n\n" +
            "Example:\n" +
            "/poll What's your favorite color? | Red | Blue | Green | Yellow\n\n" +
            "You can have 2-6 options."
        );
      }

      const question = parts[0];
      const optionTexts = parts.slice(1);

      if (optionTexts.length < 2 || optionTexts.length > 6) {
        return ctx.reply("❌ Polls must have between 2 and 6 options.");
      }

      if (question.length > 200) {
        return ctx.reply("❌ Question is too long (max 200 characters).");
      }

      for (const opt of optionTexts) {
        if (opt.length > 100) {
          return ctx.reply("❌ Options are too long (max 100 characters each).");
        }
      }

      // Create poll
      const poll = await Poll.create({
        creatorId,
        question,
        options: optionTexts.map((text) => ({ text, votes: [] })),
        isActive: true,
        relayedMessageIds: {},
      });

      // Get creator info
      const alias = await getAlias(creatorId);
      const icon = await getIcon(creatorId);

      // Build poll message
      const pollMessage = buildPollMessage(poll, alias, icon);

      // Create inline keyboard
      const keyboard = buildPollKeyboard(poll);

      // Get all lobby users
      const lobbyUsers = await getLobbyUsers();

      // Send poll to all lobby users
      for (const userId of lobbyUsers) {
        try {
          const sent = await ctx.telegram.sendMessage(userId, pollMessage, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });

          // Store message ID for later updates
          poll.relayedMessageIds.set(userId, sent.message_id);
        } catch (err) {
          console.error(`Failed to send poll to user ${userId}:`, err.message);
        }
      }

      // Save message IDs
      await poll.save();
    } catch (err) {
      console.error("Error creating poll:", err);
      await ctx.reply("❌ Error creating poll.");
    }
  });

  // End poll command
  bot.command("endpoll", async (ctx) => {
    try {
      const userId = String(ctx.from.id);

      // Find user's active polls
      const activePolls = await Poll.find({
        creatorId: userId,
        isActive: true,
      }).sort({ createdAt: -1 });

      if (activePolls.length === 0) {
        return ctx.reply("❌ You have no active polls to close.");
      }

      // Close the most recent poll
      const poll = activePolls[0];
      poll.isActive = false;
      poll.closedAt = new Date();
      await poll.save();

      // Update all relayed messages to show results
      const alias = await getAlias(poll.creatorId);
      const icon = await getIcon(poll.creatorId);
      const finalMessage = buildPollMessage(poll, alias, icon, true);

      for (const [userId, messageId] of poll.relayedMessageIds.entries()) {
        try {
          await ctx.telegram.editMessageText(userId, messageId, null, finalMessage, {
            parse_mode: "HTML",
          });
        } catch (err) {
          console.error(`Failed to update poll message for user ${userId}:`, err.message);
        }
      }

      await ctx.reply(`✅ Poll closed. Final results sent to all users.`);
    } catch (err) {
      console.error("Error ending poll:", err);
      await ctx.reply("❌ Error closing poll.");
    }
  });

  // Handle poll votes via callback queries
  bot.on("callback_query", async (ctx) => {
    try {
      const callbackData = ctx.callbackQuery.data;

      if (!callbackData || !callbackData.startsWith("poll:")) {
        return;
      }

      const [, pollId, optionIndex] = callbackData.split(":");
      const voterId = String(ctx.from.id);

      // Find poll
      const poll = await Poll.findById(pollId);

      if (!poll) {
        return ctx.answerCbQuery("❌ Poll not found.");
      }

      if (!poll.isActive) {
        return ctx.answerCbQuery("❌ This poll is closed.");
      }

      const optIdx = parseInt(optionIndex);

      if (isNaN(optIdx) || optIdx < 0 || optIdx >= poll.options.length) {
        return ctx.answerCbQuery("❌ Invalid option.");
      }

      // Check if user already voted
      let previousVote = -1;
      for (let i = 0; i < poll.options.length; i++) {
        const idx = poll.options[i].votes.indexOf(voterId);
        if (idx !== -1) {
          previousVote = i;
          poll.options[i].votes.splice(idx, 1);
          break;
        }
      }

      // Add new vote
      if (previousVote === optIdx) {
        // User clicked same option - remove vote
        await poll.save();
        await ctx.answerCbQuery("🗳️ Vote removed");
      } else {
        poll.options[optIdx].votes.push(voterId);
        await poll.save();
        await ctx.answerCbQuery(`✅ Voted: ${poll.options[optIdx].text}`);
      }

      // Update the poll message for this user
      const alias = await getAlias(poll.creatorId);
      const icon = await getIcon(poll.creatorId);
      const updatedMessage = buildPollMessage(poll, alias, icon);
      const keyboard = buildPollKeyboard(poll);

      try {
        await ctx.editMessageText(updatedMessage, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: keyboard,
          },
        });
      } catch (err) {
        // Message not modified error is fine
        if (!err.message.includes("message is not modified")) {
          console.error("Error updating poll message:", err.message);
        }
      }
    } catch (err) {
      console.error("Error handling poll vote:", err);
      await ctx.answerCbQuery("❌ Error processing vote.");
    }
  });
}

/**
 * Build poll message text
 */
function buildPollMessage(poll, creatorAlias, creatorIcon, showResults = false) {
  const header = `${renderIconHTML(creatorIcon)} <b>${escapeHTML(creatorAlias)}</b>`;
  const status = poll.isActive ? "📊 <b>POLL</b>" : "📊 <b>POLL (CLOSED)</b>";
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

    message += `\n`;
  }

  message += `<i>Total votes: ${totalVotes}</i>`;

  if (poll.isActive) {
    message += `\n<i>Tap an option to vote</i>`;
  }

  return message;
}

/**
 * Build inline keyboard for poll voting
 */
function buildPollKeyboard(poll) {
  if (!poll.isActive) {
    return [];
  }

  const keyboard = [];

  for (let i = 0; i < poll.options.length; i++) {
    keyboard.push([
      {
        text: `${i + 1}. ${poll.options[i].text}`,
        callback_data: `poll:${poll._id}:${i}`,
      },
    ]);
  }

  return keyboard;
}
