/**
 * Centralized Error Handling Utilities
 * 
 * Provides custom error classes and standardized error responses
 * for consistent error handling across the application.
 */

/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Authentication Error (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * External Service Error (502)
 */
class ExternalServiceError extends AppError {
  constructor(service, message = 'External service unavailable') {
    super(`${service}: ${message}`, 502);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Database Error (500)
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500);
    this.name = 'DatabaseError';
    this.details = details;
  }
}

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors automatically
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Standardized Success Response
 * 
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

/**
 * Standardized Error Response
 * 
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code
 */
const sendError = (res, error, statusCode = 500) => {
  const response = {
    success: false,
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      name: error.name,
      stack: error.stack,
      details: error.details || null
    };
  }

  // Include validation details if available
  if (error.details && process.env.NODE_ENV !== 'production') {
    response.details = error.details;
  }

  res.status(statusCode).json(response);
};

/**
 * Global Error Handler Middleware
 * Should be added as the last middleware in Express app
 * 
 * @example
 * app.use(errorHandler);
 */
const errorHandler = (err, req, res, next) => {
  // Log error for monitoring
  console.error('[ERROR]', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Handle known operational errors
  if (err.isOperational) {
    return sendError(res, err, err.statusCode);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return sendError(res, new ValidationError(err.message, err.details), 400);
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return sendError(res, new AuthenticationError('Invalid or expired token'), 401);
  }

  if (err.name === 'CastError') {
    return sendError(res, new ValidationError('Invalid ID format'), 400);
  }

  if (err.code === 11000) {
    return sendError(res, new ConflictError('Duplicate entry'), 409);
  }

  // Handle unknown errors
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  sendError(res, new AppError(message, 500, false), 500);
};

/**
 * 404 Not Found Handler
 * Should be added before the error handler middleware
 * 
 * @example
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

module.exports = {
  // Error Classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  DatabaseError,
  
  // Utilities
  asyncHandler,
  sendSuccess,
  sendError,
  
  // Middleware
  errorHandler,
  notFoundHandler
};
