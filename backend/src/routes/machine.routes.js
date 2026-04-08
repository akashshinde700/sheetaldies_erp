const router = require('express').Router();
const prisma  = require('../utils/prisma');
const auth    = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get('/', auth, async (req, res) => {
  const machines = await prisma.machine.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  res.json({ success: true, data: machines });
});

router.post('/', auth, requireRole('MANAGER'), async (req, res) => {
  try {
    const m = await prisma.machine.create({ data: req.body });
    res.status(201).json({ success: true, data: m });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
