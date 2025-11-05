import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { globalRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { sanitizeInput } from "./middleware/validation.js";
import routes from "./routes/index.js";

/**
 * Create and configure Express app
 * Exported for testing purposes
 */
export function createApp() {
  const app = express();
  const NODE_ENV = process.env.NODE_ENV || "development";

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
        "http://localhost:3000",
        "http://localhost:3001",
      ];

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
   * Rate Limiting (skip in test environment)
   */
  if (NODE_ENV !== "test") {
    app.use("/api", globalRateLimiter);
  }

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
   * Mount API Routes
   */
  app.use("/api", routes);

  /**
   * Root endpoint
   */
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "TG-Lobby-Bot Dashboard API",
      version: "2.1.0",
      phase: "Phase 8 - Testing & Optimization",
      features: ["REST API", "WebSocket Real-time Events", "JWT Authentication", "RBAC"],
      documentation: "/api",
    });
  });

  /**
   * Error Handling
   */
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
