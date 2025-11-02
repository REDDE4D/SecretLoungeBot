// src/utils/cleanup.js
import Report from "../models/Report.js";
import Poll from "../models/Poll.js";

/**
 * Clean up old resolved/dismissed reports (>90 days)
 * Keeps pending reports indefinitely until resolved
 */
export async function cleanupOldReports() {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  try {
    const result = await Report.deleteMany({
      status: { $in: ["resolved", "dismissed"] },
      resolvedAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  } catch (err) {
    console.error("[cleanup] Error cleaning up reports:", err);
    return 0;
  }
}

/**
 * Clean up old closed polls (>30 days)
 * Keeps active polls indefinitely until closed
 */
export async function cleanupOldPolls() {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  try {
    const result = await Poll.deleteMany({
      isActive: false,
      closedAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  } catch (err) {
    console.error("[cleanup] Error cleaning up polls:", err);
    return 0;
  }
}

/**
 * Run all cleanup tasks
 * Call this on a schedule (e.g., daily at midnight)
 */
export async function runAllCleanupTasks() {
  const reportsDeleted = await cleanupOldReports();
  const pollsDeleted = await cleanupOldPolls();

  return {
    reportsDeleted,
    pollsDeleted,
    timestamp: new Date(),
  };
}
