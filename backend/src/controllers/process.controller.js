// Admin-manageable Process Types & Pricing
const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');

// ── List all process types ────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const showAll = req.query.all === 'true' && ['ADMIN', 'MANAGER'].includes(req.user?.role);
    const where = showAll ? {} : { isActive: true };
    // `code` is a string (serial number entered as text), so DB-level
    // ordering would sort lexicographically ("1","10","11"..."2"). Fetch all
    // matching rows (this list is always small) and sort numerically by code
    // in JS instead, falling back to string comparison for non-numeric codes.
    const all = await prisma.processType.findMany({
      where,
      include: { updatedBy: { select: { name: true } } },
    });
    all.sort((a, b) => {
      const na = Number(a.code);
      const nb = Number(b.code);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a.code).localeCompare(String(b.code));
    });
    const total = all.length;
    const data = all.slice(skip, skip + limit);
    res.json(formatListResponse(data, total, page, limit));
  } catch (err) {
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Server error.'));
  }
};

// ── Get single process type ───────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const pt = await prisma.processType.findUnique({
      where: { id: toInt(req.params.id) },
    });
    if (!pt) return res.status(404).json({ success: false, message: 'Process type not found.' });
    res.json({ success: true, data: pt });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create new process type (Admin only) ──────────────────────
exports.create = async (req, res) => {
  try {
    const { code, name, description, hsnSacCode, pricePerKg, pricePerPc, lotPrice, gstRate, tallyStockItem } = req.body;
    if (!code || !name)
      return res.status(400).json({ success: false, message: 'Code and name are required.' });

    const existing = await prisma.processType.findUnique({ where: { code: code.toUpperCase() } });
    if (existing)
      return res.status(409).json({ success: false, message: 'Process code already exists.' });

    const pt = await prisma.processType.create({
      data: {
        code:        code.toUpperCase(),
        name,
        description: description || null,
        hsnSacCode:  hsnSacCode  || null,
        // Tally matches stock items by exact name, so trim before storing.
        tallyStockItem: (tallyStockItem || '').trim() || null,
        pricePerKg:  pricePerKg  ? toNum(pricePerKg, null)  : null,
        pricePerPc:  pricePerPc  ? toNum(pricePerPc, null)  : null,
        lotPrice:   lotPrice   ? toNum(lotPrice, null)   : null,
        gstRate:     gstRate     ? toNum(gstRate, 18)       : 18.00,
        updatedById: req.user.id,
      },
    });
    res.status(201).json({ success: true, data: pt, message: 'Process type created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Update process type pricing (Admin only) ──────────────────
exports.update = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { name, code, description, hsnSacCode, pricePerKg, pricePerPc, lotPrice, gstRate, isActive, tallyStockItem } = req.body;

    if (code !== undefined && code.trim()) {
      const newCode = code.trim().toUpperCase();
      const existing = await prisma.processType.findUnique({ where: { code: newCode } });
      if (existing && existing.id !== id) {
        return res.status(409).json({ success: false, message: `Code "${newCode}" is already used by another process.` });
      }
    }

    const pt = await prisma.processType.update({
      where: { id },
      data: {
        ...(code        !== undefined && code.trim() && { code: code.trim().toUpperCase() }),
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(hsnSacCode  !== undefined && { hsnSacCode }),
        ...(tallyStockItem !== undefined && { tallyStockItem: (tallyStockItem || '').trim() || null }),
        ...(pricePerKg  !== undefined && { pricePerKg: pricePerKg  ? toNum(pricePerKg, null)  : null }),
        ...(pricePerPc  !== undefined && { pricePerPc: pricePerPc  ? toNum(pricePerPc, null)  : null }),
        ...(lotPrice   !== undefined && { lotPrice:  lotPrice   ? toNum(lotPrice, null)   : null }),
        ...(gstRate     !== undefined && { gstRate:    toNum(gstRate, 18) }),
        ...(isActive    !== undefined && { isActive: Boolean(isActive) }),
        updatedById: req.user.id,
      },
    });
    res.json({ success: true, data: pt, message: 'Process type updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Delete process type (Admin/Manager only) ──────────────────
exports.remove = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const [challanCount, invoiceCount] = await Promise.all([
      prisma.challanItem.count({ where: { processTypeId: id } }),
      prisma.invoiceItem.count({ where: { processTypeId: id } }),
    ]);
    if (challanCount + invoiceCount > 0)
      return res.status(409).json({
        success: false,
        message: `Cannot delete: process is used in ${challanCount} challan item(s) and ${invoiceCount} invoice item(s). Deactivate it instead.`,
      });
    await prisma.processType.delete({ where: { id } });
    res.json({ success: true, message: 'Process type deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Toggle active ─────────────────────────────────────────────
exports.toggle = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const pt = await prisma.processType.findUnique({ where: { id } });
    if (!pt) return res.status(404).json({ success: false, message: 'Not found.' });

    const updated = await prisma.processType.update({
      where: { id },
      data:  { isActive: !pt.isActive, updatedById: req.user.id },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
