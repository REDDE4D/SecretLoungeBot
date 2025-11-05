import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { globalRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { sanitizeInput } from "./middleware/validation.js";
// NOTE: routes, socket, and socketService are imported dynamically after database connection
// to ensure models are registered properly before being used

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "MONGO_URI",
  "DBNAME",
  "API_PORT",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "BOT_TOKEN",
  "DASHBOARD_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error("Please check your .env file and ensure all required variables are set.");
    process.exit(1);
  }
}

// Validate JWT secrets are strong enough
if (process.env.JWT_ACCESS_SECRET.length < 32) {
  console.error("❌ JWT_ACCESS_SECRET must be at least 32 characters");
  process.exit(1);
}

if (process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error("❌ JWT_REFRESH_SECRET must be at least 32 characters");
  process.exit(1);
}

const app = express();
const PORT = process.env.API_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

/**
 * Trust proxy
 * Required when behind nginx reverse proxy
 */
app.set('trust proxy', 1);

/**
 * Security Middleware
 */

// Helmet - Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS - Allow requests from dashboard frontend
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.DASHBOARD_URL,
      process.env.PRODUCTION_DASHBOARD_URL,
      process.env.PRODUCTION_API_URL,
      "http://localhost:3000",
      "http://localhost:3001",
    ].filter(Boolean); // Remove undefined values

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

/**
 * Response Compression
 * Compress all responses to reduce bandwidth
 */
app.use(compression({
  level: 6, // Compression level (0-9, default is 6)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client explicitly disables it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Compress all responses by default
    return compression.filter(req, res);
  }
}));

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * Request Sanitization
 */
app.use(sanitizeInput);

/**
 * Rate Limiting
 */
app.use("/api", globalRateLimiter);

/**
 * Request Logging (Development)
 */
if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

/**
 * Root endpoint
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TG-Lobby-Bot Dashboard API",
    version: "2.0.0",
    phase: "Phase 3 - WebSocket Implementation",
    features: ["REST API", "WebSocket Real-time Events", "JWT Authentication", "RBAC"],
    documentation: "/api",
    websocket: `ws://localhost:${PORT}`,
  });
});

/**
 * NOTE: API Routes and error handlers are mounted dynamically in startServer()
 * after database connection to ensure models are properly registered before being used
 */

/**
 * Start Server
 */
let statsUpdateInterval = null;
let httpServer = null;
let io = null;

async function startServer() {
  try {
    // Connect to MongoDB first
    // This will also import all models to ensure they're registered with the connection
    await connectDatabase();

    // Create HTTP server from Express app first
    httpServer = createServer(app);

    // Import routes AFTER database connection to ensure models are available
    const { default: routes } = await import("./routes/index.js");

    // Mount API routes (BEFORE error handlers - middleware order matters!)
    app.use("/api", routes);

    // Mount error handlers AFTER routes
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Import socket module after models are registered
    const { initializeSocket, setIoInstance } = await import("./config/socket.js");

    // Initialize Socket.io with authentication and rooms
    io = initializeSocket(httpServer, corsOptions);
    setIoInstance(io);

    // Import socket service after models are registered
    const { startStatsUpdateInterval: startStats, stopStatsUpdateInterval: stopStats } =
      await import("./services/socketService.js");

    // Store the stop function for cleanup
    global.stopStatsUpdateInterval = stopStats;

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 TG-Lobby-Bot Dashboard API                           ║
║                                                            ║
║   Status:  Running                                         ║
║   Port:    ${PORT}                                        ║
║   Mode:    ${NODE_ENV}                                    ║
║   API:     http://localhost:${PORT}/api                   ║
║   Health:  http://localhost:${PORT}/api/health            ║
║   WS:      ws://localhost:${PORT}                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);

      // Start periodic stats updates after server is running
      statsUpdateInterval = startStats();
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop stats update interval
  if (statsUpdateInterval && global.stopStatsUpdateInterval) {
    global.stopStatsUpdateInterval(statsUpdateInterval);
  }

  // Close Socket.io connections
  if (io) {
    console.log("Closing WebSocket connections...");
    io.close((err) => {
      if (err) console.error("Error closing Socket.io:", err);
      else console.log("✅ WebSocket connections closed");
    });
  }

  // Close HTTP server
  if (httpServer) {
    httpServer.close(() => {
      console.log("✅ HTTP server closed");
    });
  }

  // Close database connection
  await disconnectDatabase();

  console.log("✅ Graceful shutdown complete");
  process.exit(0);
}

// Handle shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
startServer();
