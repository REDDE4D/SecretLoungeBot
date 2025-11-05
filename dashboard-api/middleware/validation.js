import { validateSchema } from "../utils/validators.js";

/**
 * Validate request body middleware
 *
 * @param {Object} schema - Zod schema
 * @returns {Function} - Express middleware
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = validateSchema(schema, req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: result.error,
      });
    }

    // Replace body with validated data
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters middleware
 *
 * @param {Object} schema - Zod schema
 * @returns {Function} - Express middleware
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = validateSchema(schema, req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: result.error,
      });
    }

    // Replace query with validated data
    req.query = result.data;
    next();
  };
}

/**
 * Validate route parameters middleware
 *
 * @param {Object} schema - Zod schema
 * @returns {Function} - Express middleware
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = validateSchema(schema, req.params);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: result.error,
      });
    }

    // Replace params with validated data
    req.params = result.data;
    next();
  };
}

/**
 * Sanitize input to prevent injection attacks
 */
export function sanitizeInput(req, res, next) {
  // Recursively sanitize object
  function sanitize(obj) {
    if (typeof obj === "string") {
      // Remove null bytes
      return obj.replace(/\0/g, "");
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (typeof obj === "object" && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  }

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
}
