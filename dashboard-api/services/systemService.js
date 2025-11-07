// dashboard-api/services/systemService.js

import { exec } from "child_process";
import { promisify } from "util";
import logger from "../../src/utils/logger.js";

const execAsync = promisify(exec);

/**
 * Restart the bot process using PM2
 */
export async function restartBot(userId) {
  try {
    logger.logModeration("bot_restart", userId, null, {
      trigger: "dashboard",
    });

    // Schedule restart after a short delay to allow response to be sent
    setTimeout(async () => {
      try {
        const { stdout, stderr } = await execAsync("pm2 reload bot");

        if (stderr && !stderr.includes("Process")) {
          logger.error("PM2 reload stderr:", stderr);
        }

        logger.info("Bot restart initiated via PM2 (dashboard):", stdout);
      } catch (error) {
        logger.error("Failed to restart bot via PM2:", error);

        // Fallback: exit process and let PM2 restart it
        logger.info("Falling back to process exit for restart");
        process.exit(0);
      }
    }, 2000);

    return {
      message: "Bot restart initiated",
      timestamp: new Date().toISOString(),
      userId,
    };
  } catch (error) {
    logger.error("Error in restartBot service:", error);
    throw new Error("Failed to initiate bot restart");
  }
}

/**
 * Get system health information
 */
export async function getSystemHealth() {
  return {
    status: "running",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };
}
