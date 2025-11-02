import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { User } from "../models/User.js";
import { Instance } from "../models/Instance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get or create a persistent instance ID
 * @returns {Promise<string>} The instance ID
 */
async function getOrCreateInstanceId() {
  // Check if env var is set
  if (process.env.INSTANCE_ID) {
    return process.env.INSTANCE_ID;
  }

  // Try to get from database
  let instance = await Instance.findById("singleton");

  if (!instance) {
    // Create new instance with generated UUID
    const instanceId = randomUUID();
    instance = await Instance.create({
      _id: "singleton",
      instanceId,
      firstStarted: new Date(),
    });
  }

  return instance.instanceId;
}

/**
 * Read version from package.json
 * @returns {Promise<string>} The current version
 */
async function getVersion() {
  try {
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJson = await readFile(packageJsonPath, "utf-8");
    const data = JSON.parse(packageJson);
    return data.version;
  } catch (error) {
    console.error("Error reading package.json version:", error);
    return "unknown";
  }
}

/**
 * Collect anonymous metrics for this bot instance
 * @returns {Promise<Object>} Metrics object ready to send
 */
export async function collectMetrics() {
  try {
    const [instanceId, version, totalUsers, lobbyUsers] = await Promise.all([
      getOrCreateInstanceId(),
      getVersion(),
      User.countDocuments(),
      User.countDocuments({ inLobby: true }),
    ]);

    return {
      instanceId,
      version,
      totalUsers,
      lobbyUsers,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error collecting metrics:", error);
    throw error;
  }
}
