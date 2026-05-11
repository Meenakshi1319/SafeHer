/**
 * Standardized API Response Formatter
 * 
 * Provides consistent response structure across all API endpoints.
 * Ensures clients can reliably parse responses.
 */

/**
 * Success response format
 * 
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
function success(res, data = null, message = 'Success', statusCode = 200, meta = {}) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
}

/**
 * Error response format
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Error details
 */
function error(res, message = 'An error occurred', statusCode = 500, details = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Paginated response format
 * 
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @param {string} message - Success message
 */
function paginated(res, data, page, limit, total, message = 'Success') {
  const totalPages = Math.ceil(total / limit);
  
  return success(res, data, message, 200, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}

/**
 * Created response (201)
 * 
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
function created(res, data, message = 'Resource created successfully') {
  return success(res, data, message, 201);
}

/**
 * No content response (204)
 * 
 * @param {Object} res - Express response object
 */
function noContent(res) {
  return res.status(204).send();
}

/**
 * Bad request response (400)
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} details - Validation details
 */
function badRequest(res, message = 'Bad request', details = null) {
  return error(res, message, 400, details);
}

/**
 * Unauthorized response (401)
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function unauthorized(res, message = 'Authentication required') {
  return error(res, message, 401);
}

/**
 * Forbidden response (403)
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function forbidden(res, message = 'Insufficient permissions') {
  return error(res, message, 403);
}

/**
 * Not found response (404)
 * 
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name
 */
function notFound(res, resource = 'Resource') {
  return error(res, `${resource} not found`, 404);
}

/**
 * Conflict response (409)
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function conflict(res, message = 'Resource conflict') {
  return error(res, message, 409);
}

/**
 * Internal server error response (500)
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} details - Error details
 */
function serverError(res, message = 'Internal server error', details = null) {
  return error(res, message, 500, details);
}

/**
 * Service unavailable response (503)
 * 
 * @param {Object} res - Express response object
 * @param {string} service - Service name
 */
function serviceUnavailable(res, service = 'Service') {
  return error(res, `${service} is currently unavailable`, 503);
}

module.exports = {
  success,
  error,
  paginated,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  serviceUnavailable
};
