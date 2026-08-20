const prisma = require('../utils/prisma');

exports.list = async (req, res) => {
  try {
    const showAll = req.query.all === 'true';
    const where = showAll ? {} : { isActive: true };
    const data = await prisma.heatTreatSpec.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required.' });
    const spec = await prisma.heatTreatSpec.create({
      data: {
        name: name.trim().toUpperCase(),
        sortOrder: sortOrder ? Number(sortOrder) : 0,
      },
    });
    res.status(201).json({ success: true, data: spec });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Spec already exists.' });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, isActive, sortOrder } = req.body;
    const spec = await prisma.heatTreatSpec.update({
      where: { id },
      data: {
        ...(name      !== undefined && { name: name.trim().toUpperCase() }),
        ...(isActive  !== undefined && { isActive: Boolean(isActive) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });
    res.json({ success: true, data: spec });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.heatTreatSpec.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Deleted.' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.toggle = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const spec = await prisma.heatTreatSpec.findUnique({ where: { id } });
    if (!spec) return res.status(404).json({ success: false, message: 'Not found.' });
    const updated = await prisma.heatTreatSpec.update({
      where: { id },
      data: { isActive: !spec.isActive },
    });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
