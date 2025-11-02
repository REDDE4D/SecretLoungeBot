import Setting from "../../models/Setting.js";
import Invite from "../../models/Invite.js";
import { joinLobby, leaveLobby, getUserMeta, registerUser } from "../../users/index.js";

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
