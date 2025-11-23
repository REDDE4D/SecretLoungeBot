// src/commands/user/poll.js
import Poll from "../../models/Poll.js";
import { getLobbyUsers, getAlias, getIcon } from "../../users/index.js";
import { escapeHTML, renderIconHTML } from "../../utils/sanitize.js";
import { formatTimeRemaining } from "../../utils/timeFormat.js";

export const meta = {
  commands: ["poll", "endpoll", "editpoll", "pollresults"],
  category: "user",
  roleRequired: null,
  description: "Create and manage polls with advanced features",
  usage: "/poll [flags] <question> | <option1> | <option2> | ...",
  showInMenu: true,
};

export function register(bot) {
  // Create poll command
  bot.command("poll", async (ctx) => {
    try {
      const creatorId = String(ctx.from.id);
      const commandText = ctx.message.text.substring(5).trim();

      // Parse flags
      const flags = {
        multi: false, // Allow multiple choice
        public: false, // Show voter names (not anonymous)
        expires: null, // Expiration time
        editable: false, // Allow editing
      };

      let textToParse = commandText;

      // Extract flags
      const flagRegex = /--(multi|public|expires|editable)(?:=(\S+))?/g;
      let match;
      while ((match = flagRegex.exec(commandText)) !== null) {
        const flagName = match[1];
        const flagValue = match[2];

        if (flagName === "multi") {
          flags.multi = true;
        } else if (flagName === "public") {
          flags.public = true;
        } else if (flagName === "editable") {
          flags.editable = true;
        } else if (flagName === "expires" && flagValue) {
          flags.expires = parseExpiry(flagValue);
        }

        // Remove flag from text
        textToParse = textToParse.replace(match[0], "").trim();
      }

      // Parse poll format: question | option1 | option2 | option3
      const parts = textToParse.split("|").map((p) => p.trim());

      if (parts.length < 3) {
        return ctx.reply(
          "❌ Invalid poll format.\n\n" +
            "Usage: /poll [flags] <question> | <option1> | <option2> | ...\n\n" +
            "Flags:\n" +
            "  --multi          Allow multiple choice voting\n" +
            "  --public         Show voter names (default: anonymous)\n" +
            "  --expires=TIME   Auto-close after duration (e.g., 1h, 30m, 1d)\n" +
            "  --editable       Allow editing poll after creation\n\n" +
            "Example:\n" +
            "/poll What's your favorite color? | Red | Blue | Green | Yellow\n" +
            "/poll --multi --expires=1h Which features do you want? | Feature A | Feature B | Feature C\n\n" +
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

      // Validate expiry
      if (flags.expires && isNaN(flags.expires.getTime())) {
        return ctx.reply(
          "❌ Invalid expiry format. Use formats like: 30m, 1h, 2h, 1d, 7d"
        );
      }

      // Create poll
      const poll = await Poll.create({
        creatorId,
        question,
        options: optionTexts.map((text) => ({ text, votes: [] })),
        isActive: true,
        relayedMessageIds: {},
        allowMultipleChoice: flags.multi,
        isAnonymous: !flags.public,
        expiresAt: flags.expires,
        allowEditing: flags.editable,
      });

      // Get creator info
      const alias = await getAlias(creatorId);
      const icon = await getIcon(creatorId);

      // Build poll message
      const pollMessage = await buildPollMessage(poll, alias, icon);

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

      // Confirmation message
      let confirmMsg = "✅ Poll created!";
      if (flags.multi) confirmMsg += "\n• Multiple choice enabled";
      if (flags.public) confirmMsg += "\n• Public voting (names shown)";
      if (flags.expires) {
        const timeStr = formatTimeRemaining(flags.expires);
        confirmMsg += `\n• Auto-closes in ${timeStr}`;
      }
      if (flags.editable) confirmMsg += "\n• Editing enabled";

      await ctx.reply(confirmMsg);
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
      const finalMessage = await buildPollMessage(poll, alias, icon, true);

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
  bot.on("callback_query", async (ctx, next) => {
    try {
      const callbackData = ctx.callbackQuery.data;

      if (!callbackData || !callbackData.startsWith("poll:")) {
        return next(); // Pass to next handler if not a poll callback
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

      // Handle voting based on poll type
      const hasVoted = poll.options[optIdx].votes.includes(voterId);

      if (poll.allowMultipleChoice) {
        // Multi-choice: toggle vote for this option
        if (hasVoted) {
          // Remove vote
          const idx = poll.options[optIdx].votes.indexOf(voterId);
          poll.options[optIdx].votes.splice(idx, 1);
          await poll.save();
          await ctx.answerCbQuery("🗳️ Vote removed");
        } else {
          // Add vote
          poll.options[optIdx].votes.push(voterId);
          await poll.save();
          await ctx.answerCbQuery(`✅ Voted: ${poll.options[optIdx].text}`);
        }
      } else {
        // Single choice: remove previous vote if exists
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
      }

      // Update the poll message for this user
      const alias = await getAlias(poll.creatorId);
      const icon = await getIcon(poll.creatorId);
      const updatedMessage = await buildPollMessage(poll, alias, icon);
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

  // Edit poll command
  bot.command("editpoll", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const args = ctx.message.text.substring(9).trim();

      if (!args) {
        return ctx.reply(
          "❌ Usage: /editpoll <pollId> <field> <value>\n\n" +
            "Fields:\n" +
            "  question    - Change the poll question\n" +
            "  option1-6   - Change an option text\n\n" +
            "Example:\n" +
            "/editpoll 123abc question What's your favorite fruit?\n" +
            "/editpoll 123abc option1 Apples"
        );
      }

      const parts = args.split(" ");
      if (parts.length < 3) {
        return ctx.reply("❌ Invalid format. Use: /editpoll <pollId> <field> <value>");
      }

      const pollId = parts[0];
      const field = parts[1].toLowerCase();
      const value = parts.slice(2).join(" ");

      // Find poll
      const poll = await Poll.findById(pollId);

      if (!poll) {
        return ctx.reply("❌ Poll not found.");
      }

      // Check if user is the creator
      if (poll.creatorId !== userId) {
        return ctx.reply("❌ You can only edit your own polls.");
      }

      // Check if poll allows editing
      if (!poll.allowEditing) {
        return ctx.reply("❌ This poll does not allow editing. Create polls with --editable flag to allow editing.");
      }

      // Check if poll is active
      if (!poll.isActive) {
        return ctx.reply("❌ Cannot edit a closed poll.");
      }

      // Apply edit
      if (field === "question") {
        if (value.length > 200) {
          return ctx.reply("❌ Question is too long (max 200 characters).");
        }
        poll.question = value;
      } else if (field.match(/^option[1-6]$/)) {
        const optionIndex = parseInt(field.substring(6)) - 1;
        if (optionIndex < 0 || optionIndex >= poll.options.length) {
          return ctx.reply("❌ Invalid option number.");
        }
        if (value.length > 100) {
          return ctx.reply("❌ Option text is too long (max 100 characters).");
        }
        poll.options[optionIndex].text = value;
      } else {
        return ctx.reply("❌ Invalid field. Use 'question' or 'option1-6'.");
      }

      await poll.save();

      // Update all relayed messages
      const alias = await getAlias(poll.creatorId);
      const icon = await getIcon(poll.creatorId);
      const updatedMessage = await buildPollMessage(poll, alias, icon);
      const keyboard = buildPollKeyboard(poll);

      let updateCount = 0;
      for (const [recipientId, messageId] of poll.relayedMessageIds.entries()) {
        try {
          await ctx.telegram.editMessageText(recipientId, messageId, null, updatedMessage, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });
          updateCount++;
        } catch (err) {
          console.error(`Failed to update poll for user ${recipientId}:`, err.message);
        }
      }

      await ctx.reply(`✅ Poll updated successfully. ${updateCount} messages updated.`);
    } catch (err) {
      console.error("Error editing poll:", err);
      await ctx.reply("❌ Error editing poll.");
    }
  });

  // Poll results command
  bot.command("pollresults", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const pollId = ctx.message.text.substring(12).trim();

      if (!pollId) {
        return ctx.reply(
          "❌ Usage: /pollresults <pollId>\n\n" +
            "Shows detailed poll results including voter names for public polls."
        );
      }

      // Find poll
      const poll = await Poll.findById(pollId);

      if (!poll) {
        return ctx.reply("❌ Poll not found.");
      }

      // Get creator info
      const creatorAlias = await getAlias(poll.creatorId);
      const creatorIcon = await getIcon(poll.creatorId);

      // Build detailed results message
      const header = `${renderIconHTML(creatorIcon)} <b>${escapeHTML(creatorAlias)}</b>`;
      const status = poll.isActive ? "📊 <b>POLL RESULTS</b>" : "📊 <b>POLL RESULTS (CLOSED)</b>";
      const question = escapeHTML(poll.question);

      let message = `${header}\n${status}\n\n<b>${question}</b>\n\n`;

      // Poll metadata
      message += `<i>Type: ${poll.allowMultipleChoice ? "Multi-choice" : "Single-choice"}</i>\n`;
      message += `<i>Visibility: ${poll.isAnonymous ? "Anonymous" : "Public"}</i>\n`;
      if (poll.expiresAt && poll.isActive) {
        const timeLeft = formatTimeRemaining(poll.expiresAt);
        message += `<i>Expires in: ${timeLeft}</i>\n`;
      }
      message += `\n`;

      const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

      for (let i = 0; i < poll.options.length; i++) {
        const option = poll.options[i];
        const voteCount = option.votes.length;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

        const barLength = Math.floor(percentage / 10);
        const bar = "█".repeat(barLength) + "░".repeat(10 - barLength);

        message += `<b>${i + 1}. ${escapeHTML(option.text)}</b>\n`;
        message += `   ${bar} ${percentage}% (${voteCount} vote${voteCount !== 1 ? "s" : ""})\n`;

        // Show voter names if poll is public
        if (!poll.isAnonymous && option.votes.length > 0) {
          const voterAliases = await Promise.all(
            option.votes.map(async (voterId) => {
              const alias = await getAlias(voterId);
              return alias || "Unknown";
            })
          );
          message += `   <i>Voters: ${escapeHTML(voterAliases.join(", "))}</i>\n`;
        } else if (poll.isAnonymous) {
          message += `   <i>Voters: Hidden (anonymous poll)</i>\n`;
        }

        message += `\n`;
      }

      message += `<b>Total votes: ${totalVotes}</b>\n`;
      message += `<i>Poll ID: ${poll._id}</i>`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (err) {
      console.error("Error showing poll results:", err);
      await ctx.reply("❌ Error retrieving poll results.");
    }
  });
}

/**
 * Build poll message text
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

  // Show expiry if set and active
  if (poll.isActive && poll.expiresAt) {
    const now = new Date();
    if (poll.expiresAt > now) {
      const timeLeft = formatTimeRemaining(poll.expiresAt);
      message += `⏰ <i>Closes in ${timeLeft}</i>\n\n`;
    }
  }

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

  if (poll.isActive) {
    const voteText = poll.allowMultipleChoice
      ? "Tap options to vote (multiple allowed)"
      : "Tap an option to vote";
    message += `\n<i>${voteText}</i>`;
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

/**
 * Parse expiry time string (e.g., "30m", "1h", "2d")
 */
function parseExpiry(expiryStr) {
  const regex = /^(\d+)([mhd])$/;
  const match = expiryStr.match(regex);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const now = new Date();
  let expiresAt = new Date(now);

  switch (unit) {
    case "m": // minutes
      expiresAt.setMinutes(expiresAt.getMinutes() + value);
      break;
    case "h": // hours
      expiresAt.setHours(expiresAt.getHours() + value);
      break;
    case "d": // days
      expiresAt.setDate(expiresAt.getDate() + value);
      break;
    default:
      return null;
  }

  return expiresAt;
}
