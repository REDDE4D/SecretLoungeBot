/**
 * Security Feature Tests
 * Tests for brute force protection, audit logging, and security measures
 */

import request from "supertest";
import { app } from "../app.js";
import { connectDatabase, closeDatabase, clearDatabase } from "./setup.js";
import LoginAttempt from "../models/LoginAttempt.js";
import Session from "../models/Session.js";
import crypto from "crypto";
import { User } from "../../src/models/User.js";

// Helper function to generate valid Telegram auth data
function generateValidTelegramAuth(userId = "123456789", botToken = process.env.BOT_TOKEN) {
  const authDate = Math.floor(Date.now() / 1000);
  const dataCheckString = `auth_date=${authDate}\nfirst_name=TestUser\nid=${userId}`;

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return {
    id: parseInt(userId),
    first_name: "TestUser",
    auth_date: authDate,
    hash,
  };
}

beforeAll(async () => {
  await connectDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  // Create a test admin user
  await User.create({
    _id: "123456789",
    alias: "TestAdmin",
    role: "admin",
    inLobby: true,
    icon: { fallback: "👤" },
  });
});

describe("Brute Force Protection", () => {
  test("should allow login with valid credentials", async () => {
    const authData = generateValidTelegramAuth("123456789");

    const response = await request(app).post("/api/auth/telegram").send(authData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
  });

  test("should track failed login attempts by IP", async () => {
    const invalidAuthData = {
      id: 123456789,
      first_name: "TestUser",
      auth_date: Math.floor(Date.now() / 1000),
      hash: "invalid_hash",
    };

    // First attempt
    let response = await request(app).post("/api/auth/telegram").send(invalidAuthData);
    expect(response.status).toBe(400);

    // Check that attempt was recorded
    const attempt = await LoginAttempt.findOne({ type: "ip" });
    expect(attempt).toBeDefined();
    expect(attempt.attempts).toBeGreaterThanOrEqual(1);
  });

  test("should block IP after 3 failed attempts", async () => {
    const invalidAuthData = {
      id: 123456789,
      first_name: "TestUser",
      auth_date: Math.floor(Date.now() / 1000),
      hash: "invalid_hash",
    };

    // Make 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await request(app).post("/api/auth/telegram").send(invalidAuthData);
    }

    // 4th attempt should be blocked
    const response = await request(app).post("/api/auth/telegram").send(invalidAuthData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Too many failed login attempts");
  });

  test("should reset attempts after successful login", async () => {
    const invalidAuthData = {
      id: 123456789,
      first_name: "TestUser",
      auth_date: Math.floor(Date.now() / 1000),
      hash: "invalid_hash",
    };

    // Make 2 failed attempts
    await request(app).post("/api/auth/telegram").send(invalidAuthData);
    await request(app).post("/api/auth/telegram").send(invalidAuthData);

    // Check attempts recorded
    let ipAttempt = await LoginAttempt.findOne({ type: "ip" });
    expect(ipAttempt.attempts).toBeGreaterThanOrEqual(2);

    // Successful login
    const validAuthData = generateValidTelegramAuth("123456789");
    const response = await request(app).post("/api/auth/telegram").send(validAuthData);

    expect(response.status).toBe(200);

    // Check attempts reset
    ipAttempt = await LoginAttempt.findOne({ type: "ip" });
    expect(ipAttempt).toBeNull();
  });

  test("should track failed attempts per user ID", async () => {
    const invalidAuthData = {
      id: 999999999, // Non-existent user
      first_name: "TestUser",
      auth_date: Math.floor(Date.now() / 1000),
      hash: "valid_hash_but_user_doesnt_exist",
    };

    // Manually create a "valid" hash for non-existent user
    const authDate = Math.floor(Date.now() / 1000);
    const userId = "999999999";
    const dataCheckString = `auth_date=${authDate}\nfirst_name=TestUser\nid=${userId}`;
    const secretKey = crypto.createHash("sha256").update(process.env.BOT_TOKEN).digest();
    const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    const validHashInvalidUser = {
      id: parseInt(userId),
      first_name: "TestUser",
      auth_date: authDate,
      hash,
    };

    // Try to login with non-existent user
    const response = await request(app).post("/api/auth/telegram").send(validHashInvalidUser);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("User not registered");

    // Check that user attempt was recorded
    const userAttempt = await LoginAttempt.findOne({ identifier: userId, type: "user" });
    expect(userAttempt).toBeDefined();
    expect(userAttempt.attempts).toBeGreaterThanOrEqual(1);
  });
});

describe("Session Management", () => {
  test("should create session on successful login", async () => {
    const authData = generateValidTelegramAuth("123456789");
    const response = await request(app).post("/api/auth/telegram").send(authData);

    expect(response.status).toBe(200);

    // Check session created
    const sessions = await Session.getUserSessions("123456789");
    expect(sessions.length).toBe(1);
    expect(sessions[0].userId).toBe("123456789");
  });

  test("should limit to 5 active sessions per user", async () => {
    const authData = generateValidTelegramAuth("123456789");

    // Create 6 sessions
    for (let i = 0; i < 6; i++) {
      await request(app).post("/api/auth/telegram").send(authData);
    }

    // Check only 5 sessions exist
    const sessions = await Session.getUserSessions("123456789");
    expect(sessions.length).toBeLessThanOrEqual(5);
  });

  test("should invalidate session on logout", async () => {
    const authData = generateValidTelegramAuth("123456789");
    const loginResponse = await request(app).post("/api/auth/telegram").send(authData);

    const accessToken = loginResponse.body.data.accessToken;

    // Logout
    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(logoutResponse.status).toBe(200);

    // Check session deleted
    const sessions = await Session.getUserSessions("123456789");
    expect(sessions.length).toBe(0);
  });

  test("should invalidate all sessions on logout-all", async () => {
    const authData = generateValidTelegramAuth("123456789");

    // Create 3 sessions
    const tokens = [];
    for (let i = 0; i < 3; i++) {
      const response = await request(app).post("/api/auth/telegram").send(authData);
      tokens.push(response.body.data.accessToken);
    }

    // Check 3 sessions exist
    let sessions = await Session.getUserSessions("123456789");
    expect(sessions.length).toBe(3);

    // Logout from all devices using first token
    const logoutResponse = await request(app)
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${tokens[0]}`);

    expect(logoutResponse.status).toBe(200);

    // Check all sessions deleted
    sessions = await Session.getUserSessions("123456789");
    expect(sessions.length).toBe(0);
  });

  test("should update last activity on token refresh", async () => {
    const authData = generateValidTelegramAuth("123456789");
    const loginResponse = await request(app).post("/api/auth/telegram").send(authData);

    const refreshToken = loginResponse.body.data.refreshToken;

    // Get initial session
    const initialSession = await Session.findByRefreshToken(
      crypto.createHash("sha256").update(refreshToken).digest("hex")
    );
    const initialLastActivity = initialSession.lastActivity;

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Refresh token
    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(refreshResponse.status).toBe(200);

    // Get updated session
    const updatedSession = await Session.findByRefreshToken(
      crypto.createHash("sha256").update(refreshToken).digest("hex")
    );

    expect(updatedSession.lastActivity.getTime()).toBeGreaterThan(initialLastActivity.getTime());
  });
});

describe("Permission Checks", () => {
  test("should deny dashboard access to regular users", async () => {
    // Create regular user (no role)
    await User.create({
      _id: "987654321",
      alias: "RegularUser",
      role: null,
      inLobby: true,
      icon: { fallback: "👤" },
    });

    const authData = generateValidTelegramAuth("987654321");
    const response = await request(app).post("/api/auth/telegram").send(authData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("You do not have permission");
  });

  test("should deny dashboard access to whitelist users", async () => {
    // Create whitelist user
    await User.create({
      _id: "111111111",
      alias: "WhitelistUser",
      role: "whitelist",
      inLobby: true,
      icon: { fallback: "👤" },
    });

    const authData = generateValidTelegramAuth("111111111");
    const response = await request(app).post("/api/auth/telegram").send(authData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("You do not have permission");
  });

  test("should allow dashboard access to moderators", async () => {
    // Create mod user
    await User.create({
      _id: "222222222",
      alias: "ModUser",
      role: "mod",
      inLobby: true,
      icon: { fallback: "👤" },
    });

    const authData = generateValidTelegramAuth("222222222");
    const response = await request(app).post("/api/auth/telegram").send(authData);

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe("mod");
  });

  test("should allow dashboard access to admins", async () => {
    const authData = generateValidTelegramAuth("123456789"); // TestAdmin
    const response = await request(app).post("/api/auth/telegram").send(authData);

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe("admin");
  });
});

describe("Token Security", () => {
  test("should reject invalid access tokens", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid_token");

    expect(response.status).toBe(401);
  });

  test("should reject expired refresh tokens", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "expired_token" });

    expect(response.status).toBe(400);
  });

  test("should reject missing authorization header", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  test("should reject malformed authorization header", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "InvalidFormat token");

    expect(response.status).toBe(401);
  });
});

describe("LoginAttempt Model Methods", () => {
  test("isBlocked should return block info when blocked", async () => {
    const identifier = "test_ip";

    // Create blocked attempt
    await LoginAttempt.create({
      identifier,
      type: "ip",
      attempts: 5,
      lastAttempt: new Date(),
      blockedUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    });

    const blockCheck = await LoginAttempt.isBlocked(identifier, "ip");

    expect(blockCheck.blocked).toBe(true);
    expect(blockCheck.attempts).toBe(5);
    expect(blockCheck.minutesLeft).toBeGreaterThan(0);
  });

  test("isBlocked should return not blocked for new identifier", async () => {
    const blockCheck = await LoginAttempt.isBlocked("new_identifier", "ip");

    expect(blockCheck.blocked).toBe(false);
    expect(blockCheck.attemptsLeft).toBeGreaterThan(0);
  });

  test("recordFailure should increment attempts", async () => {
    const identifier = "test_ip";

    await LoginAttempt.recordFailure(identifier, "ip");
    await LoginAttempt.recordFailure(identifier, "ip");

    const attempt = await LoginAttempt.findOne({ identifier, type: "ip" });

    expect(attempt.attempts).toBeGreaterThanOrEqual(2);
  });

  test("resetAttempts should delete attempt record", async () => {
    const identifier = "test_ip";

    await LoginAttempt.recordFailure(identifier, "ip");

    let attempt = await LoginAttempt.findOne({ identifier, type: "ip" });
    expect(attempt).toBeDefined();

    await LoginAttempt.resetAttempts(identifier, "ip");

    attempt = await LoginAttempt.findOne({ identifier, type: "ip" });
    expect(attempt).toBeNull();
  });
});
