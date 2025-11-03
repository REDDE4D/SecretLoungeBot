import Setting from "../../models/Setting.js";
import Invite from "../../models/Invite.js";
import { genCode } from "../../utils/inviteUtils.js";
import { parseExpiry } from "../utils/parsers.js";
import { escapeHTML } from "../../utils/sanitize.js";
import { paginate, buildPaginationKeyboard, getPaginationFooter } from "../../utils/pagination.js";
import logger from "../../utils/logger.js";

export const meta = {
  commands: ["invite_on", "invite_off", "invite_new", "invite_list", "invite_revoke", "invite_activate", "invite_delete"],
  category: "admin",
  roleRequired: "admin",
  description: "Manage invite-only mode and invite codes",
  usage: "/invite_on, /invite_off, /invite_new [uses] [expiry] [notes]",
  showInMenu: false,
};

/**
 * Show paginated invites list
 */
async function showInvitesPage(ctx, page = 1, isEdit = false) {
  const list = await Invite.find().sort({ createdAt: -1 }).lean();

  if (!list.length) {
    const message = "ℹ️ No invites.";
    if (isEdit) {
      await ctx.editMessageText(message, { parse_mode: "HTML" });
    } else {
      await ctx.replyWithHTML(message);
    }
    return;
  }

  // Paginate invites
  const paginationResult = paginate(list, page, 10);
  const { items, currentPage, totalPages, totalItems } = paginationResult;

  const lines = items.map((i) => {
    const status = !i.active
      ? "revoked"
      : i.expiresAt && i.expiresAt.getTime() < Date.now()
      ? "expired"
      : i.usedCount >= i.maxUses
      ? "exhausted"
      : "active";

    const exp = i.expiresAt ? i.expiresAt.toISOString() : "no expiry";
    return `• <code>${i.code}</code> — <b>${status}</b> — ${i.usedCount}/${
      i.maxUses
    } — <i>${escapeHTML(exp)}</i>${i.notes ? ` — ${escapeHTML(i.notes)}` : ""}`;
  });

  let message = ["📜 <b>Invites</b>", ...lines].join("\n");
  message += getPaginationFooter(currentPage, totalPages, totalItems);

  const keyboard = buildPaginationKeyboard("invite_page", currentPage, totalPages);

  const options = {
    parse_mode: "HTML",
    reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
  };

  if (isEdit) {
    await ctx.editMessageText(message, options);
  } else {
    await ctx.replyWithHTML(message, options);
  }
}

export function register(bot) {
  // Enable invite-only mode
  bot.command("invite_on", async (ctx) => {
    const s = await Setting.findById("global");
    const doc = s || new Setting({ _id: "global" });
    doc.inviteOnly = true;
    await doc.save();

    logger.logModeration("invite_mode_enable", ctx.from.id, null);

    await ctx.replyWithHTML("🔐 <b>Invite-only</b> mode is now <b>ENABLED</b>.");
  });

  // Disable invite-only mode
  bot.command("invite_off", async (ctx) => {
    const s = await Setting.findById("global");
    const doc = s || new Setting({ _id: "global" });
    doc.inviteOnly = false;
    await doc.save();

    logger.logModeration("invite_mode_disable", ctx.from.id, null);

    await ctx.replyWithHTML("🔓 <b>Invite-only</b> mode is now <b>DISABLED</b>.");
  });

  // Create new invite
  bot.command("invite_new", async (ctx) => {
    const [, rawMax, rawExpiry, ...noteParts] = (ctx.message.text || "")
      .trim()
      .split(/\s+/);
    const maxUses = rawMax ? Math.max(1, parseInt(rawMax, 10)) : 1;
    const expiresAt = parseExpiry(rawExpiry) ?? null;
    const notes = noteParts.join(" ");

    const code = genCode(10);
    const inv = await Invite.create({
      code,
      createdBy: String(ctx.from.id),
      maxUses,
      usedCount: 0,
      expiresAt,
      active: true,
      notes,
    });

    logger.logModeration("invite_create", ctx.from.id, null, {
      inviteCode: code,
      maxUses,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });

    const expiryStr = expiresAt ? expiresAt.toISOString() : "no expiry";
    await ctx.replyWithHTML(
      [
        "🆕 <b>Invite created</b>",
        `Code: <code>${code}</code>`,
        `Max uses: <b>${maxUses}</b>`,
        `Expires: <i>${escapeHTML(expiryStr)}</i>`,
        notes ? `Notes: <i>${escapeHTML(notes)}</i>` : null,
        "",
        `Users can join with: <code>/join ${code}</code>`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  });

  // List all invites with pagination
  bot.command("invite_list", async (ctx) => {
    await showInvitesPage(ctx, 1);
  });

  // Handle pagination callbacks for invite list
  bot.action(/^invite_page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await showInvitesPage(ctx, page, true);
    await ctx.answerCbQuery();
  });

  // Revoke invite (set active=false)
  bot.command("invite_revoke", async (ctx) => {
    const [, code] = (ctx.message.text || "").trim().split(/\s+/);
    if (!code) return ctx.reply("Usage: /invite_revoke CODE");

    const inv = await Invite.findOne({ code: code.toUpperCase() });
    if (!inv) return ctx.reply("❌ Invite not found.");

    inv.active = false;
    await inv.save();

    logger.logModeration("invite_revoke", ctx.from.id, null, {
      inviteCode: inv.code,
    });

    await ctx.replyWithHTML(`🚫 Revoked invite <code>${inv.code}</code>.`);
  });

  // Activate invite (set active=true)
  bot.command("invite_activate", async (ctx) => {
    const [, code] = (ctx.message.text || "").trim().split(/\s+/);
    if (!code) return ctx.reply("Usage: /invite_activate CODE");

    const inv = await Invite.findOne({ code: code.toUpperCase() });
    if (!inv) return ctx.reply("❌ Invite not found.");

    inv.active = true;
    await inv.save();

    logger.logModeration("invite_activate", ctx.from.id, null, {
      inviteCode: inv.code,
    });

    await ctx.replyWithHTML(`✅ Activated invite <code>${inv.code}</code>.`);
  });

  // Delete invite permanently
  bot.command("invite_delete", async (ctx) => {
    const [, code] = (ctx.message.text || "").trim().split(/\s+/);
    if (!code) return ctx.reply("Usage: /invite_delete CODE");

    const res = await Invite.deleteOne({ code: code.toUpperCase() });
    if (!res.deletedCount) return ctx.reply("❌ Invite not found.");

    logger.logModeration("invite_delete", ctx.from.id, null, {
      inviteCode: code.toUpperCase(),
    });

    await ctx.replyWithHTML(`🗑️ Deleted invite <code>${code.toUpperCase()}</code>.`);
  });
}
