// src/commands/admin/slowmode.js
import Setting from "../../models/Setting.js";

export const meta = {
  commands: ["slowmode"],
  category: "admin",
  roleRequired: ["admin"],
  description: "Configure slowmode rate limiting",
  usage: "/slowmode <seconds|off>",
  showInMenu: false,
};

export function register(bot) {
  bot.command("slowmode", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ").slice(1);
      const param = args[0];

      if (!param) {
        // Show current slowmode status
        const setting = await Setting.findById("global");

        if (!setting || !setting.slowmodeEnabled) {
          return ctx.reply("⚡ Slowmode is currently OFF");
        }

        return ctx.reply(
          `🐌 Slowmode is currently ON\n` +
            `⏱️ Delay: ${setting.slowmodeSeconds} seconds between messages`
        );
      }

      // Handle "off" parameter
      if (param.toLowerCase() === "off") {
        await Setting.findByIdAndUpdate(
          "global",
          {
            slowmodeEnabled: false,
          },
          { upsert: true, new: true }
        );

        return ctx.reply("⚡ Slowmode disabled");
      }

      // Parse seconds
      const seconds = parseInt(param);

      if (isNaN(seconds) || seconds < 1) {
        return ctx.reply(
          "❌ Invalid slowmode value.\n\n" +
            "Usage:\n" +
            "/slowmode <seconds> - Enable slowmode with delay\n" +
            "/slowmode off - Disable slowmode\n\n" +
            "Examples:\n" +
            "/slowmode 10 - 10 second delay\n" +
            "/slowmode 30 - 30 second delay\n" +
            "/slowmode 60 - 1 minute delay"
        );
      }

      if (seconds > 3600) {
        return ctx.reply("❌ Slowmode delay cannot exceed 3600 seconds (1 hour).");
      }

      // Update setting
      await Setting.findByIdAndUpdate(
        "global",
        {
          slowmodeEnabled: true,
          slowmodeSeconds: seconds,
        },
        { upsert: true, new: true }
      );

      // Format time display
      let timeDisplay;
      if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timeDisplay =
          `${minutes} minute${minutes > 1 ? "s" : ""}` +
          (remainingSeconds > 0 ? ` ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}` : "");
      } else {
        timeDisplay = `${seconds} second${seconds > 1 ? "s" : ""}`;
      }

      await ctx.reply(
        `🐌 Slowmode enabled\n` +
          `⏱️ Users must wait ${timeDisplay} between messages\n\n` +
          `<i>Note: Admins, mods, and whitelisted users are exempt from slowmode</i>`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error("Error configuring slowmode:", err);
      await ctx.reply("❌ Error configuring slowmode.");
    }
  });
}
