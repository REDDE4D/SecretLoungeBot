// src/commands/user/help.js
import { escapeMarkdownV2 } from "../../utils/sanitize.js";
import { isAdmin, isMod } from "../utils/permissions.js";

export const meta = {
  commands: ["help", "h"],
  category: "user",
  roleRequired: null,
  description: "Show help & command list",
  usage: "/help [category|command]",
  showInMenu: true,
};

// Command database with categories and detailed info
const commands = {
  // Identity & Profile
  start: {
    category: "identity",
    usage: "/start",
    description: "Initialize the bot and see welcome message",
    example: "/start"
  },
  alias: {
    category: "identity",
    usage: "/alias <name>",
    aliases: ["setalias", "rename"],
    description: "Set your anonymous display name (2-32 characters)",
    example: "/alias CoolPerson"
  },
  icon: {
    category: "identity",
    usage: "/icon <emoji>",
    description: "Set your avatar emoji (single emoji only)",
    example: "/icon 🎭"
  },
  profile: {
    category: "identity",
    usage: "/profile [alias|reply]",
    description: "View detailed user profile and statistics",
    example: "/profile CoolPerson"
  },
  tenure: {
    category: "identity",
    usage: "/tenure",
    description: "View your lobby membership duration and milestones",
    example: "/tenure"
  },

  // Lobby Participation
  join: {
    category: "lobby",
    usage: "/join [invite_code]",
    aliases: ["j"],
    description: "Join the lobby to send and receive messages",
    example: "/join ABC123"
  },
  leave: {
    category: "lobby",
    usage: "/leave",
    aliases: ["l"],
    description: "Leave the lobby (stop receiving messages)",
    example: "/leave"
  },
  online: {
    category: "lobby",
    usage: "/online",
    aliases: ["o"],
    description: "Show count of currently active users",
    example: "/online"
  },
  rules: {
    category: "lobby",
    usage: "/rules",
    description: "View lobby rules and guidelines",
    example: "/rules"
  },

  // Messaging
  msg: {
    category: "messaging",
    usage: "/msg <alias> <message>",
    aliases: ["dm"],
    description: "Send private anonymous message to a user",
    example: "/msg CoolPerson Hello there!"
  },
  sign: {
    category: "messaging",
    usage: "/sign <message>",
    aliases: ["s"],
    description: "Sign your message with your Telegram username",
    example: "/s This is me!"
  },
  history: {
    category: "messaging",
    usage: "/history",
    description: "View last 50 messages from the past 12 hours",
    example: "/history"
  },

  // Privacy & Blocking
  block: {
    category: "privacy",
    usage: "/block <alias|reply>",
    description: "Block a user (private, they won't be notified)",
    example: "/block AnnoyingUser"
  },
  unblock: {
    category: "privacy",
    usage: "/unblock <alias|reply>",
    description: "Unblock a previously blocked user",
    example: "/unblock AnnoyingUser"
  },
  blocklist: {
    category: "privacy",
    usage: "/blocklist",
    description: "View list of users you've blocked",
    example: "/blocklist"
  },

  // Community Features
  poll: {
    category: "community",
    usage: "/poll <question> | <option1> | <option2> | ...",
    description: "Create an anonymous poll (2-6 options)",
    example: "/poll Favorite color? | Red | Blue | Green"
  },
  endpoll: {
    category: "community",
    usage: "/endpoll",
    description: "Close your most recent active poll",
    example: "/endpoll"
  },
  leaderboard: {
    category: "community",
    usage: "/leaderboard [daily|weekly|alltime]",
    aliases: ["top", "lb"],
    description: "View top active users by message count",
    example: "/leaderboard weekly"
  },
  report: {
    category: "community",
    usage: "/report [reason]",
    description: "Report a message to moderators (reply to message)",
    example: "/report Spam content"
  },

  // Account Management
  deleteme: {
    category: "account",
    usage: "/deleteme",
    description: "Permanently delete your account and all data",
    example: "/deleteme"
  },

  // Moderator Commands
  whois: {
    category: "moderation",
    role: "mod",
    usage: "/whois <alias|reply>",
    aliases: ["w", "userinfo", "ui"],
    description: "View detailed user information and moderation history",
    example: "/whois SuspiciousUser"
  },
  warn: {
    category: "moderation",
    role: "mod",
    usage: "/warn <alias|reply> [reason]",
    description: "Issue a warning to a user (3 warnings = auto-ban)",
    example: "/warn BadUser Violating rules"
  },
  clearwarns: {
    category: "moderation",
    role: "mod",
    usage: "/clearwarns <alias|reply>",
    description: "Clear all warnings for a user",
    example: "/clearwarns ReformedUser"
  },
  cooldown: {
    category: "moderation",
    role: "mod",
    usage: "/cooldown <alias|reply> <duration>",
    aliases: ["cd"],
    description: "Temporarily mute a user",
    example: "/cooldown SpamUser 1h"
  },
  reports: {
    category: "moderation",
    role: "mod",
    usage: "/reports",
    description: "View all pending user reports",
    example: "/reports"
  },
  viewreport: {
    category: "moderation",
    role: "mod",
    usage: "/viewreport <id>",
    description: "View detailed information about a specific report",
    example: "/viewreport 123"
  },
  resolve: {
    category: "moderation",
    role: "mod",
    usage: "/resolve <id> <action> [notes]",
    description: "Resolve a report (actions: none, warned, muted, banned, kicked)",
    example: "/resolve 123 warned Issued warning for spam"
  },
  whitelist: {
    category: "moderation",
    role: "mod",
    usage: "/whitelist <alias|reply>",
    aliases: ["wl"],
    description: "Add/remove user from whitelist (exempt from compliance)",
    example: "/whitelist TrustedUser"
  },

  // Admin Commands
  ban: {
    category: "admin",
    role: "admin",
    usage: "/ban <alias|reply> [duration]",
    aliases: ["b"],
    description: "Ban a user (permanently or temporarily)",
    example: "/ban BadActor 7d"
  },
  unban: {
    category: "admin",
    role: "admin",
    usage: "/unban <alias|reply>",
    aliases: ["ub"],
    description: "Unban a previously banned user",
    example: "/unban ReformedUser"
  },
  mute: {
    category: "admin",
    role: "admin",
    usage: "/mute <alias|reply> [duration]",
    aliases: ["m"],
    description: "Mute a user (permanently or temporarily)",
    example: "/mute SpamUser 24h"
  },
  unmute: {
    category: "admin",
    role: "admin",
    usage: "/unmute <alias|reply>",
    aliases: ["um"],
    description: "Unmute a previously muted user",
    example: "/unmute QuietUser"
  },
  kick: {
    category: "admin",
    role: "admin",
    usage: "/kick <alias|reply>",
    aliases: ["k"],
    description: "Kick a user from the lobby",
    example: "/kick Troublemaker"
  },
  restrictmedia: {
    category: "admin",
    role: "admin",
    usage: "/restrictmedia <alias|reply>",
    aliases: ["rm"],
    description: "Restrict user from sending media (text only)",
    example: "/restrictmedia SpamBot"
  },
  unrestrictmedia: {
    category: "admin",
    role: "admin",
    usage: "/unrestrictmedia <alias|reply>",
    aliases: ["urm"],
    description: "Remove media restriction from a user",
    example: "/unrestrictmedia BehaveUser"
  },
  promote: {
    category: "admin",
    role: "admin",
    usage: "/promote <alias|reply> <role>",
    description: "Promote user to mod or admin",
    example: "/promote TrustedUser mod"
  },
  demote: {
    category: "admin",
    role: "admin",
    usage: "/demote <alias|reply>",
    description: "Remove moderator/admin role from user",
    example: "/demote FormerMod"
  },
  announce_lobby: {
    category: "admin",
    role: "admin",
    usage: "/announce_lobby <message>",
    description: "Send announcement to all lobby members",
    example: "/announce_lobby Maintenance tonight at 10pm"
  },
  announce_all: {
    category: "admin",
    role: "admin",
    usage: "/announce_all <message>",
    description: "Send announcement to ALL registered users",
    example: "/announce_all Important security update"
  },
  slowmode: {
    category: "admin",
    role: "admin",
    usage: "/slowmode [seconds|off]",
    description: "Set minimum delay between messages (1-3600s)",
    example: "/slowmode 5"
  },
  filter: {
    category: "admin",
    role: "admin",
    usage: "/filter <add|list|remove|toggle> [pattern]",
    description: "Manage content filters (keywords/regex)",
    example: "/filter add spam"
  },
  invite_on: {
    category: "admin",
    role: "admin",
    usage: "/invite_on",
    description: "Enable invite-only mode",
    example: "/invite_on"
  },
  invite_off: {
    category: "admin",
    role: "admin",
    usage: "/invite_off",
    description: "Disable invite-only mode",
    example: "/invite_off"
  },
  invite_new: {
    category: "admin",
    role: "admin",
    usage: "/invite_new <max_uses> <expiry> [notes]",
    description: "Create new invite code (expiry: 7d, 24h, 2025-12-31)",
    example: "/invite_new 5 7d For friends"
  },
  invite_list: {
    category: "admin",
    role: "admin",
    usage: "/invite_list",
    description: "List all invite codes and their status",
    example: "/invite_list"
  },
  invite_revoke: {
    category: "admin",
    role: "admin",
    usage: "/invite_revoke <code>",
    description: "Deactivate an invite code",
    example: "/invite_revoke ABC123"
  },
  rules_add: {
    category: "admin",
    role: "admin",
    usage: "/rules_add <emoji> <text>",
    description: "Add a rule to the lobby rules list",
    example: "/rules_add 🚫 No spam allowed"
  },
  rules_remove: {
    category: "admin",
    role: "admin",
    usage: "/rules_remove <number>",
    description: "Remove a rule by its number",
    example: "/rules_remove 3"
  },
};

// Category information
const categories = {
  identity: { name: "👤 Identity & Profile", icon: "👤" },
  lobby: { name: "🏠 Lobby Participation", icon: "🏠" },
  messaging: { name: "💬 Messaging", icon: "💬" },
  privacy: { name: "🔒 Privacy & Blocking", icon: "🔒" },
  community: { name: "🎯 Community Features", icon: "🎯" },
  account: { name: "⚙️ Account Management", icon: "⚙️" },
  moderation: { name: "🛡️ Moderation", icon: "🛡️" },
  admin: { name: "⚡ Administration", icon: "⚡" },
};

export function register(bot) {
  bot.command(["help", "h"], async (ctx) => {
    const args = ctx.message.text.trim().split(" ").slice(1);
    const query = args[0]?.toLowerCase();

    const userId = String(ctx.from.id);
    const userIsMod = await isMod(userId);
    const userIsAdmin = await isAdmin(userId);

    // Specific command help
    if (query && commands[query]) {
      return showCommandHelp(ctx, query, userIsMod, userIsAdmin);
    }

    // Category help
    if (query && categories[query]) {
      return showCategoryHelp(ctx, query, userIsMod, userIsAdmin);
    }

    // Shortcuts
    if (query === "user") {
      return showUserHelp(ctx);
    }
    if (query === "mod" && userIsMod) {
      return showModHelp(ctx);
    }
    if (query === "admin" && userIsAdmin) {
      return showAdminHelp(ctx);
    }

    // Default: show main help
    return showMainHelp(ctx, userIsMod, userIsAdmin);
  });
}

function showMainHelp(ctx, userIsMod, userIsAdmin) {
  let text = `📖 *Anonymous Lobby Bot – Help*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `Welcome to the anonymous lobby\\! Send messages anonymously, customize your identity, and engage with the community\\.\n\n`;

  text += `*🔍 Get Help*\n`;
  text += `\`/help user\` \\- User commands\n`;
  if (userIsMod) text += `\`/help mod\` \\- Moderator commands\n`;
  if (userIsAdmin) text += `\`/help admin\` \\- Admin commands\n`;
  text += `\`/help <command>\` \\- Detailed help for a command\n\n`;

  text += `*📚 Command Categories*\n`;
  text += `${escapeMarkdownV2(categories.identity.icon)} *Identity* \\- /alias, /icon, /profile\n`;
  text += `${escapeMarkdownV2(categories.lobby.icon)} *Lobby* \\- /join, /leave, /online\n`;
  text += `${escapeMarkdownV2(categories.messaging.icon)} *Messaging* \\- /msg, /sign, /history\n`;
  text += `${escapeMarkdownV2(categories.privacy.icon)} *Privacy* \\- /block, /unblock\n`;
  text += `${escapeMarkdownV2(categories.community.icon)} *Community* \\- /poll, /leaderboard\n`;
  if (userIsMod) text += `${escapeMarkdownV2(categories.moderation.icon)} *Moderation* \\- /whois, /warn, /reports\n`;
  if (userIsAdmin) text += `${escapeMarkdownV2(categories.admin.icon)} *Admin* \\- /ban, /mute, /announce\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💡 *Quick Start*\n`;
  text += `1\\. Set your alias: \`/alias YourName\`\n`;
  text += `2\\. Join the lobby: \`/join\`\n`;
  text += `3\\. Send any message or media\\!\n\n`;
  text += `🔗 All replies are threaded anonymously\\.\n`;
  text += `🔒 Block users with \`/block\` for privacy\\.\n`;

  ctx.reply(text, { parse_mode: "MarkdownV2" });
}

function showUserHelp(ctx) {
  const userCategories = ["identity", "lobby", "messaging", "privacy", "community", "account"];
  let text = `👤 *User Commands*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const cat of userCategories) {
    text += `*${escapeMarkdownV2(categories[cat].name)}*\n`;

    for (const [name, cmd] of Object.entries(commands)) {
      if (cmd.category === cat && !cmd.role) {
        const aliases = cmd.aliases ? ` \\(${cmd.aliases.map(a => `/${a}`).join(", ")}\\)` : "";
        text += `\`${cmd.usage}\`${aliases}\n`;
        text += `  ${escapeMarkdownV2(cmd.description)}\n\n`;
      }
    }
  }

  text += `\n💡 Use \`/help <command>\` for detailed help on any command\\.\n`;
  ctx.reply(text, { parse_mode: "MarkdownV2" });
}

function showModHelp(ctx) {
  let text = `🛡️ *Moderator Commands*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const [name, cmd] of Object.entries(commands)) {
    if (cmd.category === "moderation") {
      const aliases = cmd.aliases ? ` \\(${cmd.aliases.map(a => `/${a}`).join(", ")}\\)` : "";
      text += `\`${cmd.usage}\`${aliases}\n`;
      text += `  ${escapeMarkdownV2(cmd.description)}\n\n`;
    }
  }

  text += `\n💡 Use \`/help <command>\` for detailed help and examples\\.\n`;
  ctx.reply(text, { parse_mode: "MarkdownV2" });
}

function showAdminHelp(ctx) {
  let text = `⚡ *Admin Commands*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const [name, cmd] of Object.entries(commands)) {
    if (cmd.category === "admin") {
      const aliases = cmd.aliases ? ` \\(${cmd.aliases.map(a => `/${a}`).join(", ")}\\)` : "";
      text += `\`${cmd.usage}\`${aliases}\n`;
      text += `  ${escapeMarkdownV2(cmd.description)}\n\n`;
    }
  }

  text += `\n💡 Use \`/help <command>\` for detailed help and examples\\.\n`;
  ctx.reply(text, { parse_mode: "MarkdownV2" });
}

function showCategoryHelp(ctx, category, userIsMod, userIsAdmin) {
  const cat = categories[category];
  let text = `${escapeMarkdownV2(cat.icon)} *${escapeMarkdownV2(cat.name)}*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const [name, cmd] of Object.entries(commands)) {
    if (cmd.category === category) {
      // Skip if user doesn't have permission
      if (cmd.role === "admin" && !userIsAdmin) continue;
      if (cmd.role === "mod" && !userIsMod) continue;

      const aliases = cmd.aliases ? ` \\(${cmd.aliases.map(a => `/${a}`).join(", ")}\\)` : "";
      text += `\`${cmd.usage}\`${aliases}\n`;
      text += `  ${escapeMarkdownV2(cmd.description)}\n`;
      text += `  Example: \`${cmd.example}\`\n\n`;
    }
  }

  ctx.reply(text, { parse_mode: "MarkdownV2" });
}

function showCommandHelp(ctx, cmdName, userIsMod, userIsAdmin) {
  const cmd = commands[cmdName];

  // Check permissions
  if (cmd.role === "admin" && !userIsAdmin) {
    return ctx.reply(escapeMarkdownV2("❌ You don't have permission to view this command."), {
      parse_mode: "MarkdownV2"
    });
  }
  if (cmd.role === "mod" && !userIsMod) {
    return ctx.reply(escapeMarkdownV2("❌ You don't have permission to view this command."), {
      parse_mode: "MarkdownV2"
    });
  }

  let text = `📖 *Command: /${cmdName}*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (cmd.aliases && cmd.aliases.length > 0) {
    text += `*Aliases:* ${cmd.aliases.map(a => `\`/${a}\``).join(", ")}\n\n`;
  }

  text += `*Usage:*\n\`${cmd.usage}\`\n\n`;
  text += `*Description:*\n${escapeMarkdownV2(cmd.description)}\n\n`;
  text += `*Example:*\n\`${cmd.example}\`\n\n`;

  const cat = categories[cmd.category];
  if (cat) {
    text += `*Category:* ${escapeMarkdownV2(cat.name)}\n`;
  }

  ctx.reply(text, { parse_mode: "MarkdownV2" });
}
