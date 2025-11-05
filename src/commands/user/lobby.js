import Setting from "../../models/Setting.js";
import Invite from "../../models/Invite.js";
import PinnedMessage from "../../models/PinnedMessage.js";
import { joinLobby, leaveLobby, getUserMeta, registerUser } from "../../users/index.js";
import { escapeHTML } from "../../utils/sanitize.js";
import { convertToTelegramHTML, hasHTMLFormatting } from "../../utils/telegramHtml.js";

export const meta = {
  commands: ["join", "j", "leave", "l"],
  category: "user",
  roleRequired: null,
  description: "Join or leave the anonymous chat lobby",
  usage: "/join [code] or /j [code], /leave or /l",
  showInMenu: true,
};

export function register(bot) {
  // Join command handler
  const joinHandler = async (ctx) => {
    const input = (ctx.message.text || "").trim();
    const [, codeMaybe] = input.split(/\s+/, 2); // /join CODE?

    const setting = (await Setting.findById("global")) || { inviteOnly: false };

    if (setting.inviteOnly) {
      if (!codeMaybe) {
        return ctx.replyWithHTML(
          "🔐 The lobby is <b>invite-only</b>.\nPlease use <code>/join YOURCODE</code>."
        );
      }

      const code = codeMaybe.toUpperCase();
      const inv = await Invite.findOne({ code });
      if (!inv) return ctx.reply("❌ Invalid invite code.");
      if (!inv.active) return ctx.reply("❌ This invite has been revoked.");
      if (inv.expiresAt && inv.expiresAt.getTime() < Date.now())
        return ctx.reply("⏳ This invite has expired.");
      if (inv.usedCount >= inv.maxUses)
        return ctx.reply("♻️ This invite was already fully used.");

      // Consume a use
      inv.usedCount += 1;
      await inv.save();
    }

    // Auto-register user if they don't exist
    const userExists = await getUserMeta(ctx.from.id);
    if (!userExists) {
      const regResult = await registerUser(ctx.from.id); // Register without alias
      // Check if registration failed
      if (regResult.startsWith("❌")) {
        return ctx.reply(regResult);
      }
    }

    const res = await joinLobby(ctx.from.id);
    await ctx.reply(res);

    // Display pinned messages if user successfully joined
    if (res.includes("✅")) {
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

      // Send welcome message if enabled
      try {
        if (setting.welcomeEnabled && setting.welcomeMessage) {
          // Check if message contains HTML formatting
          if (hasHTMLFormatting(setting.welcomeMessage)) {
            // Sanitize and send as HTML
            const sanitizedHtml = convertToTelegramHTML(setting.welcomeMessage);
            await ctx.replyWithHTML(sanitizedHtml);
          } else {
            // Send as plain text
            await ctx.reply(setting.welcomeMessage);
          }
        }
      } catch (err) {
        // Silently fail - don't interrupt the user experience
        console.error("Error sending welcome message:", err);
      }
    }
  };

  // Leave command handler
  const leaveHandler = async (ctx) => {
    const result = await leaveLobby(ctx.from.id);
    ctx.reply(result);
  };

  // Register commands
  bot.command("join", joinHandler);
  bot.command("j", joinHandler);
  bot.command("leave", leaveHandler);
  bot.command("l", leaveHandler);
}
