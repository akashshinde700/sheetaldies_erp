const prisma = require('../utils/prisma');

// Get all items with search
exports.list = async (req, res) => {
  try {
    const { search = '' } = req.query;

    const where = search
      ? {
          OR: [
            { partNo: { contains: search } },
            { description: { contains: search } },
            { hsnCode: { contains: search } },
            { drawingNo: { contains: search } },
          ],
        }
      : {};

    const items = await prisma.item.findMany({
      where,
      orderBy: { partNo: 'asc' },
    });

    res.json({ success: true, data: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch items.' });
  }
};

// Get single item
exports.getOne = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    res.json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Create item
exports.create = async (req, res) => {
  try {
    const { partNo, unit, hsnCode, description, material, drawingNo, weightKg } = req.body;

    if (!partNo) {
      return res.status(400).json({ success: false, message: 'Part number is required.' });
    }

    const unitVal = unit != null && String(unit).trim() !== '' ? String(unit).trim() : 'NOS';

    const item = await prisma.item.create({
      data: {
        partNo,
        unit: unitVal,
        hsnCode: hsnCode || null,
        description: description || '',
        material: material || null,
        drawingNo: drawingNo || null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
      },
    });

    res.status(201).json({ success: true, data: item, message: 'Item created successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Part number already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create item.' });
  }
};

// Update item
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { partNo, unit, hsnCode, description, material, drawingNo, weightKg } = req.body;

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(partNo !== undefined && { partNo }),
        ...(unit !== undefined && { unit }),
        ...(hsnCode !== undefined && { hsnCode: hsnCode || null }),
        ...(description !== undefined && { description: description || '' }),
        ...(material !== undefined && { material: material || null }),
        ...(drawingNo !== undefined && { drawingNo: drawingNo || null }),
        ...(weightKg !== undefined && { weightKg: weightKg ? parseFloat(weightKg) : null }),
      },
    });

    res.json({ success: true, data: item, message: 'Item updated successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    res.status(500).json({ success: false, message: 'Failed to update item.' });
  }
};

// Delete item
exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.item.delete({ where: { id } });

    res.json({ success: true, message: 'Item deleted successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    res.status(500).json({ success: false, message: 'Failed to delete item.' });
  }
};
