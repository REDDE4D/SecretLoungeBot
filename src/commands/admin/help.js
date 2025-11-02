import { escapeMarkdownV2 } from "../../utils/sanitize.js";

export const meta = {
  commands: ["adminhelp", "ah"],
  category: "admin",
  roleRequired: ["mod", "admin"],
  description: "Show admin & mod command reference",
  usage: "/adminhelp or /ah",
  showInMenu: false,
};

export function register(bot) {
  const helpLines = [
    "*🛠 Admin / Mod Commands*",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    "*👥 User Management*",
    "`/kick <alias>` or `/k` — Remove user from lobby",
    "`/ban <alias> [duration]` or `/b` — Ban user (e.g. 1h, 2d)",
    "`/unban <alias>` or `/ub` — Lift ban",
    "`/mute <alias> [duration]` or `/m` — Mute user",
    "`/unmute <alias>` or `/um` — Unmute user",
    "`/warn <alias>` — Issue warning (3 warnings = ban)",
    "`/clearwarns <alias>` — Clear user warnings",
    "`/userinfo <alias>` or `/ui` — Show user info",
    "`/whois [alias]` or `/w` — Identify message sender",
    "",
    "*📷 Media Controls*",
    "`/restrictmedia <alias>` or `/rm` — Block media sending",
    "`/unrestrictmedia <alias>` or `/urm` — Allow media sending",
    "",
    "*📋 Report Management (Mod)*",
    "`/reports` — List pending reports",
    "`/viewreport <id>` — View report details",
    "`/resolve <id> <action> [notes]` — Resolve report",
    "",
    "*🐌 Rate Limiting (Admin)*",
    "`/slowmode <seconds>` — Enable slowmode rate limiting",
    "`/slowmode off` — Disable slowmode",
    "`/slowmode` — Check current slowmode status",
    "",
    "*🚫 Content Filters (Admin)*",
    "`/filter add <pattern> [notes]` — Add keyword/regex filter",
    "`/filter list` — List all filters",
    "`/filter remove <id>` — Delete filter",
    "`/filter toggle <id>` — Enable/disable filter",
    "",
    "*📜 Rules Management (Admin)*",
    "`/rules_add [emoji] <text>` — Add lobby rule",
    "`/rules_remove <index>` — Remove rule by number",
    "`/rules_list` — View all rules with indices",
    "`/rules_clear` — Clear all rules",
    "",
    "*🧪 Debug Commands*",
    "`/debugmedia [count]` — List recent relayed media with links",
    "`/debuglist [count]` — List recent media (compact)",
    "`/debugcopy <chatId> <messageId>` — Copy a past message",
    "",
    "*🧑‍⚖️ Roles & Permissions*",
    "`/promote <alias> admin|mod` — Promote user",
    "`/demote <alias>` — Revoke role",
    "`/whitelist <alias>` or `/wl` — Exempt from compliance",
    "",
    "*🎟️ Invite System (Admin Only)*",
    "`/invite_on` — Enable invite-only mode",
    "`/invite_off` — Disable invite-only mode",
    "`/invite_new [uses] [expiry] [notes]` — Create invite",
    "`/invite_list` — List all invites",
    "`/invite_revoke <code>` — Deactivate invite",
    "`/invite_activate <code>` — Reactivate invite",
    "`/invite_delete <code>` — Permanently delete invite",
    "",
    "*☢️ Dangerous Commands (Admin Only)*",
    "`/nuke` — Wipe the entire database",
    "`/purge` — Delete all relayed messages",
    "",
    "`/adminhelp` or `/ah` — Show this help message",
    "━━━━━━━━━━━━━━━━━━━━",
  ];

  const text = helpLines.map(escapeMarkdownV2).join("\n");

  const handler = (ctx) => {
    ctx.reply(text, { parse_mode: "MarkdownV2" });
  };

  bot.command("adminhelp", handler);
  bot.command("ah", handler);
}
