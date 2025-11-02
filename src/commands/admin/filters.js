// src/commands/admin/filters.js
import Filter from "../../models/Filter.js";
import { paginate, buildPaginationKeyboard, getPaginationFooter } from "../../utils/pagination.js";

export const meta = {
  commands: ["filter"],
  category: "admin",
  roleRequired: ["admin"],
  description: "Manage content filters",
  usage: "/filter <add|list|remove|toggle> [params]",
  showInMenu: false,
};

export function register(bot) {
  bot.command("filter", async (ctx) => {
    try {
      const args = ctx.message.text.trim().split(" ");
      args.shift(); // Remove "/filter"

      const subcommand = args[0]?.toLowerCase();

      if (!subcommand) {
        return ctx.reply(
          "📝 FILTER MANAGEMENT\n\n" +
            "Commands:\n" +
            "/filter add <pattern> [notes] - Add keyword filter\n" +
            "/filter list - List all filters\n" +
            "/filter remove <id> - Remove filter\n" +
            "/filter toggle <id> - Enable/disable filter\n\n" +
            "Examples:\n" +
            '/filter add spam "Block spam messages"\n' +
            "/filter list\n" +
            "/filter remove 507f1f77bcf86cd799439011"
        );
      }

      switch (subcommand) {
        case "add":
          await handleAddFilter(ctx, args.slice(1));
          break;
        case "list":
          await handleListFilters(ctx, 1);
          break;
        case "remove":
        case "delete":
          await handleRemoveFilter(ctx, args.slice(1));
          break;
        case "toggle":
          await handleToggleFilter(ctx, args.slice(1));
          break;
        default:
          await ctx.reply(`❌ Unknown subcommand: ${subcommand}`);
      }
    } catch (err) {
      console.error("Error managing filters:", err);
      await ctx.reply("❌ Error managing filters.");
    }
  });

  // Handle pagination callbacks for filter list
  bot.action(/^filter_page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await handleListFilters(ctx, page, true);
    await ctx.answerCbQuery();
  });
}

/**
 * Add a new content filter
 */
async function handleAddFilter(ctx, args) {
  if (args.length < 1) {
    return ctx.reply("Usage: /filter add <pattern> [notes]");
  }

  const pattern = args[0];
  const notes = args.slice(1).join(" ");

  // Test if pattern is a valid regex
  let isRegex = false;
  try {
    new RegExp(pattern);
    isRegex = true;
  } catch (err) {
    // Not a valid regex, treat as keyword
    isRegex = false;
  }

  const filter = await Filter.create({
    pattern,
    isRegex,
    createdBy: String(ctx.from.id),
    action: "block",
    active: true,
    notes: notes || "",
  });

  await ctx.reply(
    `✅ Filter added (ID: ${filter._id})\n\n` +
      `Pattern: ${pattern}\n` +
      `Type: ${isRegex ? "Regex" : "Keyword"}\n` +
      `Action: Block message\n` +
      (notes ? `Notes: ${notes}` : "")
  );
}

/**
 * List all filters with pagination
 */
async function handleListFilters(ctx, page = 1, isEdit = false) {
  const filters = await Filter.find().sort({ createdAt: -1 }).lean();

  if (filters.length === 0) {
    const message = "📝 No filters configured.";
    if (isEdit) {
      await ctx.editMessageText(message);
    } else {
      await ctx.reply(message);
    }
    return;
  }

  // Paginate filters
  const paginationResult = paginate(filters, page, 10);
  const { items, currentPage, totalPages, totalItems } = paginationResult;

  let message = `📝 CONTENT FILTERS\n\n`;

  for (const filter of items) {
    const status = filter.active ? "✅ Active" : "❌ Disabled";
    message +=
      `ID: ${filter._id}\n` +
      `${status}\n` +
      `Pattern: ${filter.pattern}\n` +
      `Type: ${filter.isRegex ? "Regex" : "Keyword"}\n`;

    if (filter.notes) {
      message += `Notes: ${filter.notes}\n`;
    }

    message += `\n`;
  }

  message += `\nUse /filter remove <id> to delete a filter`;
  message += getPaginationFooter(currentPage, totalPages, totalItems);

  const keyboard = buildPaginationKeyboard("filter_page", currentPage, totalPages);

  const options = {
    reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
  };

  if (isEdit) {
    await ctx.editMessageText(message, options);
  } else {
    await ctx.reply(message, options);
  }
}

/**
 * Remove a filter
 */
async function handleRemoveFilter(ctx, args) {
  if (args.length < 1) {
    return ctx.reply("Usage: /filter remove <filter_id>");
  }

  const filterId = args[0];

  const result = await Filter.deleteOne({ _id: filterId });

  if (result.deletedCount === 0) {
    return ctx.reply("❌ Filter not found.");
  }

  await ctx.reply(`✅ Filter removed`);
}

/**
 * Toggle filter active status
 */
async function handleToggleFilter(ctx, args) {
  if (args.length < 1) {
    return ctx.reply("Usage: /filter toggle <filter_id>");
  }

  const filterId = args[0];

  const filter = await Filter.findById(filterId);

  if (!filter) {
    return ctx.reply("❌ Filter not found.");
  }

  filter.active = !filter.active;
  await filter.save();

  await ctx.reply(
    `${filter.active ? "✅" : "❌"} Filter ${filter.active ? "enabled" : "disabled"}\n\n` +
      `Pattern: ${filter.pattern}`
  );
}
