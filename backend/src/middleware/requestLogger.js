/**
 * Request/Response Logging Middleware
 * Logs all API requests and responses for debugging and monitoring
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Rotating log file name (date-based)
const getLogFileName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return path.join(logsDir, `erp-${year}-${month}-${day}.log`);
};

// Write to log file
const writeLog = (data) => {
  try {
    const logFile = getLogFileName();
    const logLine = JSON.stringify(data) + '\n';
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write log:', err);
  }
};

// Sanitize sensitive data from objects
const sanitize = (obj, sensitiveFields = ['password', 'token', 'refreshToken', 'gstin', 'pan', 'bankAccount', 'accountNo', 'email', 'otp', 'phone', 'mobileNo', 'ifscCode', 'confirmPassword', 'newPassword']) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, sensitiveFields));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // ✅ FIXED: Enhanced redaction for nested objects and case-insensitive matching
    const keyLower = key.toLowerCase();
    if (sensitiveFields.some(field => keyLower.includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture response
  const originalJson = res.json;
  let responseBody = null;
  let responseStatus = res.statusCode;

  res.json = function(data) {
    responseBody = data;
    responseStatus = res.statusCode;
    return originalJson.call(this, data);
  };

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Skip logging for health check and static files
    if (req.path === '/api/health' || req.path.startsWith('/uploads')) {
      return;
    }

    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: responseStatus,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
    };

    // ✅ FIXED: Always sanitize request body for auth and sensitive routes
    const shouldLogBody =
      ['POST', 'PATCH', 'PUT'].includes(req.method);

    if (shouldLogBody) {
      logData.request = {
        body: sanitize(req.body),
      };
    }

    // Add response body for errors only (sanitized)
    if (responseStatus >= 400 && responseBody) {
      logData.response = {
        code: responseBody.code,
        message: responseBody.message,
      };
    }

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const statusColor = responseStatus >= 400 ? '❌' : '✅';
      console.log(
        `${statusColor} ${req.method.padEnd(6)} ${req.path.padEnd(40)} ${String(responseStatus).padEnd(3)} ${duration}ms`
      );
    }

    // Log to file (only log errors and sensitive operations)
    if (responseStatus >= 400 || req.method !== 'GET') {
      writeLog(logData);
    }
  });

  next();
};

module.exports = { requestLogger, writeLog, sanitize, getLogFileName };
