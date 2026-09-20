const router  = require('express').Router();
const prisma  = require('../utils/prisma');
const auth    = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { toInt } = require('../utils/normalize');
const { capture } = require('../utils/errorTracker');
const { parsePagination, formatListResponse } = require('../utils/validation');
const rateLimit = require('express-rate-limit');

// Unauthenticated on purpose (login-screen crashes must be reportable), so it
// gets its own tight limit instead of being an open door into error_logs.
const errorIntakeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many error reports.' },
});

/**
 * Browser se aayi error report.
 * Auth zaroori nahi — login screen ya session marne ke baad wale crashes bhi
 * pakadne hain, aur wahi to sabse zyada chhup jate hain.
 */
router.post('/', errorIntakeLimiter, async (req, res) => {
  const { message, stack, url, level, meta } = req.body || {};
  if (!message) return res.status(400).json({ success: false, message: 'message required.' });

  const err = new Error(String(message).slice(0, 2000));
  err.stack = stack ? String(stack).slice(0, 8000) : undefined;

  await capture(err, {
    source: 'frontend',
    level: level === 'warning' ? 'warning' : 'error',
    url: String(url || req.get('referer') || '').slice(0, 500) || undefined,
    userAgent: String(req.get('user-agent') || '').slice(0, 300),
    userId: req.user?.id ?? null,
    meta: meta && typeof meta === 'object' && JSON.stringify(meta).length <= 4000 ? meta : undefined,
  });

  // 202: report le li, client ko iska natija jaanne ki zaroorat nahi.
  res.status(202).json({ success: true });
});

router.get('/', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const where = {};
    if (req.query.source) where.source = String(req.query.source);
    if (req.query.resolved === 'true')  where.resolved = true;
    if (req.query.resolved === 'false') where.resolved = false;

    const [rows, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { lastSeenAt: 'desc' },
        skip, take: Math.min(limit, 100),
      }),
      prisma.errorLog.count({ where }),
    ]);
    res.json(formatListResponse(rows, total, page, rows.length));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [open, last24h, bySource] = await Promise.all([
      prisma.errorLog.count({ where: { resolved: false } }),
      prisma.errorLog.count({ where: { lastSeenAt: { gte: since } } }),
      prisma.errorLog.groupBy({ by: ['source'], _count: { _all: true }, where: { resolved: false } }),
    ]);
    res.json({ success: true, data: { open, last24h, bySource } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/resolve', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const row = await prisma.errorLog.update({
      where: { id: toInt(req.params.id) },
      data: { resolved: req.body?.resolved !== false },
    });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const r = await prisma.errorLog.deleteMany({ where: { resolved: true } });
    res.json({ success: true, message: `${r.count} resolved errors cleared.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
