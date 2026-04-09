const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
require('dotenv').config();

const prisma = require('./utils/prisma');
const { auditLog } = require('./controllers/audit.controller');
const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Audit logging middleware (global for all routes)
app.use(auditLog);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/parties',   require('./routes/party.routes'));
app.use('/api/items',     require('./routes/items.routes'));
app.use('/api/machines',  require('./routes/machines.routes'));
app.use('/api/pricing',   require('./routes/pricing.routes'));
app.use('/api/processes', require('./routes/process.routes'));
app.use('/api/jobcards',  require('./routes/jobcard.routes'));
app.use('/api/jobwork',   require('./routes/jobwork.routes'));
app.use('/api/quality',   require('./routes/quality.routes'));
app.use('/api/invoices',  require('./routes/invoice.routes'));
app.use('/api/dispatch-challans', require('./routes/dispatch.routes'));
app.use('/api/purchase',   require('./routes/purchase.routes'));
app.use('/api/manufacturing', require('./routes/manufacturing.routes'));
app.use('/api/furnace-planning', require('./routes/furnacePlanning.routes'));
app.use('/api/analytics',  require('./routes/analytics.routes'));
app.use('/api/audit',      require('./routes/audit.routes'));
app.use('/api/upload',     require('./routes/upload.routes'));
app.use('/api/workflows',  require('./routes/workflow.routes'));
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', require('./routes/dev.routes'));
  app.use('/api/demo', require('./routes/demo.routes'));  // Demo data/images only in non-production
}

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const ts = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'up', timestamp: ts });
  } catch (e) {
    res.status(503).json({ status: 'degraded', db: 'down', timestamp: ts });
  }
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');
  res.status(status).json({ success: false, message });
});

module.exports = app;

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Sheetal Dies ERP Backend running on port ${PORT}`));
