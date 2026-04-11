const prisma = require('../utils/prisma');
const { toInt } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');

const SENSITIVE_KEYS = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'confirmpassword',
  'otp',
  'token',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'api_key',
]);

function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(String(k).toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactSensitive(v);
    }
  }
  return out;
}

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
      const recordId = pathParts[3] ? toInt(pathParts[3], null) : null;

      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              userId: user?.id || null,
              action,
              tableName,
              recordId: isNaN(recordId) ? null : recordId,
              newValues: body ? JSON.stringify(redactSensitive(body)) : null,
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
    const { userId = '', tableName = '', action = '' } = req.query;
    const { page, limit, skip } = parsePagination(req);

    const where = {};
    if (userId) where.userId = toInt(userId);
    if (tableName) where.tableName = tableName;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json(formatListResponse(logs, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Failed to fetch audit logs.'));
  }
};

// ── Get User Activity ──────────────────────────────────────────
exports.getUserActivity = async (req, res) => {
  try {
    const userId = toInt(req.params.userId);
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - toInt(days, 30));

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
    if (resourceId) where.recordId = toInt(resourceId);

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

    const [todayCount, monthCount, topUsers, topResources, actionBreakdown, last7DaysLogs] = await Promise.all([
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
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        where: { createdAt: { gte: thisMonth } },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true },
      }),
    ]);

    const userIds = topUsers
      .map((u) => u.userId)
      .filter((id) => Number.isInteger(id));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const dailyMap = new Map();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, count: 0 });
    }
    for (const row of last7DaysLogs) {
      const key = new Date(row.createdAt).toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.get(key).count += 1;
      }
    }

    res.json({
      success: true,
      data: {
        todayActions: todayCount,
        monthActions: monthCount,
        topUsers: topUsers.map((u) => ({
          userId: u.userId,
          userName: userMap.get(u.userId)?.name || (u.userId ? `User #${u.userId}` : 'System'),
          userEmail: userMap.get(u.userId)?.email || null,
          count: u._count.id,
        })),
        topResources: topResources.map((r) => ({
          tableName: r.tableName || 'unknown',
          resource: r.tableName || 'unknown',
          count: r._count.id,
        })),
        actionBreakdown: actionBreakdown.map((a) => ({ action: a.action, count: a._count.id })),
        last7Days: Array.from(dailyMap.values()),
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
    startDate.setDate(startDate.getDate() - toInt(days, 30));

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
