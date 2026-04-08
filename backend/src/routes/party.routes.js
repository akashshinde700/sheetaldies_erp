const router = require('express').Router();
const prisma = require('../utils/prisma');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const where = type ? { partyType: { in: [type, 'BOTH'] } } : {};
    const parties = await prisma.party.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: parties });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch parties.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const p = await prisma.party.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!p) return res.status(404).json({ success: false, message: 'Party not found.' });
    res.json({ success: true, data: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch party.' });
  }
});

const partyFields = (body) => ({
  name:               body.name               || undefined,
  partyCode:          body.partyCode          || null,
  address:            body.address            || undefined,
  city:               body.city               || null,
  state:              body.state              || null,
  pinCode:            body.pinCode            || null,
  gstin:              body.gstin              || null,
  pan:                body.pan                || null,
  stateCode:          body.stateCode          || null,
  phone:              body.phone              || null,
  email:              body.email              || null,
  partyType:          body.partyType          || 'CUSTOMER',
  vatTin:             body.vatTin             || null,
  cstNo:              body.cstNo              || null,
  bankAccountHolder:  body.bankAccountHolder  || null,
  bankName:           body.bankName           || null,
  accountNo:          body.accountNo          || null,
  ifscCode:           body.ifscCode           || null,
  swiftCode:          body.swiftCode          || null,
});

router.post('/', auth, requireRole('MANAGER'), async (req, res) => {
  try {
    if (!req.body.name || !req.body.address)
      return res.status(400).json({ success: false, message: 'Name and Address are required.' });
    const party = await prisma.party.create({ data: partyFields(req.body) });
    res.status(201).json({ success: true, data: party });
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(400).json({ success: false, message: 'Party Code already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', auth, requireRole('MANAGER'), async (req, res) => {
  try {
    const data = partyFields(req.body);
    // Remove undefined so existing values are not overwritten
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    const party = await prisma.party.update({ where: { id: parseInt(req.params.id) }, data });
    res.json({ success: true, data: party });
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(400).json({ success: false, message: 'Party Code already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
