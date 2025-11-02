import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { startTime } from "../../core/runtime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const meta = {
  commands: ["version", "v"],
  category: "user",
  roleRequired: null,
  description: "Show bot version and uptime",
  usage: "/version",
  showInMenu: true,
};

/**
 * Format uptime duration into human-readable string
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0 && days === 0) parts.push(`${seconds % 60}s`);

  return parts.length > 0 ? parts.join(" ") : "0s";
}

/**
 * Get version from package.json
 * @returns {Promise<string>} Version string
 */
async function getVersion() {
  try {
    const packageJsonPath = join(__dirname, "../../../package.json");
    const packageJson = await readFile(packageJsonPath, "utf-8");
    const data = JSON.parse(packageJson);
    return data.version;
  } catch (error) {
    console.error("Error reading package.json:", error);
    return "unknown";
  }
}

export function register(bot) {
  bot.command(["version", "v"], async (ctx) => {
    try {
      const version = await getVersion();
      const uptime = Date.now() - startTime;
      const uptimeStr = formatUptime(uptime);

      const versionText = [
        `🤖 *TG\\-Lobby\\-Bot*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `📦 *Version:* \`${escapeMarkdownV2(version)}\``,
        `⏱️ *Uptime:* \`${escapeMarkdownV2(uptimeStr)}\``,
        ``,
        `📋 *Changelog:*`,
        `[View on GitHub](https://github.com/yourusername/TG-Lobby-V2/blob/main/CHANGELOG.md)`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n");

      await ctx.telegram.sendMessage(ctx.chat.id, versionText, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error("Error in /version command:", error);
      await ctx.reply(
        "❌ Error retrieving version information. Please try again later."
      );
    }
  });
}
