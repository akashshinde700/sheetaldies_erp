const prisma = require('../utils/prisma');
const { toInt } = require('../utils/normalize');

// Get all machines with search
exports.list = async (req, res) => {
  try {
    const { search = '' } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { type: { contains: search } },
            { make: { contains: search } },
          ],
        }
      : {};

    const machines = await prisma.machine.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: machines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch machines.' });
  }
};

// Get single machine
exports.getOne = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });

    const machine = await prisma.machine.findUnique({ where: { id } });

    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found.' });

    res.json({ success: true, data: machine });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Create machine
exports.create = async (req, res) => {
  try {
    const { code, name, type, make } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Code and name are required.' });
    }

    const machine = await prisma.machine.create({
      data: {
        code,
        name,
        type: type || null,
        make: make || null,
      },
    });

    res.status(201).json({ success: true, data: machine, message: 'Machine created successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Machine code already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create machine.' });
  }
};

// Update machine
exports.update = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const { name, code, type, make, isActive } = req.body;

    const machine = await prisma.machine.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(type !== undefined && { type: type || null }),
        ...(make !== undefined && { make: make || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.json({ success: true, data: machine, message: 'Machine updated successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Machine not found.' });
    }
    res.status(500).json({ success: false, message: 'Failed to update machine.' });
  }
};

// Delete machine
exports.delete = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });

    await prisma.machine.delete({ where: { id } });

    res.json({ success: true, message: 'Machine deleted successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Machine not found.' });
    }
    res.status(500).json({ success: false, message: 'Failed to delete machine.' });
  }
};
