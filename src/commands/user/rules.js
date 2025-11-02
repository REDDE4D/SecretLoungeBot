import Setting from "../../models/Setting.js";
import { escapeHTML } from "../../utils/sanitize.js";

export const meta = {
  commands: ["rules"],
  category: "user",
  roleRequired: null,
  description: "View lobby rules",
  usage: "/rules",
  showInMenu: true,
};

export function register(bot) {
  bot.command("rules", async (ctx) => {
    try {
      const settings = await Setting.findById("global");
      const rules = settings?.rules || [];

      if (rules.length === 0) {
        await ctx.replyWithHTML("📋 <b>No rules have been set yet.</b>");
        return;
      }

      const rulesList = rules
        .map((rule, index) => `${rule.emoji} ${escapeHTML(rule.text)}`)
        .join("\n\n");

      await ctx.replyWithHTML(
        `📋 <b>Lobby Rules</b>\n\n${rulesList}\n\n<i>Please follow these rules to maintain a positive environment.</i>`
      );
    } catch (err) {
      console.error("Error fetching rules:", err);
      await ctx.reply("❌ Failed to fetch rules. Please try again later.");
    }
  });
}
