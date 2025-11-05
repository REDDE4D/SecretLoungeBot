import rateLimit from "express-rate-limit";

/**
 * Global rate limiter
 * 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Auth endpoint rate limiter
 * 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per window
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
});

/**
 * WebSocket connection rate limiter
 * 5 connections per minute per IP
 */
export const wsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 WebSocket connections per minute
  message: {
    success: false,
    message: "Too many connection attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Export rate limiter
 * 10 requests per hour per IP
 */
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 exports per hour
  message: {
    success: false,
    message: "Too many export requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
