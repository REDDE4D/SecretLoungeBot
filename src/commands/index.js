import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { withRole } from "./utils/permissions.js";
import logger from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Unified Command Loader
 * Automatically discovers and registers all commands from category subdirectories
 * Applies role-based access control based on command metadata
 */
export default async function setupCommands(bot) {
  const categories = ["user", "mod", "admin"];
  const allCommands = [];
  const commandMap = new Map(); // Track all command names and their sources

  // Auto-discover and load all command modules
  for (const category of categories) {
    const categoryPath = join(__dirname, category);

    try {
      const files = readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

      for (const file of files) {
        const modulePath = `./${category}/${file}`;
        const module = await import(modulePath);

        // Validate module exports
        if (!module.meta || !module.register) {
          logger.warn(
            `Command module ${modulePath} missing 'meta' or 'register' export`
          );
          continue;
        }

        // Validate metadata
        const { meta } = module;
        if (!meta.commands || !Array.isArray(meta.commands) || meta.commands.length === 0) {
          logger.warn(
            `Command module ${modulePath} has invalid 'meta.commands'`
          );
          continue;
        }

        // Check for command name conflicts
        for (const cmdName of meta.commands) {
          if (commandMap.has(cmdName)) {
            logger.error(
              `Duplicate command /${cmdName} in ${modulePath} (already defined in ${commandMap.get(cmdName)})`
            );
            process.exit(1);
          }
          commandMap.set(cmdName, modulePath);
        }

        allCommands.push({ ...module, category, file });
      }
    } catch (err) {
      if (err.code !== "ENOENT") {
        logger.error(`Error loading commands from ${category}/`, { error: err.message });
      }
    }
  }

  logger.info(`Loaded ${allCommands.length} command modules`);
  logger.info(`Registering ${commandMap.size} total commands/aliases`);

  // Register all commands with role checking
  for (const { meta, register, category, file } of allCommands) {
    try {
      // Create a wrapped bot that applies role checking if needed
      const wrappedBot = meta.roleRequired ? createWrappedBot(bot, meta.roleRequired) : bot;

      logger.debug(`Calling register() for ${category}/${file}`);
      register(wrappedBot);
      logger.info(`Registered ${category}/${file}: ${meta.commands.join(", ")}`);
    } catch (err) {
      logger.error(`Failed to register ${category}/${file}`, { error: err.message, stack: err.stack });
      process.exit(1);
    }
  }

  /**
   * Creates a wrapped bot object that automatically applies role checking to commands
   * @param {Object} bot - The Telegraf bot instance
   * @param {String} roleRequired - The role required to execute commands
   * @returns {Object} Wrapped bot with role-checking baked in
   */
  function createWrappedBot(bot, roleRequired) {
    // Create a proxy that forwards all methods but wraps command handlers
    return new Proxy(bot, {
      get(target, prop) {
        if (prop === 'command') {
          return (cmd, handler) => target.command(cmd, withRole(roleRequired, handler));
        }
        if (prop === 'help') {
          return (handler) => target.help(withRole(roleRequired, handler));
        }
        if (prop === 'start') {
          return (handler) => target.start(withRole(roleRequired, handler));
        }
        return target[prop];
      }
    });
  }

  // Build Telegram command menu from metadata
  const menuCommands = allCommands
    .filter((cmd) => cmd.meta.showInMenu !== false)
    .map((cmd) => ({
      command: cmd.meta.commands[0], // Use primary command name
      description: cmd.meta.description || "No description",
    }));

  try {
    await bot.telegram.setMyCommands(menuCommands);
    logger.info(`Set Telegram command menu with ${menuCommands.length} commands`);
  } catch (err) {
    logger.error("Failed to set Telegram command menu", { error: err.message });
  }

  logger.info("Command setup complete");
}
