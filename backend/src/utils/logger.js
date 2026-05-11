/**
 * Centralized Logging Utility
 * 
 * Provides structured logging with different levels and formats.
 * Replaces console.log calls with proper logging infrastructure.
 * 
 * PRODUCTION READY: Logs are formatted for easy parsing by log aggregation tools.
 */

const fs = require('fs');
const path = require('path');

// Log levels
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Log level priorities (lower number = higher priority)
const LogPriority = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level from environment
const currentLogLevel = process.env.LOG_LEVEL || 'INFO';
const currentPriority = LogPriority[currentLogLevel] || LogPriority.INFO;

// Log file paths
const logsDir = path.join(__dirname, '../../logs');
const errorLogPath = path.join(logsDir, 'error.log');
const combinedLogPath = path.join(logsDir, 'combined.log');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Format log entry
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log entry
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };

  return JSON.stringify(logEntry);
}

/**
 * Write log to file
 * 
 * @param {string} filePath - Log file path
 * @param {string} content - Log content
 */
function writeToFile(filePath, content) {
  try {
    fs.appendFileSync(filePath, content + '\n', 'utf8');
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
}

/**
 * Log a message
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
function log(level, message, meta = {}) {
  // Check if this log level should be output
  if (LogPriority[level] > currentPriority) {
    return;
  }

  const formattedLog = formatLog(level, message, meta);

  // Console output with colors
  const colors = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[90m'  // Gray
  };
  const reset = '\x1b[0m';

  console.log(`${colors[level]}[${level}]${reset} ${message}`, meta);

  // Write to combined log
  writeToFile(combinedLogPath, formattedLog);

  // Write errors to separate file
  if (level === LogLevel.ERROR) {
    writeToFile(errorLogPath, formattedLog);
  }
}

/**
 * Log error
 * 
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata
 */
function error(message, meta = {}) {
  log(LogLevel.ERROR, message, meta);
}

/**
 * Log warning
 * 
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
function warn(message, meta = {}) {
  log(LogLevel.WARN, message, meta);
}

/**
 * Log info
 * 
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
function info(message, meta = {}) {
  log(LogLevel.INFO, message, meta);
}

/**
 * Log debug
 * 
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
function debug(message, meta = {}) {
  log(LogLevel.DEBUG, message, meta);
}

/**
 * Log HTTP request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
function logRequest(req, res, duration) {
  const meta = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  const level = res.statusCode >= 500 ? LogLevel.ERROR :
                res.statusCode >= 400 ? LogLevel.WARN :
                LogLevel.INFO;

  log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
}

/**
 * Request logging middleware
 * 
 * @returns {Function} Express middleware
 * 
 * @example
 * app.use(logger.requestLogger());
 */
function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - start;
      logRequest(req, res, duration);
    });

    next();
  };
}

/**
 * Create a child logger with additional context
 * 
 * @param {Object} context - Additional context to include in all logs
 * @returns {Object} Child logger
 * 
 * @example
 * const userLogger = logger.child({ userId: '123' });
 * userLogger.info('User action', { action: 'login' });
 */
function child(context) {
  return {
    error: (message, meta = {}) => error(message, { ...context, ...meta }),
    warn: (message, meta = {}) => warn(message, { ...context, ...meta }),
    info: (message, meta = {}) => info(message, { ...context, ...meta }),
    debug: (message, meta = {}) => debug(message, { ...context, ...meta })
  };
}

module.exports = {
  LogLevel,
  error,
  warn,
  info,
  debug,
  logRequest,
  requestLogger,
  child
};
