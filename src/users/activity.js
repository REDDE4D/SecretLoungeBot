// users/activity.js
import { Activity } from "../models/Activity.js";
import { TIMING } from "../config/constants.js";

let statusCallback = null;
export function setStatusCallback(fn) {
  statusCallback = fn;
}

// Keep a single timer set per user to avoid spam
const timers = new Map(); // userId -> { idleTimeout, offlineTimeout }

// helper: set status only if it actually changes
async function setStatus(act, newStatus) {
  if (act.status === newStatus) return false;
  act.status = newStatus;
  act.lastOnlineChange = new Date();
  await act.save();
  if (statusCallback) {
    try {
      statusCallback(act.userId, newStatus);
    } catch (err) {
      console.error(`[activity] Status callback error for ${act.userId}:`, err?.message || err);
    }
  }
  return true;
}

// helper: (re)schedule idle/offline transitions
function scheduleStatusTimers(userId, baseTs) {
  const prev = timers.get(userId);
  if (prev?.idleTimeout) clearTimeout(prev.idleTimeout);
  if (prev?.offlineTimeout) clearTimeout(prev.offlineTimeout);

  const nowMs = Date.now();
  const baseMs = baseTs instanceof Date ? baseTs.getTime() : nowMs;
  // 15m to idle, 60m to offline
  const toIdleMs = Math.max(0, TIMING.IDLE_THRESHOLD_MS - (nowMs - baseMs));
  const toOfflineMs = Math.max(0, TIMING.OFFLINE_THRESHOLD_MS - (nowMs - baseMs));

  const idleTimeout = setTimeout(async () => {
    const u = await Activity.findOne({ userId });
    if (!u) {
      timers.delete(userId); // Clean up if user no longer exists
      return;
    }
    // only move to idle if not already online change since
    if (Date.now() - u.lastOnlineChange.getTime() >= TIMING.IDLE_THRESHOLD_MS) {
      await setStatus(u, "idle");
    }
  }, toIdleMs);

  const offlineTimeout = setTimeout(async () => {
    const u = await Activity.findOne({ userId });
    if (!u) {
      timers.delete(userId); // Clean up if user no longer exists
      return;
    }
    if (Date.now() - u.lastOnlineChange.getTime() >= TIMING.OFFLINE_THRESHOLD_MS) {
      await setStatus(u, "offline");
    }
    // Clean up timer entry after offline transition (final state)
    timers.delete(userId);
  }, toOfflineMs);

  timers.set(userId, { idleTimeout, offlineTimeout });
}

export async function trackMessage(userId, isMedia, isReply = false) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const now = new Date();
      const today = new Date().toISOString().slice(0, 10);

      let act = await Activity.findOne({ userId });
      if (!act) {
        act = await Activity.create({ userId, status: "offline" });
      }

      // media counters (unchanged)
      const joinedAgoMs = now.getTime() - act.firstSeen.getTime();
      const FIRST_24H_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (isMedia) {
        if (joinedAgoMs < FIRST_24H_MS) {
          act.mediaCounts.first24h += 1;
        }
        act.mediaCounts.byDate.set(
          today,
          (act.mediaCounts.byDate.get(today) || 0) + 1
        );
      }

      // Profile statistics tracking
      act.totalMessages = (act.totalMessages || 0) + 1;
      if (isReply) {
        act.totalReplies = (act.totalReplies || 0) + 1;
      }
      if (isMedia) {
        act.totalMediaMessages = (act.totalMediaMessages || 0) + 1;
      } else {
        act.totalTextMessages = (act.totalTextMessages || 0) + 1;
      }

      act.lastActive = now;

      // transition to ONLINE if not already
      const wasStatus = act.status || "offline";
      if (wasStatus !== "online") {
        await setStatus(act, "online");
      } else {
        await act.save(); // still persist lastActive for online users
      }

      // (re)schedule idle/offline timers based on this activity time
      scheduleStatusTimers(userId, act.lastOnlineChange);
      return; // Success
    } catch (error) {
      attempt++;

      // Check if it's a version conflict error
      const isVersionError = error.message && (
        error.message.includes('No matching document found') ||
        error.message.includes('version') ||
        error.name === 'VersionError'
      );

      if (isVersionError && attempt < maxRetries) {
        // Exponential backoff: 10ms, 20ms, 40ms
        const delay = 10 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Retry
      }

      // Not a version error or out of retries
      console.error(`[activity] Error tracking message for ${userId}:`, {
        error: error.message,
        attempt,
        isVersionError
      });
      return; // Give up
    }
  }
}

export async function getActivity(id) {
  return await Activity.findOne({ userId: id });
}

export async function allUsers() {
  const all = await Activity.find();
  return all.map((a) => [a.userId, a]);
}

export async function getAllActivities() {
  const all = await Activity.find();
  const map = new Map();
  for (const a of all) {
    map.set(a.userId, a);
  }
  return map;
}

export async function resetDailyCounters() {
  const today = new Date().toISOString().slice(0, 10);
  const all = await Activity.find();

  for (const a of all) {
    if (!a.mediaCounts.byDate.has(today)) {
      a.mediaCounts.byDate.set(today, 0);
      try {
        await a.save();
      } catch (error) {
        console.error(`[activity] Error resetting daily counter for ${a.userId}:`, error.message);
      }
    }
  }
}
