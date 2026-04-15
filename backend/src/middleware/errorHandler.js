/**
 * Centralized Error Handler Middleware
 * Converts all errors to standardized API responses with error codes
 */

const ERROR_CODES = {
  // Client errors (4xx)
  INVALID_INPUT: { code: 'INVALID_INPUT', status: 400 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 422 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  CONFLICT: { code: 'CONFLICT', status: 409 },
  DUPLICATE: { code: 'DUPLICATE', status: 409 },
  DUPLICATE_GSTIN: { code: 'ERR_DUPLICATE_GSTIN', status: 409 },
  DUPLICATE_PAN: { code: 'ERR_DUPLICATE_PAN', status: 409 },
  DUPLICATE_EMAIL: { code: 'ERR_DUPLICATE_EMAIL', status: 409 },
  DUPLICATE_INVOICE: { code: 'ERR_DUPLICATE_INVOICE', status: 409 },
  RATING_LIMITED: { code: 'RATE_LIMIT_EXCEEDED', status: 429 },
  
  // Server errors (5xx)
  DATABASE_ERROR: { code: 'SERVER_ERROR', status: 500 },
  INTERNAL_ERROR: { code: 'SERVER_ERROR', status: 500 },
  EXTERNAL_API_ERROR: { code: 'EXTERNAL_API_ERROR', status: 502 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503 },
};

/**
 * Map Prisma error codes to application error codes
 */
const mapPrismaError = (prismaErr) => {
  if (prismaErr.code === 'P2002') {
    // Unique constraint violation
    const field = prismaErr.meta?.target?.[0];
    if (field === 'gstin') return { ...ERROR_CODES.DUPLICATE_GSTIN, field };
    if (field === 'pan') return { ...ERROR_CODES.DUPLICATE_PAN, field };
    if (field === 'email') return { ...ERROR_CODES.DUPLICATE_EMAIL, field };
    if (field === 'invoiceNumber') return { ...ERROR_CODES.DUPLICATE_INVOICE, field };
    return { ...ERROR_CODES.DUPLICATE, field };
  }
  if (prismaErr.code === 'P2025') {
    // Record not found
    return ERROR_CODES.NOT_FOUND;
  }
  if (prismaErr.code === 'P2003') {
    // Foreign key constraint violation
    return { ...ERROR_CODES.CONFLICT, message: 'Referenced record does not exist' };
  }
  // Generic database error
  return ERROR_CODES.DATABASE_ERROR;
};

/**
 * Central error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Ensure err is an Error object
  if (typeof err === 'string') {
    err = new Error(err);
  }

  // Determine error details
  let status = err.statusCode || err.status || 500;
  let code = err.code || 'ERR_INTERNAL';
  let message = err.message || 'Internal Server Error';
  let field = err.field || null;

  // Map Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const mapped = mapPrismaError(err);
    status = mapped.status;
    code = mapped.code;
    field = mapped.field;
    message = mapped.message || message;
  }

  // Map Joi validation errors
  if (err.isJoi) {
    status = 422;
    code = 'ERR_VALIDATION';
    const details = err.details?.map(d => ({
      field: d.path.join('.'),
      message: d.message.replace(/"/g, "'"),
    })) || [];
    return res.status(status).json({
      success: false,
      code,
      message: 'Validation failed',
      details,
    });
  }

  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error:', {
      code,
      status,
      message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }

  // Build response
  const response = {
    success: false,
    code,
    message,
  };

  // Include field for validation errors
  if (field) {
    response.field = field;
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack.split('\n');
  }

  res.status(status).json(response);
};

module.exports = { errorHandler, ERROR_CODES, mapPrismaError };
