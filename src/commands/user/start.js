import { escapeMarkdownV2, escapeHTML } from "../../utils/sanitize.js";
import PinnedMessage from "../../models/PinnedMessage.js";

export const meta = {
  commands: ["start"],
  category: "user",
  roleRequired: null,
  description: "Start the bot and see info",
  usage: "/start",
  showInMenu: true,
};

export function register(bot) {
  bot.start(async (ctx) => {
    const startText = [
      "👋 *Welcome to the Anonymous Lobby Bot*",
      "━━━━━━━━━━━━━━━━━━━━",
      "",
      "A fully anonymous chat lobby\\. Messages show no sender identification\\.",
      "",
      "*🟢 Getting Started*",
      "1\\. `/join` — Join the lobby and start chatting",
      "2\\. Send messages — They'll be relayed anonymously to everyone",
      "",
      "*⚙️ Optional Setup:*",
      "`/alias <name>` — Set a display name",
      "  \\(Needed for receiving direct messages with `/msg`\\)",
      "`/icon <emoji>` — Set an emoji avatar",
      "",
      "*💬 Core Commands*",
      "`/leave` — Leave the lobby \\(stop receiving messages\\)",
      "`/online` — See how many users are in the lobby",
      "`/profile` — View your stats and achievements",
      "`/help` — See full command list",
      "",
      "━━━━━━━━━━━━━━━━━━━━",
      "*Note:* You can join without setting an alias\\. However, ",
      "to receive private messages via `/msg`, you must set one\\.",
      "━━━━━━━━━━━━━━━━━━━━",
    ].join("\n");

    await ctx.telegram.sendMessage(ctx.chat.id, startText, {
      parse_mode: "MarkdownV2",
    });

    // Display pinned messages if any
    try {
      const pins = await PinnedMessage.getAllPins();

      if (pins.length > 0) {
        let pinnedText = `📌 <b>Pinned Messages</b>\n\n`;

        for (const pin of pins) {
          pinnedText += `${escapeHTML(pin.message)}\n\n`;
        }

        pinnedText += `<i>Use /pinned to view all pinned messages</i>`;

        await ctx.replyWithHTML(pinnedText);
      }
    } catch (err) {
      // Silently fail - don't interrupt the user experience
      console.error("Error loading pinned messages:", err);
    }
  });
}
