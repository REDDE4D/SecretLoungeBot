import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { getPermissionsForRole } from "./permissions.js";

/**
 * Initialize Socket.io server with authentication and room management
 * @param {import('http').Server} httpServer - HTTP server instance
 * @param {Object} corsOptions - CORS options from Express
 * @returns {import('socket.io').Server} Socket.io server instance
 */
export function initializeSocket(httpServer, corsOptions) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      credentials: corsOptions.credentials,
      methods: corsOptions.methods,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Fetch user from database using mongoose.model() to get the registered model
      const User = mongoose.model("User");
      const user = await User.findOne({ _id: decoded.userId });

      if (!user) {
        return next(new Error("User not found"));
      }

      // Check if user has dashboard access
      const permissions = await getPermissionsForRole(user.role);

      if (!permissions.includes("dashboard.access") && !permissions.includes("*")) {
        return next(new Error("Dashboard access denied"));
      }

      // Attach user data to socket
      socket.userId = user._id;
      socket.userRole = user.role;
      socket.userAlias = user.alias;
      socket.permissions = permissions;

      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return next(new Error("Invalid token"));
      }
      if (error.name === "TokenExpiredError") {
        return next(new Error("Token expired"));
      }
      return next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`✅ WebSocket connected: ${socket.userAlias} (${socket.userId}) [${socket.userRole || "user"}]`);

    // Join personal user room for notifications
    const personalRoom = `user:${socket.userId}`;
    socket.join(personalRoom);
    console.log(`   📍 Joined personal room: ${personalRoom}`);

    // Join appropriate rooms based on role
    const rooms = getRoomsForUser(socket.userRole, socket.permissions);
    rooms.forEach((room) => {
      socket.join(room);
      console.log(`   📍 Joined room: ${room}`);
    });

    // Handle subscription to stats updates
    socket.on("subscribe:stats", () => {
      socket.join("stats-subscribers");
      console.log(`   📊 ${socket.userAlias} subscribed to stats updates`);
    });

    socket.on("unsubscribe:stats", () => {
      socket.leave("stats-subscribers");
      console.log(`   📊 ${socket.userAlias} unsubscribed from stats updates`);
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`❌ WebSocket disconnected: ${socket.userAlias} (reason: ${reason})`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`⚠️ WebSocket error for ${socket.userAlias}:`, error);
    });
  });

  return io;
}

/**
 * Determine which rooms a user should join based on their role and permissions
 * @param {string} role - User role (admin, mod, whitelist, null)
 * @param {string[]} permissions - User permissions
 * @returns {string[]} Array of room names
 */
function getRoomsForUser(role, permissions) {
  const rooms = ["lobby"]; // All authenticated users join lobby

  // Admin room
  if (role === "admin" || permissions.includes("*")) {
    rooms.push("admin-room");
  }

  // Moderator room (includes admins)
  if (role === "admin" || role === "mod" || permissions.includes("moderation.view_reports")) {
    rooms.push("mod-room");
  }

  // Statistics room (users who can view stats)
  if (
    permissions.includes("*") ||
    permissions.includes("stats.view_overview") ||
    permissions.includes("stats.view_users") ||
    permissions.includes("stats.view_messages")
  ) {
    rooms.push("stats-room");
  }

  // Logs room (users who can view bot logs)
  if (
    permissions.includes("*") ||
    permissions.includes("logs.view_bot")
  ) {
    rooms.push("logs-room");
  }

  return rooms;
}

/**
 * Get Socket.io instance (set after initialization)
 */
let ioInstance = null;

export function setIoInstance(io) {
  ioInstance = io;
}

export function getIoInstance() {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized. Call initializeSocket first.");
  }
  return ioInstance;
}
