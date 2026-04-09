// Admin-manageable Process Types & Pricing
const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');

// ── List all process types ────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const processes = await prisma.processType.findMany({
      orderBy: { name: 'asc' },
      include: { updatedBy: { select: { name: true } } },
    });
    res.json({ success: true, data: processes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
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
    const { code, name, description, hsnSacCode, pricePerKg, pricePerPc, minCharge, gstRate } = req.body;
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
        pricePerKg:  pricePerKg  ? toNum(pricePerKg, null)  : null,
        pricePerPc:  pricePerPc  ? toNum(pricePerPc, null)  : null,
        minCharge:   minCharge   ? toNum(minCharge, null)   : null,
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
    const { name, description, hsnSacCode, pricePerKg, pricePerPc, minCharge, gstRate, isActive } = req.body;

    const pt = await prisma.processType.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(hsnSacCode  !== undefined && { hsnSacCode }),
        ...(pricePerKg  !== undefined && { pricePerKg: pricePerKg  ? toNum(pricePerKg, null)  : null }),
        ...(pricePerPc  !== undefined && { pricePerPc: pricePerPc  ? toNum(pricePerPc, null)  : null }),
        ...(minCharge   !== undefined && { minCharge:  minCharge   ? toNum(minCharge, null)   : null }),
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
