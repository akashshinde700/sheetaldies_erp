/**
 * Winston Logger Configuration
 * Provides structured logging for production environments
 * 
 * Features:
 * - Console + File logging
 * - Log levels (error, warn, info, debug)
 * - Request/Response logging
 * - Performance metrics
 * - Automatic log rotation
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format for production logs
 * Includes timestamp, level, message, metadata
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    });
  })
);

/**
 * Custom format for development (human-readable)
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}] ${message} ${metaStr}`;
  })
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'sheetal-dies-erp' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: developmentFormat
    }),

    // Error log file (errors only)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Combined log file (all levels)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),

    // Detailed debug log (development only)
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        format: productionFormat
      })
    ] : [])
  ]
});

/**
 * HTTP Request/Response Logger Middleware
 * Logs all HTTP requests with sanitized sensitive data
 */
const expressLogger = (req, res, next) => {
  const start = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;

    // Sanitize request body (remove passwords, tokens, etc.)
    const sanitizedBody = sanitizeObject(req.body);

    // Log request
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.get('user-agent')?.slice(0, 100)
    });

    // Log errors with more detail
    if (res.statusCode >= 400) {
      logger.warn('HTTP Error Response', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        body: sizeof(data) < 1000 ? data : '(large payload)',
        error: res.error
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Sanitize object by removing sensitive fields
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitive = [
    'password', 'Password', 'pwd', 'token', 'Token', 'auth',
    'authorization', 'Authorization', 'otp', 'OTP', 'phone',
    'email', 'gstin', 'pan', 'accountNo', 'accountNumber',
    'creditCard', 'cvv', 'ssn'
  ];

  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitive.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    }
  }

  return sanitized;
};

/**
 * Logger functions with context
 */
const log = {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),

  // Specific log functions
  request: (method, path, statusCode, duration, meta = {}) => {
    logger.info('API Request', { method, path, statusCode, duration, ...meta });
  },

  security: (event, meta = {}) => {
    logger.warn(`[SECURITY] ${event}`, meta);
  },

  database: (operation, table, duration, meta = {}) => {
    logger.debug(`[DB] ${operation} on ${table} (${duration}ms)`, meta);
  },

  business: (event, meta = {}) => {
    logger.info(`[BUSINESS] ${event}`, meta);
  },

  financial: (event, meta = {}) => {
    logger.info(`[FINANCIAL] ${event}`, { ...meta, timestamp: new Date().toISOString() });
  }
};

/**
 * Get approximate size of object
 */
const sizeof = (obj) => {
  return JSON.stringify(obj).length;
};

module.exports = {
  logger,
  expressLogger,
  log,
  sanitizeObject
};
