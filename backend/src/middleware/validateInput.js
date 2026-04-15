/**
 * Global Input Validation Middleware
 * ✅ FIXED: Enforce validation on all user inputs
 * Prevents SQL injection, XSS, and malformed data
 */

const { validationResult, body, query, param } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: errors.array().map(e => ({
        field: e.param || e.path,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  next();
};

/**
 * Sanitize string to prevent XSS
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 500); // Limit length
};

/**
 * Common validators
 */
const validators = {
  // Pagination
  page: query('page')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Page must be between 1 and 100000'),
  
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  // IDs
  intId: (fieldName = 'id') =>
    param(fieldName)
      .isInt({ min: 1 })
      .withMessage(`${fieldName} must be a positive integer`),
  
  intQuery: (fieldName) =>
    query(fieldName)
      .optional()
      .isInt({ min: 1 })
      .withMessage(`${fieldName} must be a positive integer`),

  // Text fields
  stringField: (fieldName, minLen = 1, maxLen = 500) =>
    body(fieldName)
      .optional()
      .trim()
      .isLength({ min: minLen, max: maxLen })
      .withMessage(`${fieldName} must be between ${minLen} and ${maxLen} characters`)
      .customSanitizer(sanitizeString),

  requiredString: (fieldName, minLen = 1, maxLen = 500) =>
    body(fieldName)
      .trim()
      .notEmpty()
      .withMessage(`${fieldName} is required`)
      .isLength({ min: minLen, max: maxLen })
      .withMessage(`${fieldName} must be between ${minLen} and ${maxLen} characters`)
      .customSanitizer(sanitizeString),

  // Email
  email: body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  requiredEmail: body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  // Phone
  phone: body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be 10 digits'),

  // GSTIN (15-character format)
  gstin: body('gstin')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN format'),

  // PAN (10-character format)
  pan: body('pan')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN format'),

  // Numbers
  positiveInt: (fieldName) =>
    body(fieldName)
      .optional()
      .isInt({ min: 0 })
      .withMessage(`${fieldName} must be a non-negative integer`),

  requiredPositiveInt: (fieldName) =>
    body(fieldName)
      .notEmpty()
      .withMessage(`${fieldName} is required`)
      .isInt({ min: 1 })
      .withMessage(`${fieldName} must be a positive integer`),

  decimal: (fieldName, min = 0, max = 999999) =>
    body(fieldName)
      .optional()
      .isDecimal({ decimal_digits: '0,10' })
      .withMessage(`${fieldName} must be a decimal number`)
      .custom(val =>  Number(val) >= min && Number(val) <= max)
      .withMessage(`${fieldName} must be between ${min} and ${max}`),

  // Boolean
  boolean: (fieldName) =>
    body(fieldName)
      .optional()
      .isBoolean()
      .withMessage(`${fieldName} must be true or false`),

  // Date
  date: (fieldName) =>
    body(fieldName)
      .optional()
      .isISO8601()
      .withMessage(`${fieldName} must be a valid ISO8601 date`),

  requiredDate: (fieldName) =>
    body(fieldName)
      .notEmpty()
      .withMessage(`${fieldName} is required`)
      .isISO8601()
      .withMessage(`${fieldName} must be a valid ISO8601 date`),

  // Enum
  enum: (fieldName, allowedValues) =>
    body(fieldName)
      .isIn(allowedValues)
      .withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}`),

  // JSON
  json: (fieldName) =>
    body(fieldName)
      .optional()
      .custom(val => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          throw new Error(`${fieldName} must be valid JSON`);
        }
      }),
};

/**
 * Pagination validation
 */
const validatePagination = [validators.page, validators.limit, handleValidationErrors];

/**
 * Common CRUD validators
 */
const validateIntegerId = (fieldName = 'id') => [
  validators.intId(fieldName),
  handleValidationErrors,
];

module.exports = {
  validators,
  validatePagination,
  validateIntegerId,
  handleValidationErrors,
  sanitizeString,
};
