import { renameUser } from "../../users/index.js";
import { validateAlias } from "../../utils/sanitize.js";

export const meta = {
  commands: ["alias", "setalias", "rename"],
  category: "user",
  roleRequired: null,
  description: "Set your display name",
  usage: "/alias <new-alias>",
  showInMenu: true,
};

export function register(bot) {
  const handler = async (ctx) => {
    // Get the alias from the command arguments (supports multi-word aliases)
    const newAlias = ctx.message.text.split(" ").slice(1).join(" ").trim();

    // Validate alias
    if (!newAlias) {
      return ctx.reply("Usage: /alias <name>\n\nExample: /alias CoolPerson123");
    }

    const validation = validateAlias(newAlias);
    if (!validation.valid) {
      return ctx.reply(`❌ ${validation.error}`);
    }

    const result = await renameUser(ctx.from.id, newAlias);
    ctx.reply(result);
  };

  // Register all aliases for the command
  bot.command("alias", handler);
  bot.command("setalias", handler);
  bot.command("rename", handler);
}
