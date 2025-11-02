import { getLobbyUsers } from "../../users/index.js";

export const meta = {
  commands: ["online", "o"],
  category: "user",
  roleRequired: null,
  description: "Show lobby member count",
  usage: "/online or /o",
  showInMenu: true,
};

export function register(bot) {
  const handler = async (ctx) => {
    const lobbyIds = await getLobbyUsers();
    const count = lobbyIds.length;

    if (count === 0) {
      return ctx.reply("Nobody is in the lobby right now.");
    }

    const plural = count === 1 ? "" : "s";
    await ctx.reply(`👥 ${count} user${plural} currently in the lobby.`);
  };

  bot.command("online", handler);
  bot.command("o", handler);
}
