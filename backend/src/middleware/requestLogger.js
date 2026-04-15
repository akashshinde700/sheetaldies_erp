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

// ✅ FIXED: More comprehensive sensitive field detection
const SENSITIVE_PATTERNS = [
  // Auth
  'password', 'pwd', 'pass', 'newpassword', 'oldpassword', 'confirmpassword',
  'refreshtoken', 'accesstoken', 'token', 'jwt', 'secret', 'apikey',
  // OTP & verification
  'otp', 'otptoken', 'verificationcode', 'verificationtoken', 'mfa', 'totp',
  // PII
  'ssn', 'pan', 'gstin', 'aadhaar', 'aadhaarno', 'uin',
  // Banking
  'accountno', 'accountnumber', 'bankaccount', 'accountnumber', 
  'ifsccode', 'ifsc', 'routingno', 'swiftcode', 'swift',
  'cardno', 'cardnumber', 'cvv', 'cvc', 'expirydate',
  // Contact
  'phone', 'phoneno', 'mobileno', 'cellphone', 'telephone',
  'email', 'emailaddress', 'contact',
  // Personal
  'firstname', 'lastname', 'fullname', 'dob', 'dateofbirth',
  'address', 'street', 'city', 'state', 'zipcode', 'postalcode',
  // Social
  'ssn', 'licensekey', 'licensenumber', 'passport', 'passportno'
];

const sanitize = (obj, level = 0) => {
  if (level > 10) return obj; // Prevent infinite recursion
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item, i) => i < 100 ? sanitize(item, level + 1) : '...(truncated)');
  }

  const sanitized = {};
  const keys = Object.keys(obj);
  
  for (const key of keys) {
    const value = obj[key];
    const keyLower = key.toLowerCase().replace(/[_\-]/g, '');
    
    // Check if key matches any sensitive pattern
    const isSensitive = SENSITIVE_PATTERNS.some(pattern => 
      keyLower.includes(pattern.replace(/[_\-]/g, ''))
    );

    if (isSensitive && value) {
      // Redact sensitive values but show first 2 and last 2 chars if long
      if (typeof value === 'string' && value.length > 8) {
        sanitized[key] = value.substring(0, 2) + '***' + value.substring(value.length - 2);
      } else {
        sanitized[key] = '***REDACTED***';
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value, level + 1);
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
