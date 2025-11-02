import { allUsers } from "./activity.js";
import {
  leaveLobby,
  getLobbyUsers,
  getAllUserMeta,
} from "./index.js";
import bot from "../core/bot.js";

const whitelist = ["admin", "mod", "whitelist"];

function notify(userId, message) {
  bot.telegram.sendMessage(userId, message).catch(() => {
    // Silently fail
  });
}

const MS_PER_DAY = 86400000;

export async function checkCompliance() {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - MS_PER_DAY)
    .toISOString()
    .slice(0, 10);

  // Batch fetch all user data and lobby users to avoid N+1 queries
  const lobbyUsersList = await getLobbyUsers();
  const lobbyUsersSet = new Set(lobbyUsersList);
  const allUsersList = await allUsers();
  const userMetaMap = await getAllUserMeta(); // Single query for all users

  for (const [userId, data] of allUsersList) {
    const userMeta = userMetaMap.get(userId);
    if (!userMeta) continue;

    const role = userMeta.role || null;
    const alias = userMeta.alias || "Unknown";
    const lobbyActive = lobbyUsersSet.has(userId);

    if (whitelist.includes(role)) {
      continue;
    }

    // Skip banned users
    if (data.bannedUntil && data.bannedUntil > now) continue;

    // ✅ Rule: Inactive for 7 days → kick
    const inactiveFor = now - (data.lastActive || 0);
    if (inactiveFor > 7 * MS_PER_DAY && lobbyActive) {
      await leaveLobby(userId);
      notify(
        userId,
        `👋 You were removed from the lobby due to 7 days of inactivity.`
      );
    }
  }
}
