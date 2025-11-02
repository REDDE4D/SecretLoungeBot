import { escapeMarkdownV2 } from "../../utils/sanitize.js";

export const meta = {
  commands: ["start"],
  category: "user",
  roleRequired: null,
  description: "Start the bot and see info",
  usage: "/start",
  showInMenu: true,
};

export function register(bot) {
  bot.start((ctx) => {
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

    ctx.telegram.sendMessage(ctx.chat.id, startText, {
      parse_mode: "MarkdownV2",
    });
  });
}
