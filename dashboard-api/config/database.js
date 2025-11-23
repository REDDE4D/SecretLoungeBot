import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DBNAME = process.env.DBNAME;

if (!MONGO_URI || !DBNAME) {
  throw new Error("MONGO_URI and DBNAME environment variables are required");
}

/**
 * Connect to MongoDB and register all models
 * Reuses the same database as the main bot
 *
 * IMPORTANT: Bot models are created with a different mongoose instance,
 * so we need to re-register them with the API's connection
 */
export async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: DBNAME,
      serverSelectionTimeoutMS: 10000, // Timeout after 10s for initial connection
      socketTimeoutMS: 0, // Never timeout sockets (keep connection alive)
      maxPoolSize: 10, // Max connection pool size
      minPoolSize: 2, // Min connection pool size
      connectTimeoutMS: 10000, // Connection timeout
      heartbeatFrequencyMS: 10000, // Check connection health every 10s
      retryWrites: true,
      autoIndex: false, // Don't build indexes in production
    });
    console.log(`✅ MongoDB connected: ${DBNAME}`);

    // Import bot models and re-register them with the API's mongoose connection
    // The bot's models were created with a different mongoose instance (separate process),
    // so we need to extract their schemas and re-register them
    const models = [
      { path: "../../src/models/User.js", name: "User" },
      { path: "../../src/models/Activity.js", name: "Activity" },
      { path: "../../src/models/RelayedMessage.js", name: "RelayedMessage" },
      { path: "../../src/models/Report.js", name: "Report" },
      { path: "../../src/models/SpamDetection.js", name: "SpamDetection" },
      { path: "../../src/models/AuditLog.js", name: "AuditLog" },
      { path: "../../src/models/Poll.js", name: "Poll" },
      { path: "../../src/models/Filter.js", name: "Filter" },
      { path: "../../src/models/Setting.js", name: "Setting" },
      { path: "../../src/models/Invite.js", name: "Invite" },
      { path: "../../src/models/PinnedMessage.js", name: "PinnedMessage" },
      { path: "../../src/models/ScheduledAnnouncement.js", name: "ScheduledAnnouncement" },
      { path: "../../src/models/CustomRole.js", name: "CustomRole" },
      { path: "../../src/models/SystemRole.js", name: "SystemRole" },
      { path: "../../src/models/LinkWhitelist.js", name: "LinkWhitelist" },
      { path: "../../src/models/Warning.js", name: "Warning" },
      { path: "../models/Session.js", name: "Session" },
      { path: "../models/LoginAttempt.js", name: "LoginAttempt" },
      { path: "../models/LoginToken.js", name: "LoginToken" },
      { path: "../models/BotLog.js", name: "BotLog" },
      { path: "../models/Notification.js", name: "Notification" },
      { path: "../models/NotificationPreferences.js", name: "NotificationPreferences" },
    ];

    for (const { path, name } of models) {
      const module = await import(path);
      const Model = module[name] || module.default;

      if (!Model || !Model.schema) {
        console.warn(`⚠️ Warning: Could not find model ${name} in ${path}`);
        continue;
      }

      // Re-register the model with the API's mongoose instance
      // If model already exists, skip (it means it's already registered with this connection)
      try {
        mongoose.model(name);
        // Model already exists, skip
      } catch (err) {
        // Model doesn't exist, register it with the current connection
        mongoose.model(name, Model.schema);
      }
    }

    console.log(`✅ Models registered successfully: ${mongoose.modelNames().join(", ")}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
export async function disconnectDatabase() {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error.message);
  }
}

// Handle connection events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected - attempting to reconnect...");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected successfully");
});

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected");
});

export default mongoose;
