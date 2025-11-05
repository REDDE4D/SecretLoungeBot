/**
 * Global error handling middleware
 *
 * Catches all errors and sends formatted JSON responses
 */
export function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  // Default error response
  const error = {
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      ...error,
      message: "Validation error",
      details: err.errors,
    });
  }

  if (err.name === "UnauthorizedError" || err.statusCode === 401) {
    return res.status(401).json({
      ...error,
      message: "Unauthorized",
    });
  }

  if (err.name === "ForbiddenError" || err.statusCode === 403) {
    return res.status(403).json({
      ...error,
      message: "Forbidden",
    });
  }

  if (err.statusCode === 404) {
    return res.status(404).json({
      ...error,
      message: "Not found",
    });
  }

  if (err.statusCode === 429) {
    return res.status(429).json({
      ...error,
      message: "Too many requests",
    });
  }

  // Default to 500 Internal Server Error
  res.status(err.statusCode || 500).json(error);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
}

/**
 * Async route wrapper to catch errors
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} - Wrapped handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
