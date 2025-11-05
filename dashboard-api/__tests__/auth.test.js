import request from "supertest";
import crypto from "crypto";
import app from "../app.js";
import User from "../../src/models/User.js";
import Session from "../models/Session.js";
import "./setup.js";

/**
 * Helper function to generate valid Telegram auth data
 */
function generateTelegramAuth(userId = 123456789, botToken = process.env.BOT_TOKEN) {
  const authDate = Math.floor(Date.now() / 1000);
  const data = {
    id: userId,
    first_name: "Test",
    username: "testuser",
    auth_date: authDate,
  };

  // Create data check string
  const checkArr = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`);
  const dataCheckString = checkArr.join("\n");

  // Create secret key from bot token
  const secretKey = crypto.createHash("sha256").update(botToken).digest();

  // Calculate HMAC-SHA256 signature
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return { ...data, hash };
}

describe("Authentication API", () => {
  let adminUser;
  let adminAuthData;
  let adminToken;

  beforeAll(async () => {
    // Create an admin user for testing
    adminUser = await User.create({
      _id: "999999999",
      alias: "AdminTest",
      icon: { fallback: "🔧", customEmojiId: null },
      inLobby: true,
      role: "admin",
    });

    // Generate valid auth data for admin
    adminAuthData = generateTelegramAuth(999999999);
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ _id: { $in: ["123456789", "999999999"] } });
    await Session.deleteMany({ userId: { $in: ["123456789", "999999999"] } });
  });

  describe("POST /api/auth/telegram", () => {
    it("should authenticate with valid Telegram data", async () => {
      const authData = generateTelegramAuth();

      const response = await request(app)
        .post("/api/auth/telegram")
        .send(authData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe("123456789");
    });

    it("should reject authentication with invalid hash", async () => {
      const authData = generateTelegramAuth();
      authData.hash = "invalid_hash";

      const response = await request(app)
        .post("/api/auth/telegram")
        .send(authData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid");
    });

    it("should reject authentication with expired auth_date", async () => {
      const expiredAuthDate = Math.floor(Date.now() / 1000) - 90000; // 25 hours ago
      const data = {
        id: 123456789,
        first_name: "Test",
        username: "testuser",
        auth_date: expiredAuthDate,
      };

      const checkArr = Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`);
      const dataCheckString = checkArr.join("\n");
      const secretKey = crypto
        .createHash("sha256")
        .update(process.env.BOT_TOKEN)
        .digest();
      const hash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      const response = await request(app)
        .post("/api/auth/telegram")
        .send({ ...data, hash })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should reject authentication without required fields", async () => {
      const response = await request(app)
        .post("/api/auth/telegram")
        .send({ id: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should create session for authenticated user", async () => {
      const authData = generateTelegramAuth(888888888);

      const response = await request(app)
        .post("/api/auth/telegram")
        .send(authData)
        .expect(200);

      const session = await Session.findOne({ userId: "888888888" });
      expect(session).toBeDefined();
      expect(session.userId).toBe("888888888");

      // Clean up
      await User.deleteOne({ _id: "888888888" });
      await Session.deleteMany({ userId: "888888888" });
    });
  });

  describe("POST /api/auth/refresh", () => {
    let refreshToken;

    beforeAll(async () => {
      // Get a refresh token by logging in
      const response = await request(app)
        .post("/api/auth/telegram")
        .send(adminAuthData)
        .expect(200);

      refreshToken = response.body.data.refreshToken;
      adminToken = response.body.data.accessToken;
    });

    it("should refresh access token with valid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.accessToken).not.toBe(adminToken);
    });

    it("should reject refresh with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid_token" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should reject refresh without token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user info with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe("999999999");
      expect(response.body.data.user.role).toBe("admin");
    });

    it("should reject request without token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid_token")
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    let logoutToken;

    beforeAll(async () => {
      // Get a new token for logout test
      const authData = generateTelegramAuth(777777777);
      const response = await request(app)
        .post("/api/auth/telegram")
        .send(authData)
        .expect(200);

      logoutToken = response.body.data.accessToken;
    });

    afterAll(async () => {
      await User.deleteOne({ _id: "777777777" });
      await Session.deleteMany({ userId: "777777777" });
    });

    it("should logout and invalidate session", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${logoutToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Logged out");

      // Try to use the same token - should fail
      const meResponse = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${logoutToken}`)
        .expect(401);

      expect(meResponse.body.success).toBe(false);
    });

    it("should reject logout without token", async () => {
      const response = await request(app).post("/api/auth/logout").expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/logout-all", () => {
    let multiSessionUser;
    let token1, token2;

    beforeAll(async () => {
      const authData = generateTelegramAuth(666666666);

      // Create first session
      const response1 = await request(app)
        .post("/api/auth/telegram")
        .send(authData)
        .expect(200);
      token1 = response1.body.data.accessToken;

      // Create second session
      const response2 = await request(app)
        .post("/api/auth/telegram")
        .send(authData)
        .expect(200);
      token2 = response2.body.data.accessToken;
    });

    afterAll(async () => {
      await User.deleteOne({ _id: "666666666" });
      await Session.deleteMany({ userId: "666666666" });
    });

    it("should logout from all devices", async () => {
      const response = await request(app)
        .post("/api/auth/logout-all")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("all devices");

      // Both tokens should now be invalid
      await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token1}`)
        .expect(401);

      await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token2}`)
        .expect(401);

      // Verify all sessions are deleted
      const sessions = await Session.find({ userId: "666666666" });
      expect(sessions.length).toBe(0);
    });
  });
});
