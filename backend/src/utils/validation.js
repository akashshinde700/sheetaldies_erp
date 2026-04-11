/**
 * Common Pagination & Validation Utilities
 * Provides consistent pagination handling across all endpoints
 */

const { toInt } = require('./normalize');

/**
 * Parse and validate pagination parameters
 * CRITICAL FIX: Prevent OOM attacks with unreasonable pagination sizes
 */
const parsePagination = (req) => {
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;
  const MIN_LIMIT = 1;

  let page = parseInt(req.query.page) || DEFAULT_PAGE;
  let limit = parseInt(req.query.limit) || DEFAULT_LIMIT;

  // Validate and clamp values
  page = Math.max(1, page);
  limit = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, limit));

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Calculate pagination metadata
 */
const getPaginationMeta = (total, page, limit) => {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Format successful list response with pagination
 */
const formatListResponse = (data, total, page, limit) => {
  return {
    success: true,
    data,
    pagination: getPaginationMeta(total, page, limit),
  };
};

/**
 * Standard error codes used across all endpoints
 */
const ERROR_CODES = {
  // 400 Bad Request
  'ERR_VALIDATION': 400,
  'ERR_INVALID_INPUT': 400,
  'ERR_INVALID_FILE_TYPE': 400,
  'ERR_FILE_TOO_LARGE': 413,
  'ERR_TOO_MANY_FILES': 400,
  'ERR_FILE_UPLOAD': 400,

  // 401 Unauthorized
  'ERR_UNAUTHORIZED': 401,

  // 403 Forbidden
  'ERR_FORBIDDEN': 403,

  // 404 Not Found
  'ERR_NOT_FOUND': 404,

  // 409 Conflict
  'ERR_DUPLICATE_GSTIN': 409,
  'ERR_DUPLICATE_PAN': 409,
  'ERR_DUPLICATE_CODE': 409,
  'ERR_CONFLICT': 409,
  'ERR_DUPLICATE_ENTRY': 409,

  // 500 Server Error
  'ERR_INTERNAL': 500,
  'ERR_TRANSACTION_FAILED': 500,
  'ERR_DATABASE_ERROR': 500,
};

/**
 * Get HTTP status code for error code
 */
const getStatusCode = (errorCode) => {
  return ERROR_CODES[errorCode] || 500;
};

/**
 * Standard error response format
 */
const formatErrorResponse = (code, message, errors = null) => {
  const response = {
    success: false,
    code,
    message,
  };

  if (errors && Array.isArray(errors)) {
    response.errors = errors;
  }

  return response;
};

/**
 * Validation helpers for common fields
 */
const validators = {
  /**
   * Validate GSTIN (15-character alphanumeric)
   */
  validateGSTIN: (gstin) => {
    if (!gstin) return null;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin) ? null : 'Invalid GSTIN format';
  },

  /**
   * Validate PAN (10-character format)
   */
  validatePAN: (pan) => {
    if (!pan) return null;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan) ? null : 'Invalid PAN format';
  },

  /**
   * Validate email
   */
  validateEmail: (email) => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Invalid email format';
  },

  /**
   * Validate phone number (10 digits for India)
   */
  validatePhone: (phone) => {
    if (!phone) return null;
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, '')) ? null : 'Invalid phone number (must be 10 digits)';
  },

  /**
   * Validate number range
   */
  validateNumberRange: (value, min, max, fieldName = 'Value') => {
    const num = toInt(value, null);
    if (num === null) return `${fieldName} must be a number`;
    if (num < min) return `${fieldName} must be at least ${min}`;
    if (num > max) return `${fieldName} must be at most ${max}`;
    return null;
  },

  /**
   * Validate required string field
   */
  validateRequired: (value, fieldName = 'Field') => {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  /**
   * Validate max length
   */
  validateMaxLength: (value, maxLen, fieldName = 'Field') => {
    if (value && String(value).length > maxLen) {
      return `${fieldName} must be at most ${maxLen} characters`;
    }
    return null;
  },
};

module.exports = {
  parsePagination,
  getPaginationMeta,
  formatListResponse,
  ERROR_CODES,
  getStatusCode,
  formatErrorResponse,
  validators,
};
