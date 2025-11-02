import Setting from "../../models/Setting.js";
import { escapeHTML } from "../../utils/sanitize.js";

export const meta = {
  commands: ["rules_add", "rules_remove", "rules_clear", "rules_list"],
  category: "admin",
  roleRequired: "admin",
  description: "Manage lobby rules",
  usage: "/rules_add <text>, /rules_remove <index>, /rules_clear, /rules_list",
  showInMenu: false,
};

export function register(bot) {
  // Helper function to extract emoji from text
  function extractEmoji(text) {
    // Match emoji at the start of the text
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u;
    const match = text.match(emojiRegex);

    if (match) {
      return {
        emoji: match[1],
        text: text.slice(match[0].length).trim()
      };
    }

    return {
      emoji: "📌",
      text: text
    };
  }

  // Add a new rule
  bot.command("rules_add", async (ctx) => {
    try {
      const text = ctx.message.text || "";
      const ruleText = text.replace(/^\/rules_add\s*/, "").trim();

      if (!ruleText) {
        await ctx.reply("Usage: /rules_add [emoji] <rule text>\nExamples:\n/rules_add 🚫 No spamming allowed\n/rules_add Be respectful");
        return;
      }

      const { emoji, text: extractedText } = extractEmoji(ruleText);

      const settings = await Setting.findById("global");
      const doc = settings || new Setting({ _id: "global" });

      if (!doc.rules) {
        doc.rules = [];
      }

      doc.rules.push({ emoji, text: extractedText });
      await doc.save();

      await ctx.replyWithHTML(
        `✅ <b>Rule added</b> (#${doc.rules.length})\n\n${emoji} ${escapeHTML(extractedText)}`
      );
    } catch (err) {
      console.error("Error adding rule:", err);
      await ctx.reply("❌ Failed to add rule. Please try again.");
    }
  });

  // Remove a rule by index
  bot.command("rules_remove", async (ctx) => {
    try {
      const args = (ctx.message.text || "").trim().split(/\s+/);
      const indexStr = args[1];

      if (!indexStr) {
        await ctx.reply("Usage: /rules_remove <index>\nExample: /rules_remove 2");
        return;
      }

      const index = parseInt(indexStr, 10) - 1; // Convert to 0-based index

      const settings = await Setting.findById("global");
      if (!settings || !settings.rules || settings.rules.length === 0) {
        await ctx.reply("❌ No rules to remove.");
        return;
      }

      if (index < 0 || index >= settings.rules.length) {
        await ctx.reply(`❌ Invalid index. Please use a number between 1 and ${settings.rules.length}.`);
        return;
      }

      const removedRule = settings.rules[index];
      settings.rules.splice(index, 1);
      await settings.save();

      await ctx.replyWithHTML(
        `🗑️ <b>Rule removed</b>\n\n${removedRule.emoji} ${escapeHTML(removedRule.text)}`
      );
    } catch (err) {
      console.error("Error removing rule:", err);
      await ctx.reply("❌ Failed to remove rule. Please try again.");
    }
  });

  // Clear all rules
  bot.command("rules_clear", async (ctx) => {
    try {
      const settings = await Setting.findById("global");
      if (!settings || !settings.rules || settings.rules.length === 0) {
        await ctx.reply("ℹ️ No rules to clear.");
        return;
      }

      const count = settings.rules.length;
      settings.rules = [];
      await settings.save();

      await ctx.replyWithHTML(`🗑️ <b>Cleared all ${count} rule(s)</b>`);
    } catch (err) {
      console.error("Error clearing rules:", err);
      await ctx.reply("❌ Failed to clear rules. Please try again.");
    }
  });

  // List all rules with indices (admin view)
  bot.command("rules_list", async (ctx) => {
    try {
      const settings = await Setting.findById("global");
      const rules = settings?.rules || [];

      if (rules.length === 0) {
        await ctx.replyWithHTML("📋 <b>No rules have been set yet.</b>");
        return;
      }

      const rulesList = rules
        .map((rule, index) => `${index + 1}. ${rule.emoji} ${escapeHTML(rule.text)}`)
        .join("\n");

      await ctx.replyWithHTML(
        `📋 <b>Lobby Rules</b> (${rules.length} total)\n\n${rulesList}\n\n<i>Use /rules_remove &lt;index&gt; to remove a rule.</i>`
      );
    } catch (err) {
      console.error("Error listing rules:", err);
      await ctx.reply("❌ Failed to list rules. Please try again.");
    }
  });
}
