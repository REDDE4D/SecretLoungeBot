// src/commands/user/deleteme.js
import { deleteUserData } from "../../users/index.js";

export const meta = {
  commands: ["deleteme"],
  category: "user",
  roleRequired: null,
  description: "Permanently delete all your data from the bot",
  usage: "/deleteme",
  showInMenu: true,
};

export function register(bot) {
  // Main command - show confirmation prompt
  bot.command("deleteme", async (ctx) => {
    try {
      const userId = String(ctx.from.id);

      // Create inline keyboard with confirmation buttons
      const keyboard = [
        [
          {
            text: "✅ Yes, delete my data",
            callback_data: `deleteme:confirm:${userId}`,
          },
          {
            text: "❌ Cancel",
            callback_data: `deleteme:cancel:${userId}`,
          },
        ],
      ];

      await ctx.reply(
        "⚠️ <b>WARNING: This action is irreversible!</b>\n\n" +
          "This will permanently:\n" +
          "• Clear your alias and profile\n" +
          "• Remove you from the lobby\n" +
          "• Reset all your statistics\n" +
          "• Anonymize all your messages and activity\n" +
          "• Remove you from all polls and reports\n\n" +
          "Your messages will remain visible but will no longer be linked to your account.\n\n" +
          "You can re-register after deletion, but you will start fresh.\n\n" +
          "<b>Are you sure you want to continue?</b>",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: keyboard,
          },
        }
      );
    } catch (error) {
      console.error("Error in /deleteme command:", error);
      ctx.reply("❌ An error occurred. Please try again later.");
    }
  });

  // Handle callback queries for confirmation
  bot.action(/^deleteme:(confirm|cancel):(.+)$/, async (ctx) => {
    try {
      const action = ctx.match[1]; // "confirm" or "cancel"
      const targetUserId = ctx.match[2]; // userId from callback data
      const requesterId = String(ctx.from.id); // Who clicked the button

      // Security check: only the user who initiated can confirm/cancel
      if (targetUserId !== requesterId) {
        return ctx.answerCbQuery("❌ This action is not for you.", {
          show_alert: true,
        });
      }

      // Remove the keyboard
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      if (action === "cancel") {
        await ctx.answerCbQuery("Cancelled");
        await ctx.reply("✅ Deletion cancelled. Your data remains intact.");
        return;
      }

      // Confirm action
      if (action === "confirm") {
        await ctx.answerCbQuery("Processing...");

        // Show processing message
        const processingMsg = await ctx.reply(
          "🔄 Deleting your data... This may take a moment."
        );

        try {
          // Execute deletion
          const summary = await deleteUserData(requesterId);

          // Build success message with summary
          let message = "✅ <b>Your data has been successfully deleted.</b>\n\n";
          message += "<b>Summary:</b>\n";
          message += `• User profile: ${summary.userCleared ? "Cleared" : "No changes"}\n`;
          message += `• Activity stats: ${summary.activityCleared ? "Cleared" : "No changes"}\n`;
          message += `• Message links: ${summary.relayedMessagesUpdated} updated\n`;
          message += `• Quote links: ${summary.quoteLinksUpdated} updated\n`;
          message += `• Reports: ${summary.reportsUpdated} anonymized\n`;
          message += `• Polls created: ${summary.pollsUpdated} anonymized\n`;
          message += `• Poll votes: ${summary.pollVotesRemoved} removed\n\n`;
          message +=
            "You can still use the bot and re-register anytime with /start.";

          // Delete processing message and send success
          await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
          await ctx.reply(message, { parse_mode: "HTML" });
        } catch (error) {
          console.error("Error deleting user data:", error);

          // Delete processing message and send error
          await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
          await ctx.reply(
            "❌ An error occurred while deleting your data. Please try again later or contact an admin."
          );
        }
      }
    } catch (error) {
      console.error("Error handling deleteme callback:", error);
      ctx.answerCbQuery("❌ An error occurred", { show_alert: true });
    }
  });
}
