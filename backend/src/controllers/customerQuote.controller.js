const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');
const { parsePagination, formatListResponse } = require('../utils/validation');

const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

const generateQuoteNo = async () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const yn = String(now.getFullYear() + 1).slice(-2);
  const prefix = `SVT/QT/${yy}-${yn}/`;
  const last = await prisma.customerQuote.findFirst({
    where: { quoteNo: { startsWith: prefix } },
    orderBy: { quoteNo: 'desc' },
  });
  let next = 1;
  if (last) {
    const parts = last.quoteNo.split('/');
    next = (toInt(parts[parts.length - 1], 0) || 0) + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
};

const calcTotals = (items, cgstRate = 9, sgstRate = 9) => {
  const subtotal = items.reduce((s, i) => s + toNum(i.amount, 0), 0);
  const cgst = +(subtotal * cgstRate / 100).toFixed(2);
  const sgst = +(subtotal * sgstRate / 100).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), cgst, sgst, totalAmount: +(subtotal + cgst + sgst).toFixed(2) };
};

// ── List ─────────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, limit, skip } = parsePagination(req);
    const where = {};
    if (status && QUOTE_STATUSES.includes(status)) where.status = status;
    const q = String(search || '').trim();
    if (q) where.OR = [
      { quoteNo: { contains: q, mode: 'insensitive' } },
      { customer: { is: { name: { contains: q, mode: 'insensitive' } } } },
    ];
    const [quotes, total] = await Promise.all([
      prisma.customerQuote.findMany({
        where,
        include: { customer: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.customerQuote.count({ where }),
    ]);
    res.json(formatListResponse(quotes, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Get One ──────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const q = await prisma.customerQuote.findUnique({
      where: { id: toInt(req.params.id) },
      include: {
        customer: true,
        createdBy: { select: { name: true } },
        items: { include: { processType: { select: { id: true, name: true, hsnSacCode: true } } } },
      },
    });
    if (!q) return res.status(404).json({ success: false, message: 'Quote not found.' });
    res.json({ success: true, data: q });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create ───────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { customerId, quoteDate, validUntil, notes, paymentTerms, cgstRate = 9, sgstRate = 9, items = [] } = req.body;
    if (!customerId || !quoteDate) return res.status(400).json({ success: false, message: 'Customer and quote date required.' });
    if (!items.length) return res.status(400).json({ success: false, message: 'At least one item required.' });

    const quoteNo = await generateQuoteNo();
    const { subtotal, cgst, sgst, totalAmount } = calcTotals(items, +cgstRate, +sgstRate);

    const q = await prisma.customerQuote.create({
      data: {
        quoteNo,
        customerId: toInt(customerId),
        quoteDate: new Date(quoteDate),
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        paymentTerms: paymentTerms || null,
        cgstRate: +cgstRate, sgstRate: +sgstRate,
        subtotal, cgst, sgst, totalAmount,
        createdById: req.user.id,
        items: {
          create: items.map(i => ({
            partName: i.partName || '',
            processTypeId: i.processTypeId ? toInt(i.processTypeId) : null,
            material: i.material || null,
            qty: toInt(i.qty) || 1,
            weight: i.weight ? toNum(i.weight, null) : null,
            rate: toNum(i.rate, 0),
            amount: toNum(i.amount, 0),
            hsnCode: i.hsnCode || null,
            remarks: i.remarks || null,
          })),
        },
      },
      include: { customer: { select: { id: true, name: true } }, items: true },
    });
    res.status(201).json({ success: true, data: q, message: `Quote ${quoteNo} created.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create quote.' });
  }
};

// ── Update ───────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const existing = await prisma.customerQuote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Quote not found.' });
    if (existing.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT quotes can be edited.' });

    const { customerId, quoteDate, validUntil, notes, paymentTerms, cgstRate = 9, sgstRate = 9, items = [] } = req.body;
    const { subtotal, cgst, sgst, totalAmount } = calcTotals(items, +cgstRate, +sgstRate);

    await prisma.customerQuoteItem.deleteMany({ where: { quoteId: id } });
    const q = await prisma.customerQuote.update({
      where: { id },
      data: {
        customerId: customerId ? toInt(customerId) : existing.customerId,
        quoteDate: quoteDate ? new Date(quoteDate) : existing.quoteDate,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes ?? existing.notes,
        paymentTerms: paymentTerms ?? existing.paymentTerms,
        cgstRate: +cgstRate, sgstRate: +sgstRate,
        subtotal, cgst, sgst, totalAmount,
        items: {
          create: items.map(i => ({
            partName: i.partName || '',
            processTypeId: i.processTypeId ? toInt(i.processTypeId) : null,
            material: i.material || null,
            qty: toInt(i.qty) || 1,
            weight: i.weight ? toNum(i.weight, null) : null,
            rate: toNum(i.rate, 0),
            amount: toNum(i.amount, 0),
            hsnCode: i.hsnCode || null,
            remarks: i.remarks || null,
          })),
        },
      },
      include: { customer: { select: { id: true, name: true } }, items: true },
    });
    res.json({ success: true, data: q, message: 'Quote updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update quote.' });
  }
};

// ── Patch Status ─────────────────────────────────────────────
exports.patchStatus = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { status } = req.body;
    if (!QUOTE_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const q = await prisma.customerQuote.update({ where: { id }, data: { status } });
    res.json({ success: true, data: q, message: `Quote status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Delete ───────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const existing = await prisma.customerQuote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Quote not found.' });
    if (existing.status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only DRAFT quotes can be deleted.' });
    await prisma.customerQuote.delete({ where: { id } });
    res.json({ success: true, message: 'Quote deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
