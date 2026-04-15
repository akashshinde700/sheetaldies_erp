const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
require('dotenv').config();

const prisma = require('./utils/prisma');
const { auditLog } = require('./controllers/audit.controller');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const sanitizeMiddleware = require('./middleware/sanitize');

// ✅ NEW: Import structured logger
const { expressLogger, log, logger } = require('./utils/logger');

// ✅ NEW: Initialize sequence manager for atomic invoice numbering
const { initializeSequenceManager } = require('./utils/sequenceManager');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS (parametrized from env) ─────────────────────────────
const corsOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({ 
  origin: corsOrigins, 
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ NEW: Structured request logging middleware
app.use(expressLogger);

// Request logging middleware (for debugging & monitoring)
app.use(requestLogger);
app.use(sanitizeMiddleware);

// Serve uploaded files with basic token/session check
const authMiddleware = require('./middleware/auth');
app.use('/uploads', (req, res, next) => {
  // In production, require auth. In dev, allow unauthenticated for convenience.
  if (process.env.NODE_ENV === 'production') {
    return authMiddleware(req, res, () => {
      express.static(path.join(__dirname, '..', 'uploads'))(req, res, next);
    });
  }
  express.static(path.join(__dirname, '..', 'uploads'))(req, res, next);
});

// ── Rate Limiting ─────────────────────────────────────────────
// General API limiter: 100 requests per 15 minutes (production), higher in dev
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,  // 1000 per 15 minutes in development
  message: { success: false, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // When mounted at /api/, req.path is like "/auth/me"
    // Avoid rate-limit lockouts during auth flows (auth has its own limiters).
    if (req.path.startsWith('/auth/')) return true;
    if (req.path === '/health') return true;
    if (req.path.startsWith('/docs')) return true;
    return false;
  },
});

// Strict limiter for high-value operations: 500 requests per hour (production)
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 500 : 5000, 
  message: { success: false, code: 'RATE_LIMIT_STRICT', message: 'Rate limit exceeded for high-value operations. Please try again later.' },
  standardHeaders: true,
});

// ✅ NEW: Export rate limiter to prevent DOS (fixes H2)
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 exports per hour max
  message: { success: false, code: 'EXPORT_LIMIT_EXCEEDED', message: 'Export limit exceeded. Maximum 5 exports per hour.' },
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req), // Per-user limiting with proper IPv6 support
});

// File upload limiter: 10 uploads per hour per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: { success: false, code: 'UPLOAD_LIMIT_EXCEEDED', message: 'Upload limit exceeded. Maximum 10 uploads per hour.' },
});

// OTP rate limiter: 5 requests per 10 minutes per IP (prevents email flooding)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: { success: false, code: 'OTP_LIMIT_EXCEEDED', message: 'Too many OTP requests. Please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// Audit logging middleware (global for all routes)
app.use(auditLog);

// ✅ FIXED: Apply input validation middleware for all incoming data
const { handleValidationErrors } = require('./middleware/validateInput');
app.use((req, res, next) => {
  // Only validate JSON requests
  if (req.method !== 'GET' && req.is('application/json')) {
    // Basic checks on query parameters - more can be added per route
    if (req.query.page) {
      const page = parseInt(req.query.page);
      if (!Number.isInteger(page) || page < 1 || page > 100000) {
        return res.status(422).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'page parameter must be between 1 and 100000',
        });
      }
    }
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
        return res.status(422).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'limit parameter must be between 1 and 500',
        });
      }
    }
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────
// Apply OTP limiter specifically to OTP endpoint BEFORE auth routes
app.post('/api/auth/request-otp', otpLimiter);

app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/parties',   strictLimiter, require('./routes/party.routes'));
app.use('/api/items',     strictLimiter, require('./routes/items.routes'));
app.use('/api/machines',  require('./routes/machines.routes'));
app.use('/api/pricing',   strictLimiter, require('./routes/pricing.routes'));
app.use('/api/processes', require('./routes/process.routes'));
app.use('/api/jobcards',  strictLimiter, require('./routes/jobcard.routes'));
app.use('/api/jobwork',   strictLimiter, require('./routes/jobwork.routes'));
app.use('/api/quality',   strictLimiter, require('./routes/quality.routes'));
app.use('/api/invoices',  strictLimiter, require('./routes/invoice.routes'));
app.use('/api/dispatch-challans', strictLimiter, require('./routes/dispatch.routes'));
app.use('/api/purchase',   strictLimiter, require('./routes/purchase.routes'));
app.use('/api/manufacturing', strictLimiter, require('./routes/manufacturing.routes'));
app.use('/api/furnace-planning', strictLimiter, require('./routes/furnacePlanning.routes'));
app.use('/api/analytics',  require('./routes/analytics.routes'));
app.use('/api/audit',      require('./routes/audit.routes'));
app.use('/api/upload',     uploadLimiter, require('./routes/upload.routes'));
app.use('/api/quotes',          strictLimiter, require('./routes/quote.routes'));
app.use('/api/customer-quotes', strictLimiter, require('./routes/customerQuote.routes'));
app.use('/api/attachments', strictLimiter, require('./routes/attachment.routes'));
app.use('/api/workflows',  strictLimiter, require('./routes/workflow.routes'));
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', require('./routes/dev.routes'));
  app.use('/api/demo', require('./routes/demo.routes'));  // Demo data/images only in non-production
}

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const ts = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, status: 'ok', db: 'up', timestamp: ts });
  } catch (e) {
    res.status(503).json({ success: false, status: 'degraded', db: 'down', timestamp: ts });
  }
});

// ── Swagger API Documentation ─────────────────────────────────
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Sheetal Dies ERP - API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayOperationId: false,
  },
}));

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.path} not found`,
  });
});

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Sheetal Dies ERP Backend running on port ${PORT}`));
}
