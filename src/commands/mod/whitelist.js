import { getAlias, setRole } from "../../users/index.js";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { resolveTargetUser } from "../utils/resolvers.js";

export const meta = {
  commands: ["whitelist", "wl"],
  category: "mod",
  roleRequired: ["mod", "admin"],
  description: "Exempt user from compliance rules",
  usage: "/whitelist <alias|reply>",
  showInMenu: false,
};

export function register(bot) {
  const handler = async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const alias = args[0];

      const userId = await resolveTargetUser(ctx, alias);
      const result = await setRole(userId, "whitelist");
      const aliasRaw = await getAlias(userId);

      ctx.reply(escapeMarkdownV2(result), { parse_mode: "MarkdownV2" });
    } catch (err) {
      ctx.reply(escapeMarkdownV2(err.message || "❌ Could not resolve user."), {
        parse_mode: "MarkdownV2",
      });
    }
  };

  bot.command("whitelist", handler);
  bot.command("wl", handler);
}
