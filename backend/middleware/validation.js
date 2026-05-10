/**
 * Input Validation Middleware
 * 
 * Validates and sanitizes incoming request data to prevent injection attacks
 * and ensure data integrity.
 */

/**
 * Validates UID format (alphanumeric, dashes, underscores, 1-128 chars)
 */
function validateUid(uid) {
  if (!uid || typeof uid !== 'string') return false;
  if (uid.length < 1 || uid.length > 128) return false;
  return /^[a-zA-Z0-9_-]+$/.test(uid);
}

/**
 * Validates email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number (E.164 format: +[country code][number])
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Validates latitude (-90 to 90)
 */
function validateLatitude(lat) {
  const num = parseFloat(lat);
  return !isNaN(num) && num >= -90 && num <= 90;
}

/**
 * Validates longitude (-180 to 180)
 */
function validateLongitude(lng) {
  const num = parseFloat(lng);
  return !isNaN(num) && num >= -180 && num <= 180;
}

/**
 * Validates risk score (0-100)
 */
function validateRiskScore(score) {
  const num = parseFloat(score);
  return !isNaN(num) && num >= 0 && num <= 100;
}

/**
 * Sanitizes string input (removes control characters, limits length)
 */
function sanitizeString(str, maxLength = 1000) {
  if (!str || typeof str !== 'string') return '';
  // Remove control characters except newline and tab
  const sanitized = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  return sanitized.slice(0, maxLength).trim();
}

/**
 * Middleware: Validate UID in request body or params
 */
function requireValidUid(req, res, next) {
  const uid = req.body.uid || req.params.uid;
  if (!validateUid(uid)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid UID format',
    });
  }
  next();
}

/**
 * Middleware: Validate location data
 */
function requireValidLocation(req, res, next) {
  const { latitude, longitude } = req.body;
  
  if (latitude !== undefined && !validateLatitude(latitude)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid latitude (must be between -90 and 90)',
    });
  }
  
  if (longitude !== undefined && !validateLongitude(longitude)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid longitude (must be between -180 and 180)',
    });
  }
  
  next();
}

/**
 * Middleware: Validate contact data
 */
function requireValidContact(req, res, next) {
  const { name, phone, type } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Contact name is required',
    });
  }
  
  if (!phone || !validatePhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number (must be in E.164 format: +[country code][number])',
    });
  }
  
  const validTypes = ['family', 'trusted', 'volunteer', 'ngo', 'police', 'emergency'];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid contact type (must be one of: ${validTypes.join(', ')})`,
    });
  }
  
  // Sanitize name
  req.body.name = sanitizeString(name, 100);
  
  next();
}

/**
 * Middleware: Validate risk update data
 */
function requireValidRiskUpdate(req, res, next) {
  const { value, reason, source } = req.body;
  
  if (value === undefined || !validateRiskScore(value)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid risk value (must be between 0 and 100)',
    });
  }
  
  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Risk reason is required',
    });
  }
  
  const validSources = ['shake', 'sound', 'voice', 'manual', 'ai_sensor', 'system'];
  if (source && !validSources.includes(source)) {
    return res.status(400).json({
      success: false,
      message: `Invalid source (must be one of: ${validSources.join(', ')})`,
    });
  }
  
  // Sanitize reason
  req.body.reason = sanitizeString(reason, 500);
  
  next();
}

module.exports = {
  validateUid,
  validateEmail,
  validatePhone,
  validateLatitude,
  validateLongitude,
  validateRiskScore,
  sanitizeString,
  requireValidUid,
  requireValidLocation,
  requireValidContact,
  requireValidRiskUpdate,
};
