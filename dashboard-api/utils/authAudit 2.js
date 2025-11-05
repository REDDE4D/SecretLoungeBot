import AuditLog from "../../src/models/AuditLog.js";

/**
 * Auth Audit Logger
 * Logs authentication events to the audit log
 */

/**
 * Log a successful login
 */
export async function logLogin(userId, ipAddress, userAgent) {
  try {
    // Check if the AuditLog model supports auth events
    // If not, we'll just log to console
    const action = "login_success";

    // Try to save to database, fall back to console if schema doesn't support it
    try {
      await AuditLog.create({
        action,
        moderatorId: userId,
        targetUserId: userId,
        details: {
          ipAddress,
          userAgent,
          method: "telegram",
        },
      });
    } catch (err) {
      // If the action is not in the enum, log to console
      if (err.name === "ValidationError") {
        console.log(`[AUTH AUDIT] Login success - User: ${userId}, IP: ${ipAddress}`);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error logging login:", error);
  }
}

/**
 * Log a failed login attempt
 */
export async function logLoginFailure(userId, ipAddress, reason, userAgent) {
  try {
    const action = "login_failure";

    try {
      await AuditLog.create({
        action,
        moderatorId: userId || "unknown",
        targetUserId: userId,
        details: {
          ipAddress,
          userAgent,
          reason,
          method: "telegram",
        },
      });
    } catch (err) {
      if (err.name === "ValidationError") {
        console.log(
          `[AUTH AUDIT] Login failure - User: ${userId || "unknown"}, IP: ${ipAddress}, Reason: ${reason}`
        );
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error logging login failure:", error);
  }
}

/**
 * Log a logout event
 */
export async function logLogout(userId, ipAddress, logoutAll = false) {
  try {
    const action = logoutAll ? "logout_all" : "logout";

    try {
      await AuditLog.create({
        action,
        moderatorId: userId,
        targetUserId: userId,
        details: {
          ipAddress,
          logoutAll,
        },
      });
    } catch (err) {
      if (err.name === "ValidationError") {
        console.log(
          `[AUTH AUDIT] ${logoutAll ? "Logout all devices" : "Logout"} - User: ${userId}, IP: ${ipAddress}`
        );
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error logging logout:", error);
  }
}

/**
 * Log token refresh
 */
export async function logTokenRefresh(userId, ipAddress) {
  try {
    const action = "token_refresh";

    try {
      await AuditLog.create({
        action,
        moderatorId: userId,
        targetUserId: userId,
        details: {
          ipAddress,
        },
      });
    } catch (err) {
      if (err.name === "ValidationError") {
        console.log(`[AUTH AUDIT] Token refresh - User: ${userId}, IP: ${ipAddress}`);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error logging token refresh:", error);
  }
}

/**
 * Log session expired
 */
export async function logSessionExpired(userId, reason = "expired") {
  try {
    const action = "session_expired";

    try {
      await AuditLog.create({
        action,
        moderatorId: userId,
        targetUserId: userId,
        details: {
          reason,
        },
      });
    } catch (err) {
      if (err.name === "ValidationError") {
        console.log(`[AUTH AUDIT] Session expired - User: ${userId}, Reason: ${reason}`);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error logging session expiry:", error);
  }
}

/**
 * Log brute force block
 */
export async function logBruteForceBlock(identifier, type, attempts, blockMinutes) {
  try {
    const action = "brute_force_block";

    try {
      await AuditLog.create({
        action,
        moderatorId: "system",
        details: {
          identifier,
          type,
          attempts,
          blockMinutes,
        },
      });
    } catch (err) {
      if (err.name === "ValidationError") {
        console.log(
          `[AUTH AUDIT] Brute force block - ${type}: ${identifier}, Attempts: ${attempts}, Block: ${blockMinutes}min`
        );
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error logging brute force block:", error);
  }
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(userId, ipAddress, endpoint, reason) {
  try {
    const action = "unauthorized_access";

    try {
      await AuditLog.create({
        action,
        moderatorId: userId || "unknown",
        targetUserId: userId,
        details: {
          ipAddress,
          endpoint,
          reason,
        },
      });
    } catch (err) {
      if (err.name === "ValidationError") {
        console.log(
          `[AUTH AUDIT] Unauthorized access - User: ${userId || "unknown"}, IP: ${ipAddress}, Endpoint: ${endpoint}`
        );
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error logging unauthorized access:", error);
  }
}
