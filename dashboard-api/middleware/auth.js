import mongoose from "mongoose";
import { verifyAccessToken, hashToken, compareTokenHash } from "../utils/jwt.js";

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user to request
 */
export async function authenticate(req, res, next) {
  try {
    // Get Session model at runtime
    const Session = mongoose.model("Session");

    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Hash token for session lookup
    const tokenHash = await hashToken(token);

    // Check if session exists and is active
    const session = await Session.findByAccessToken(tokenHash);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session not found or expired",
      });
    }

    // Update last activity
    session.lastActivity = new Date();
    await session.save();

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    req.session = session;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    // Get Session model at runtime
    const Session = mongoose.model("Session");

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);

      if (decoded) {
        const tokenHash = await hashToken(token);
        const session = await Session.findByAccessToken(tokenHash);

        if (session) {
          req.user = {
            id: decoded.userId,
            role: decoded.role,
            permissions: decoded.permissions || [],
          };
          req.session = session;
        }
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

// Alias for backward compatibility
export const requireAuth = authenticate;
