const prisma = require('../utils/prisma');
const { toNum } = require('../utils/normalize');

// ── Overview KPIs ─────────────────────────────────────────────
exports.overview = async (req, res) => {
  try {
    const now   = new Date();
    const y     = now.getFullYear();
    const m     = now.getMonth();
    const monthStart = new Date(y, m, 1);
    const prevStart  = new Date(y, m - 1, 1);
    const prevEnd    = new Date(y, m, 0, 23, 59, 59);

    const [
      totalJobs, activeJobs, completedJobs, onHold,
      thisMonthJobs, lastMonthJobs,
      totalRevenue, thisMonthRevenue, lastMonthRevenue,
      pendingInvoices, paidInvoices,
      totalChallans, pendingChallans,
      totalCerts, passInspections, failInspections,
    ] = await Promise.all([
      prisma.jobCard.count(),
      prisma.jobCard.count({ where: { status: { in: ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION'] } } }),
      prisma.jobCard.count({ where: { status: 'COMPLETED' } }),
      prisma.jobCard.count({ where: { status: 'ON_HOLD' } }),
      prisma.jobCard.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.jobCard.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
      prisma.taxInvoice.aggregate({ _sum: { grandTotal: true } }),
      prisma.taxInvoice.aggregate({ _sum: { grandTotal: true }, where: { invoiceDate: { gte: monthStart } } }),
      prisma.taxInvoice.aggregate({ _sum: { grandTotal: true }, where: { invoiceDate: { gte: prevStart, lte: prevEnd } } }),
      prisma.taxInvoice.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.taxInvoice.count({ where: { paymentStatus: 'PAID' } }),
      prisma.jobworkChallan.count(),
      prisma.jobworkChallan.count({ where: { status: { in: ['SENT', 'DRAFT'] } } }),
      prisma.testCertificate.count(),
      prisma.incomingInspection.count({ where: { inspectionStatus: 'PASS' } }),
      prisma.incomingInspection.count({ where: { inspectionStatus: 'FAIL' } }),
    ]);

    res.json({
      success: true,
      data: {
        jobs: { total: totalJobs, active: activeJobs, completed: completedJobs, onHold, thisMonth: thisMonthJobs, lastMonth: lastMonthJobs },
        revenue: {
          total: toNum(totalRevenue._sum.grandTotal, 0),
          thisMonth: toNum(thisMonthRevenue._sum.grandTotal, 0),
          lastMonth: toNum(lastMonthRevenue._sum.grandTotal, 0),
        },
        invoices: { pending: pendingInvoices, paid: paidInvoices },
        challans: { total: totalChallans, pending: pendingChallans },
        quality: { certs: totalCerts, pass: passInspections, fail: failInspections },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Monthly Revenue (last 12 months) ─────────────────────────
exports.monthlyRevenue = async (req, res) => {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const invoices = await prisma.taxInvoice.findMany({
      where:  { invoiceDate: { gte: start } },
      select: { invoiceDate: true, grandTotal: true, subtotal: true },
    });

    // Group by month
    const map = {};
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      map[key]  = { month: label, revenue: 0, invoices: 0 };
    }

    for (const inv of invoices) {
      const d   = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (map[key]) {
        map[key].revenue  += toNum(inv.grandTotal, 0);
        map[key].invoices += 1;
      }
    }

    res.json({ success: true, data: Object.values(map) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Monthly Job Cards (last 12 months) ───────────────────────
exports.monthlyJobs = async (req, res) => {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const jobs = await prisma.jobCard.findMany({
      where:  { createdAt: { gte: start } },
      select: { createdAt: true, status: true },
    });

    const map = {};
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key]  = { month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), created: 0, completed: 0 };
    }

    for (const job of jobs) {
      const d   = new Date(job.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (map[key]) {
        map[key].created += 1;
        if (job.status === 'COMPLETED') map[key].completed += 1;
      }
    }

    res.json({ success: true, data: Object.values(map) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Monthly invoice amounts by payment status (last 12 months) ──
exports.monthlyInvoiceBreakdown = async (req, res) => {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const invoices = await prisma.taxInvoice.findMany({
      where:  { invoiceDate: { gte: start } },
      select: { invoiceDate: true, grandTotal: true, paymentStatus: true },
    });

    const map = {};
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key]  = {
        month:   d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        invoiced: 0,
        paid:     0,
        pending:  0,
      };
    }

    for (const inv of invoices) {
      const d   = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) continue;
      const amt = toNum(inv.grandTotal, 0);
      map[key].invoiced += amt;
      if (inv.paymentStatus === 'PAID') map[key].paid += amt;
      else map[key].pending += amt;
    }

    res.json({ success: true, data: Object.values(map) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Job Status Distribution ───────────────────────────────────
exports.jobStatusDist = async (req, res) => {
  try {
    const statuses = ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION', 'COMPLETED', 'ON_HOLD'];
    const counts   = await Promise.all(statuses.map(s => prisma.jobCard.count({ where: { status: s } })));

    res.json({
      success: true,
      data: statuses.map((s, i) => ({ name: s.replace(/_/g, ' '), value: counts[i] })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Top Customers by Revenue ─────────────────────────────────
exports.topCustomers = async (req, res) => {
  try {
    const rows = await prisma.taxInvoice.groupBy({
      by:        ['toPartyId'],
      _sum:      { grandTotal: true },
      _count:    { id: true },
      orderBy:   { _sum: { grandTotal: 'desc' } },
      take:      8,
    });

    const partyIds = rows.map(r => r.toPartyId);
    const parties  = await prisma.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true } });
    const partyMap = Object.fromEntries(parties.map(p => [p.id, p.name]));

    res.json({
      success: true,
      data: rows.map(r => ({
        name:     partyMap[r.toPartyId] || `Party ${r.toPartyId}`,
        revenue:  toNum(r._sum.grandTotal, 0),
        invoices: r._count.id,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Process Type Distribution ─────────────────────────────────
exports.processDist = async (req, res) => {
  try {
    const rows = await prisma.invoiceItem.groupBy({
      by:      ['processTypeId'],
      _sum:    { amount: true },
      _count:  { id: true },
      where:   { processTypeId: { not: null } },
      orderBy: { _sum: { amount: 'desc' } },
      take:    10,
    });

    const ids   = rows.map(r => r.processTypeId).filter(Boolean);
    const procs = await prisma.processType.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, code: true } });
    const map   = Object.fromEntries(procs.map(p => [p.id, p.name || p.code]));

    res.json({
      success: true,
      data: rows.map(r => ({
        name:   map[r.processTypeId] || `Process ${r.processTypeId}`,
        amount: toNum(r._sum.amount, 0),
        jobs:   r._count.id,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Inspection Quality Trends (last 6 months) ────────────────
exports.qualityTrend = async (req, res) => {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const inspections = await prisma.incomingInspection.findMany({
      where:  { createdAt: { gte: start } },
      select: { createdAt: true, inspectionStatus: true },
    });

    const map = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key]  = { month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), PASS: 0, FAIL: 0, CONDITIONAL: 0, PENDING: 0 };
    }

    for (const ins of inspections) {
      const d   = new Date(ins.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (map[key]) map[key][ins.inspectionStatus] = (map[key][ins.inspectionStatus] || 0) + 1;
    }

    res.json({ success: true, data: Object.values(map) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Avg Turnaround Time by Customer ─────────────────────────
exports.turnaround = async (req, res) => {
  try {
    const completed = await prisma.jobCard.findMany({
      where:  { status: 'COMPLETED', receivedDate: { not: null }, endDate: { not: null } },
      select: { receivedDate: true, endDate: true, customerId: true, customer: { select: { name: true } } },
      take:   200,
    });

    const customerMap = {};
    for (const job of completed) {
      const days = Math.round((new Date(job.endDate) - new Date(job.receivedDate)) / (1000 * 60 * 60 * 24));
      if (days < 0) continue;
      const name = job.customer?.name || 'Unknown';
      if (!customerMap[name]) customerMap[name] = { total: 0, count: 0 };
      customerMap[name].total += days;
      customerMap[name].count += 1;
    }

    const data = Object.entries(customerMap)
      .map(([name, v]) => ({ name, avgDays: Math.round(v.total / v.count), jobs: v.count }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 8);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Payment Status Summary ───────────────────────────────────
exports.paymentStatus = async (req, res) => {
  try {
    const [pending, partial, paid] = await Promise.all([
      prisma.taxInvoice.aggregate({ where: { paymentStatus: 'PENDING'  }, _sum: { grandTotal: true }, _count: { id: true } }),
      prisma.taxInvoice.aggregate({ where: { paymentStatus: 'PARTIAL'  }, _sum: { grandTotal: true }, _count: { id: true } }),
      prisma.taxInvoice.aggregate({ where: { paymentStatus: 'PAID'     }, _sum: { grandTotal: true }, _count: { id: true } }),
    ]);

    res.json({
      success: true,
      data: [
        { name: 'Pending',  amount: toNum(pending._sum.grandTotal, 0), count: pending._count.id  },
        { name: 'Partial',  amount: toNum(partial._sum.grandTotal, 0), count: partial._count.id  },
        { name: 'Paid',     amount: toNum(paid._sum.grandTotal, 0), count: paid._count.id     },
      ],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Material-wise Analytics ──────────────────────────────────
exports.materialAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.invoice = {};
      if (startDate) where.invoice.invoiceDate = { gte: new Date(startDate) };
      if (endDate) where.invoice.invoiceDate = { ...(where.invoice.invoiceDate || {}), lte: new Date(endDate) };
    }

    const invoiceItems = await prisma.invoiceItem.findMany({
      where,
      include: { processType: true },
      orderBy: { amount: 'desc' },
    });

    const materialMap = {};
    invoiceItems.forEach(invItem => {
      const itemName = invItem.material || invItem.description || 'Unknown';
      if (!materialMap[itemName]) {
        materialMap[itemName] = { totalAmount: 0, totalQty: 0, invoiceCount: 0 };
      }
      materialMap[itemName].totalAmount += toNum(invItem.amount, 0);
      materialMap[itemName].totalQty += toNum(invItem.quantity, 0);
      materialMap[itemName].invoiceCount += 1;
    });

    const data = Object.entries(materialMap)
      .map(([material, stats]) => ({
        material,
        totalAmount: toNum(Number(stats.totalAmount).toFixed(2), 0),
        totalQuantity: stats.totalQty,
        invoiceCount: stats.invoiceCount,
        avgPerInvoice: toNum((Number(stats.totalAmount) / stats.invoiceCount).toFixed(2), 0),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch material analytics.' });
  }
};

// ── Pending Reports Analytics ────────────────────────────────
exports.pendingReports = async (req, res) => {
  try {
    const [pendingInvoices, pendingJobCards, pendingCerts, pendingDispatch] = await Promise.all([
      prisma.taxInvoice.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.jobCard.count({ where: { status: { in: ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION'] } } }),
      prisma.testCertificate.count({ where: { status: { not: 'APPROVED' } } }),
      prisma.jobworkChallan.count({ where: { status: { in: ['DRAFT', 'SENT'] } } }),
    ]);

    // Get pending amounts
    const invoiceStats = await prisma.taxInvoice.aggregate({
      where: { paymentStatus: 'PENDING' },
      _sum: { grandTotal: true },
    });

    res.json({
      success: true,
      data: {
        pendingInvoices: {
          count: pendingInvoices,
          amount: toNum(invoiceStats._sum.grandTotal, 0),
        },
        pendingJobCards: pendingJobCards,
        pendingCertificates: pendingCerts,
        pendingDispatches: pendingDispatch,
        totalPending: pendingInvoices + pendingJobCards + pendingCerts + pendingDispatch,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch pending reports.' });
  }
};
