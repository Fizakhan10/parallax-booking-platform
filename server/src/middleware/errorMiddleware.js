import env from "../config/env.js";

/**
 * 404 handler
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  const response = {
    success: false,
    message: err.message || "Internal server error",
  };

  // Only include stack trace in development
  if (env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: err.errors,
    });
  }

  if (err.code === "23505") {
    // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      message: "Resource already exists",
    });
  }

  res.status(statusCode).json(response);
};
