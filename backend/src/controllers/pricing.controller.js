const prisma = require('../utils/prisma');

// Get all process types with pricing
exports.list = async (req, res) => {
  try {
    const { search = '' } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
          ],
        }
      : {};

    const pricing = await prisma.processType.findMany({
      where,
      include: { updatedBy: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: pricing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch pricing.' });
  }
};

// Get single process type pricing
exports.getOne = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const pricing = await prisma.processType.findUnique({
      where: { id },
      include: { updatedBy: { select: { name: true } } },
    });

    if (!pricing) return res.status(404).json({ success: false, message: 'Process type not found.' });

    res.json({ success: true, data: pricing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Create process type with pricing
exports.create = async (req, res) => {
  try {
    const { code, name, description, hsnSacCode, pricePerKg, pricePerPc, minCharge, gstRate } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Code and name are required.' });
    }

    const existing = await prisma.processType.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Process code already exists.' });
    }

    const pricing = await prisma.processType.create({
      data: {
        code: code.toUpperCase(),
        name,
        description: description || null,
        hsnSacCode: hsnSacCode || null,
        pricePerKg: pricePerKg ? parseFloat(pricePerKg) : null,
        pricePerPc: pricePerPc ? parseFloat(pricePerPc) : null,
        minCharge: minCharge ? parseFloat(minCharge) : null,
        gstRate: gstRate ? parseFloat(gstRate) : 18.00,
        updatedById: req.user.id,
      },
    });

    res.status(201).json({ success: true, data: pricing, message: 'Process pricing created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create pricing.' });
  }
};

// Update process type pricing
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, hsnSacCode, pricePerKg, pricePerPc, minCharge, gstRate, isActive } = req.body;

    const pricing = await prisma.processType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(hsnSacCode !== undefined && { hsnSacCode }),
        ...(pricePerKg !== undefined && { pricePerKg: pricePerKg ? parseFloat(pricePerKg) : null }),
        ...(pricePerPc !== undefined && { pricePerPc: pricePerPc ? parseFloat(pricePerPc) : null }),
        ...(minCharge !== undefined && { minCharge: minCharge ? parseFloat(minCharge) : null }),
        ...(gstRate !== undefined && { gstRate: parseFloat(gstRate) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        updatedById: req.user.id,
      },
    });

    res.json({ success: true, data: pricing, message: 'Pricing updated successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Process type not found.' });
    }
    res.status(500).json({ success: false, message: 'Failed to update pricing.' });
  }
};

// Delete process type
exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.processType.delete({ where: { id } });

    res.json({ success: true, message: 'Process type deleted successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Process type not found.' });
    }
    res.status(500).json({ success: false, message: 'Failed to delete pricing.' });
  }
};

// Get all process types for dropdown
exports.getProcessTypes = async (req, res) => {
  try {
    const processTypes = await prisma.processType.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, pricePerKg: true, pricePerPc: true, gstRate: true },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: processTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch process types.' });
  }
};
