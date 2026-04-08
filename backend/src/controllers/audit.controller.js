const prisma = require('../utils/prisma');

// ── Audit Logging Middleware ──────────────────────────────────
const auditLog = async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const user = req.user;
      const { method, originalUrl, body } = req;

      const pathParts = originalUrl.split('/').filter(Boolean);
      const tableName = pathParts[2] || 'unknown';
      const action = method === 'POST' ? 'CREATE' : method === 'PUT' ? 'UPDATE' : method === 'DELETE' ? 'DELETE' : 'MODIFY';
      const recordId = pathParts[3] ? parseInt(pathParts[3]) : null;

      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              userId: user?.id || null,
              action,
              tableName,
              recordId: isNaN(recordId) ? null : recordId,
              newValues: body ? JSON.stringify(body) : null,
              ipAddress: req.ip || req.connection?.remoteAddress,
            },
          });
        } catch (err) {
          console.error('Audit log error:', err.message);
        }
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

// ── List Audit Logs ───────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { userId = '', tableName = '', action = '', page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (userId) where.userId = parseInt(userId);
    if (tableName) where.tableName = tableName;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
};

// ── Get User Activity ──────────────────────────────────────────
exports.getUserActivity = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const summary = {
      totalActions: logs.length,
      creates: logs.filter(l => l.action === 'CREATE').length,
      updates: logs.filter(l => l.action === 'UPDATE').length,
      deletes: logs.filter(l => l.action === 'DELETE').length,
      tables: Array.from(new Set(logs.map(l => l.tableName).filter(Boolean))),
    };

    res.json({ success: true, data: { logs, summary } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch user activity.' });
  }
};

// ── Get Resource History ──────────────────────────────────────
exports.getResourceHistory = async (req, res) => {
  try {
    const { resource, resourceId } = req.params;

    const where = { tableName: resource };
    if (resourceId) where.recordId = parseInt(resourceId);

    const history = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch resource history.' });
  }
};

// ── Get Dashboard Stats ───────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayCount, monthCount, topUsers, topResources] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.auditLog.groupBy({
        by: ['tableName'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    res.json({
      success: true,
      data: {
        todayActions: todayCount,
        monthActions: monthCount,
        topUsers: topUsers.map(u => ({ userId: u.userId, count: u._count.id })),
        topResources: topResources.map(r => ({ tableName: r.tableName, count: r._count.id })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.' });
  }
};

// ── Export Audit Logs ──────────────────────────────────────────
exports.export = async (req, res) => {
  try {
    const { format = 'json', days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const logs = await prisma.auditLog.findMany({
      where: { createdAt: { gte: startDate } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const csv = [
        ['Date', 'User ID', 'User', 'Action', 'Table', 'Record ID', 'IP Address'].join(','),
        ...logs.map(l => [
          new Date(l.createdAt).toISOString(),
          l.userId || '',
          l.user?.name || '',
          l.action,
          l.tableName || '',
          l.recordId || '',
          l.ipAddress || '',
        ].join(',')),
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send(csv);
    } else {
      res.json({ success: true, data: logs });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to export audit logs.' });
  }
};

exports.auditLog = auditLog;
