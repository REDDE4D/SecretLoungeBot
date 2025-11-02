import { getAlias, getIcon, findUserIdByAlias, isInLobby } from "../../users/index.js";
import { relayMessage } from "../../relay.js";

export const meta = {
  commands: ["msg", "dm", "sign", "s"],
  category: "user",
  roleRequired: null,
  description: "Send private anonymous message or sign messages",
  usage: "/msg <alias> <message> or /sign <message>",
  showInMenu: true,
};

export function register(bot) {
  // Private message handler (/msg, /dm)
  const msgHandler = async (ctx) => {
    const [, alias, ...msgParts] = ctx.message.text.split(" ");
    const msg = msgParts.join(" ");

    if (!alias || !msg) {
      return ctx.reply("Usage: /msg <alias> <message>\n\nExample: /msg Alice Hello there!");
    }

    // Trim the alias to prevent whitespace issues
    const cleanAlias = alias.trim();
    if (!cleanAlias) {
      return ctx.reply("❌ Please provide a valid alias.");
    }

    const targetId = await findUserIdByAlias(cleanAlias);
    const senderAlias = await getAlias(ctx.from.id);
    const senderIcon = await getIcon(ctx.from.id);

    if (!targetId) {
      return ctx.reply(`❌ Alias "${cleanAlias}" not found. Make sure the user has set an alias with /alias.`);
    }
    if (String(targetId) === String(ctx.from.id))
      return ctx.reply("🤨 You cannot message yourself.");

    try {
      await ctx.telegram.sendMessage(
        targetId,
        `✉️ ${senderIcon} ${senderAlias} → You\n\n${msg}`
      );
      await ctx.reply("✅ Message sent anonymously.");
    } catch (err) {
      console.error(err);
      await ctx.reply("❌ Failed to deliver message.");
    }
  };

  // Sign message handler (/sign, /s)
  const signHandler = async (ctx) => {
    const userId = ctx.from.id;

    // Check if user is in lobby
    const inLobby = await isInLobby(userId);
    if (!inLobby) {
      return ctx.reply("❌ You must be in the lobby to use this command. Use /join to enter.");
    }

    // Check if user has a Telegram username
    const username = ctx.from.username;
    if (!username) {
      return ctx.reply("❌ You must set a Telegram username in Telegram settings to use this command. Go to Settings → Profile → Username.");
    }

    // Parse message text
    const commandText = ctx.message.text;
    const parts = commandText.split(" ");
    parts.shift(); // Remove command name
    const message = parts.join(" ").trim();

    if (!message) {
      return ctx.reply("Usage: /sign <message>\n\nExample: /sign Hello everyone!");
    }

    // Modify the context message text to append the signature
    const signedMessage = `${message} -- @${username}`;
    ctx.message.text = signedMessage;

    // Relay the signed message through the standard relay system
    try {
      await relayMessage(ctx);
    } catch (err) {
      console.error("Error relaying signed message:", err);
      await ctx.reply("❌ Failed to send message.");
    }
  };

  // Register commands
  bot.command("msg", msgHandler);
  bot.command("dm", msgHandler);
  bot.command("sign", signHandler);
  bot.command("s", signHandler);
}
