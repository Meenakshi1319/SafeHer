/**
 * Validation Utilities
 * 
 * Provides reusable validation functions for request data.
 * Helps maintain consistent validation across controllers.
 */

const { ValidationError } = require('./errors');

/**
 * Validate required fields in request body
 * 
 * @param {Object} body - Request body
 * @param {Array<string>} fields - Required field names
 * @throws {ValidationError} If any required field is missing
 * 
 * @example
 * validateRequired(req.body, ['uid', 'latitude', 'longitude']);
 */
function validateRequired(body, fields) {
  const missing = [];
  
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missing }
    );
  }
}

/**
 * Validate email format
 * 
 * @param {string} email - Email address
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (E.164)
 * 
 * @param {string} phone - Phone number
 * @returns {boolean} Whether phone number is valid
 */
function isValidPhone(phone) {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate UID format (Firebase UID)
 * 
 * @param {string} uid - User ID
 * @returns {boolean} Whether UID is valid
 */
function isValidUID(uid) {
  return typeof uid === 'string' && uid.length >= 20 && uid.length <= 128;
}

/**
 * Validate coordinates
 * 
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} Whether coordinates are valid
 */
function isValidCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  return !isNaN(lat) && !isNaN(lng) &&
         lat >= -90 && lat <= 90 &&
         lng >= -180 && lng <= 180;
}

/**
 * Validate file hash (SHA-256)
 * 
 * @param {string} hash - File hash
 * @returns {boolean} Whether hash is valid
 */
function isValidHash(hash) {
  const hashRegex = /^[a-f0-9]{64}$/i;
  return hashRegex.test(hash);
}

/**
 * Validate enum value
 * 
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Allowed values
 * @returns {boolean} Whether value is in allowed list
 */
function isValidEnum(value, allowedValues) {
  return allowedValues.includes(value);
}

/**
 * Sanitize string input
 * Removes potentially dangerous characters
 * 
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Validate and sanitize location data
 * 
 * @param {Object} location - Location object
 * @returns {Object} Validated location
 * @throws {ValidationError} If location is invalid
 */
function validateLocation(location) {
  if (!location || typeof location !== 'object') {
    throw new ValidationError('Invalid location object');
  }

  const { latitude, longitude } = location;

  if (!isValidCoordinates(latitude, longitude)) {
    throw new ValidationError('Invalid coordinates', {
      latitude,
      longitude
    });
  }

  return {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude)
  };
}

/**
 * Validate pagination parameters
 * 
 * @param {Object} query - Query parameters
 * @returns {Object} Validated pagination params
 */
function validatePagination(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  // Enforce reasonable limits
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const validatedPage = Math.max(page, 1);

  return {
    page: validatedPage,
    limit: validatedLimit,
    skip: (validatedPage - 1) * validatedLimit
  };
}

/**
 * Validate date range
 * 
 * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
 * @returns {Object} Validated date range
 * @throws {ValidationError} If dates are invalid
 */
function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    throw new ValidationError('Invalid start date');
  }

  if (isNaN(end.getTime())) {
    throw new ValidationError('Invalid end date');
  }

  if (start > end) {
    throw new ValidationError('Start date must be before end date');
  }

  return { start, end };
}

/**
 * Validation middleware factory
 * Creates Express middleware for request validation
 * 
 * @param {Function} validator - Validation function
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/location', validate((req) => {
 *   validateRequired(req.body, ['uid', 'latitude', 'longitude']);
 *   validateLocation(req.body);
 * }), handler);
 */
function validate(validator) {
  return (req, res, next) => {
    try {
      validator(req);
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          details: error.details
        });
      }
      next(error);
    }
  };
}

module.exports = {
  validateRequired,
  isValidEmail,
  isValidPhone,
  isValidUID,
  isValidCoordinates,
  isValidHash,
  isValidEnum,
  sanitizeString,
  validateLocation,
  validatePagination,
  validateDateRange,
  validate
};
