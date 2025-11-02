import { escapeMarkdownV2 } from "../../utils/sanitize.js";

export const meta = {
  commands: ["nuke", "confirmnuke", "purge", "confirmpurge"],
  category: "admin",
  roleRequired: "admin",
  description: "Dangerous commands: database wipe and message purge",
  usage: "/nuke or /purge (requires confirmation)",
  showInMenu: false,
};

export function register(bot) {
  // Nuke - request confirmation
  bot.command("nuke", (ctx) => {
    ctx.reply(
      "*☢️ Confirm NUKE*\nThis will *wipe the entire database*\\. Type `/confirmnuke` to proceed\\.",
      { parse_mode: "MarkdownV2" }
    );
  });

  // Confirm nuke - execute database wipe
  bot.command("confirmnuke", async (ctx) => {
    try {
      await import("mongoose").then(({ default: mongoose }) =>
        mongoose.connection.dropDatabase()
      );
      ctx.reply("☢️ *Database has been nuked\\.*", {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      ctx.reply(
        `❌ Failed to nuke database: ${escapeMarkdownV2(err.message)}`,
        {
          parse_mode: "MarkdownV2",
        }
      );
    }
  });

  // Purge - request confirmation
  bot.command("purge", (ctx) => {
    ctx.reply(
      "*🧨 Confirm PURGE*\nThis will *delete all relayed messages* from users\\. Type `/confirmpurge` to proceed\\.",
      { parse_mode: "MarkdownV2" }
    );
  });

  // Confirm purge - execute message deletion
  bot.command("confirmpurge", async (ctx) => {
    try {
      const { default: RelayedMessage } = await import("../../models/RelayedMessage.js");
      const relayed = await RelayedMessage.find({});
      const count = await RelayedMessage.deleteMany({});

      for (const msg of relayed) {
        try {
          const chatId = msg.chatId || msg.targetChatId || msg.userId;
          if (!chatId) {
            continue;
          }
          await ctx.telegram.deleteMessage(chatId, msg.messageId);
        } catch (err) {
          // Silently fail
        }
      }

      ctx.reply("🧨 *All relayed messages have been purged\\.*", {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      ctx.reply(
        `❌ Failed to purge relayed messages: ${escapeMarkdownV2(err.message)}`,
        {
          parse_mode: "MarkdownV2",
        }
      );
    }
  });
}
