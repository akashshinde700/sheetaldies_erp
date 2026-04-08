const router = require('express').Router();
const prisma = require('../utils/prisma');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get('/', auth, async (req, res) => {
  const { search } = req.query;
  const where = search ? { OR: [{ partNo: { contains: search } }, { description: { contains: search } }] } : {};
  const items = await prisma.item.findMany({ where, orderBy: { partNo: 'asc' } });
  res.json({ success: true, data: items });
});

router.post('/', auth, requireRole('OPERATOR'), async (req, res) => {
  try {
    if (!req.body.description) return res.status(400).json({ success: false, message: 'Description is required.' });
    if (!req.body.partNo) req.body.partNo = `P-${Date.now()}`;
    const item = await prisma.item.create({ data: req.body });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ success: false, message: `Part No "${req.body.partNo}" already exists. Use a different Part No.` });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', auth, requireRole('MANAGER'), async (req, res) => {
  try {
    const item = await prisma.item.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
