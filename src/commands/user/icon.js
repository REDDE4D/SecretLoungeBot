import { setIcon } from "../../users/index.js";

export const meta = {
  commands: ["icon"],
  category: "user",
  roleRequired: null,
  description: "Set your emoji avatar",
  usage: "/icon <emoji>",
  showInMenu: true,
};

function getEntityText(message, entity) {
  if (!message?.text || !entity) return null;
  // entity.offset/length are in UTF-16 code units for Bot API (Node strings are UTF-16 too)
  try {
    return message.text.substring(entity.offset, entity.offset + entity.length);
  } catch {
    return null;
  }
}

export function register(bot) {
  bot.command("icon", async (ctx) => {
    const entities = ctx.message.entities || ctx.message.text_entities || [];
    const emojiEntity = entities.find((e) => e.type === "custom_emoji");

    if (emojiEntity) {
      const customId = emojiEntity.custom_emoji_id;
      const fallback = getEntityText(ctx.message, emojiEntity) || ""; // visible char(s) as backup

      // Store both custom emoji id and fallback char
      await setIcon(ctx.from.id, { customEmojiId: customId, fallback });
      return ctx.reply(`✅ Custom emoji set!`);
    }

    // Fallback for normal emoji character (limit to exactly 1 visible emoji)
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const icon = parts[1];
    if (!icon || [...icon].length !== 1) {
      return ctx.reply("Usage: /icon 😎 or a Telegram custom emoji");
    }

    await setIcon(ctx.from.id, { customEmojiId: null, fallback: icon });
    ctx.reply(`✅ Icon set to ${icon}`);
  });
}
