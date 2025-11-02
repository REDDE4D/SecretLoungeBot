// src/utils/logger.js
import winston from "winston";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const logsDir = join(__dirname, "../../logs");

// Ensure logs directory exists
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // Error log file - only errors
    new winston.transports.File({
      filename: join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // Combined log file - all logs
    new winston.transports.File({
      filename: join(logsDir, "combined.log"),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: join(logsDir, "exceptions.log"),
      format: fileFormat,
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: join(logsDir, "rejections.log"),
      format: fileFormat,
    }),
  ],
});

// Add helper methods for common logging patterns
logger.logCommand = (userId, command, alias) => {
  logger.info("Command executed", { userId, command, alias });
};

logger.logRelay = (senderId, recipientCount, messageType) => {
  logger.info("Message relayed", { senderId, recipientCount, messageType });
};

logger.logModeration = (action, performedBy, targetUser, reason) => {
  logger.warn("Moderation action", { action, performedBy, targetUser, reason });
};

logger.logError = (context, error, additionalInfo = {}) => {
  logger.error(`Error in ${context}`, {
    error: error.message,
    stack: error.stack,
    ...additionalInfo,
  });
};

logger.logAuth = (userId, action, success) => {
  logger.info("Authentication event", { userId, action, success });
};

// Export the logger
export default logger;
