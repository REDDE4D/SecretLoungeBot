// src/commands/admin/update.js
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { User } from "../../models/User.js";
import { escapeHTML } from "../../utils/sanitize.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const meta = {
  commands: ["update"],
  category: "admin",
  roleRequired: "admin",
  description: "Send latest changelog version to all users",
  usage:
    "/update - Sends the latest version from CHANGELOG.md to all registered users",
  showInMenu: true,
};

// Emoji mapping for changelog sections
const SECTION_EMOJIS = {
  added: "✨",
  changed: "🔧",
  fixed: "🐛",
  removed: "🗑️",
  security: "🔒",
  deprecated: "⚠️",
};

/**
 * Parse CHANGELOG.md and extract the latest released version
 */
function parseLatestVersion() {
  const changelogPath = join(__dirname, "../../../CHANGELOG.md");

  try {
    const content = readFileSync(changelogPath, "utf-8");
    const lines = content.split("\n");

    let inUnreleased = false;
    let foundVersion = false;
    let versionNumber = null;
    let versionDate = null;
    let currentSection = null;
    const sections = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip [Unreleased] section
      if (line.startsWith("## [Unreleased]")) {
        inUnreleased = true;
        continue;
      }

      // Find first released version after [Unreleased]
      if (inUnreleased && line.startsWith("## [")) {
        inUnreleased = false;
        foundVersion = true;

        // Parse version line: ## [1.3.0] - 2025-10-31
        const versionMatch = line.match(/##\s*\[([^\]]+)\]\s*-\s*(.+)/);
        if (versionMatch) {
          versionNumber = versionMatch[1];
          versionDate = versionMatch[2].trim();
        }
        continue;
      }

      // Stop at next version
      if (foundVersion && line.startsWith("## [")) {
        break;
      }

      // Parse sections within the version
      if (foundVersion) {
        // Check for section headers (### Added, ### Changed, etc.)
        if (line.startsWith("### ")) {
          currentSection = line.replace("###", "").trim().toLowerCase();
          sections[currentSection] = [];
          continue;
        }

        // Parse bullet points
        if (currentSection && line.startsWith("-")) {
          const bulletText = line.replace(/^-\s*/, "").trim();
          if (bulletText) {
            sections[currentSection].push(bulletText);
          }
        }
      }
    }

    if (!foundVersion || !versionNumber) {
      return { error: "No released version found in CHANGELOG.md" };
    }

    return { versionNumber, versionDate, sections, error: null };
  } catch (err) {
    return { error: `Failed to read CHANGELOG.md: ${err.message}` };
  }
}

/**
 * Format version update message for Telegram
 */
function formatUpdateMessage(versionNumber, versionDate, sections) {
  let message = `🎉 <b>VERSION ${versionNumber} RELEASED</b> 🎉\n`;

  if (versionDate) {
    message += `📅 ${versionDate}\n`;
  }

  message += `━━━━━━━━━━━━━━━━\n\n`;

  // Add each section with its emoji
  for (const [sectionName, items] of Object.entries(sections)) {
    if (items.length === 0) continue;

    const emoji = SECTION_EMOJIS[sectionName] || "📌";
    const capitalizedSection =
      sectionName.charAt(0).toUpperCase() + sectionName.slice(1);

    message += `${emoji} <b>${capitalizedSection}:</b>\n`;

    for (const item of items) {
      message += `• ${escapeHTML(item)}\n`;
    }

    message += `\n`;
  }

  message += `━━━━━━━━━━━━━━━━\n`;
  message += `<i>Thank you for using ShotoLounge!</i>`;

  return message;
}

/**
 * Send update to list of user IDs
 */
async function sendUpdate(ctx, userIds, formattedMessage) {
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (const userId of userIds) {
    try {
      await ctx.telegram.sendMessage(userId, formattedMessage, {
        parse_mode: "HTML",
      });
      successCount++;

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      failCount++;
      const errorMsg =
        err?.response?.description || err?.message || "Unknown error";

      // Only log detailed errors for non-blocking situations
      if (
        !errorMsg.includes("bot was blocked") &&
        !errorMsg.includes("user is deactivated")
      ) {
        errors.push(`User ${userId}: ${errorMsg}`);
      }
    }
  }

  return { successCount, failCount, errors };
}

export function register(bot) {
  bot.command("update", async (ctx) => {
    try {
      // Parse changelog
      const { versionNumber, versionDate, sections, error } =
        parseLatestVersion();

      if (error) {
        await ctx.replyWithHTML(`❌ <b>Error:</b> ${escapeHTML(error)}`);
        return;
      }

      // Check if there's any content
      const totalItems = Object.values(sections).reduce(
        (sum, items) => sum + items.length,
        0
      );
      if (totalItems === 0) {
        await ctx.replyWithHTML(
          `❌ <b>Error:</b> Version ${escapeHTML(
            versionNumber
          )} has no content.\n\n` +
            `Please add changes to the version section in CHANGELOG.md before sending updates.`
        );
        return;
      }

      // Get ALL registered users
      const allUsers = await User.find({}).lean();
      const userIds = allUsers.map((u) => u._id);

      if (userIds.length === 0) {
        await ctx.reply("❌ No registered users to send update to.");
        return;
      }

      // Format update message
      const formattedMessage = formatUpdateMessage(
        versionNumber,
        versionDate,
        sections
      );

      // Send preview to admin
      await ctx.replyWithHTML(
        `📤 <b>Sending version ${escapeHTML(versionNumber)} update to ALL ${
          userIds.length
        } registered user(s)...</b>\n\n` +
          `<b>Preview:</b>\n${formattedMessage}`
      );

      // Send to all users
      const result = await sendUpdate(ctx, userIds, formattedMessage);

      // Report results
      let report = `✅ <b>Update announcement sent!</b>\n\n`;
      report += `📊 <b>Statistics:</b>\n`;
      report += `• Delivered: ${result.successCount}/${userIds.length}\n`;
      if (result.failCount > 0) {
        report += `• Failed: ${result.failCount} (blocked/deactivated users)\n`;
      }

      if (result.errors.length > 0) {
        report += `\n⚠️ <b>Errors:</b>\n`;
        report += result.errors
          .slice(0, 5)
          .map((e) => `• ${escapeHTML(e)}`)
          .join("\n");
        if (result.errors.length > 5) {
          report += `\n• ... and ${result.errors.length - 5} more`;
        }
      }

      await ctx.replyWithHTML(report);
    } catch (err) {
      console.error("Error sending update:", err);
      await ctx.reply("❌ Failed to send update. Please try again.");
    }
  });
}
