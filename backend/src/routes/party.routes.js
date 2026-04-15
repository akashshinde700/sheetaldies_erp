const router = require('express').Router();
const prisma = require('../utils/prisma');
const auth   = require('../middleware/auth');
const { requireRole, requireManager } = require('../middleware/role');
const { requireManager: enforceManager, requireOperator, requireOwnership } = require('../middleware/authEnforcer');
const ctrl = require('../controllers/party.controller');
const { toInt } = require('../utils/normalize');
const { parsePagination, formatListResponse, formatErrorResponse, getStatusCode } = require('../utils/validation');
const { encryptPartyData, decryptPartyData, maskSensitiveFields } = require('../utils/piiHandlerExtended');
const { withTransaction } = require('../utils/transactionHandler');
const { log } = require('../utils/logger');

// ✅ FIX C4: Add role check to GET / endpoint
router.get('/', auth, requireRole('OPERATOR'), async (req, res) => {
  try {
    const { type } = req.query;
    const { page, limit, skip } = parsePagination(req);
    
    const where = type ? { partyType: { in: [type, 'BOTH'] } } : {};
    const [parties, total] = await Promise.all([
      prisma.party.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.party.count({ where }),
    ]);
    
    const decrypted = parties.map(p => {
      const d = decryptPartyData(p);
      return maskSensitiveFields(d); // Mask for list view
    });
    
    log.info('Party list retrieved', { count: decrypted.length, userId: req.user.id });
    res.json(formatListResponse(decrypted, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Failed to fetch parties.'));
  }
});

// ✅ FIX C4: Require MANAGER role for quick create (was OPERATOR)
router.post('/quick', auth, requireRole('OPERATOR'), ctrl.quickCreateCustomer);

// ✅ FIX C4: Add OPERATOR role requirement for activity endpoint
router.get('/:id/activity', auth, requireRole('OPERATOR'), ctrl.activity);

router.get('/:id', auth, async (req, res) => {
  try {
    const partyId = toInt(req.params.id);
    if (Number.isNaN(partyId)) {
      return res.status(400).json({ success: false, message: 'Invalid party ID.' });
    }
    
    const p = await prisma.party.findUnique({
      where: { id: partyId },
    });
    if (!p) return res.status(404).json({ success: false, message: 'Party not found.' });
    
    // ✅ DECRYPT sensitive fields before returning to user
    const decrypted = decryptPartyData(p);
    res.json({ success: true, data: decrypted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch party.' });
  }
});

const normalizeGstin = (v) => {
  const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
  return s === '' ? null : s;
};

const normalizePan = (v) => {
  const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
  return s === '' ? null : s;
};

function isGstinUniqueViolation(err) {
  if (err.code !== 'P2002') return false;
  const t = err.meta?.target;
  if (Array.isArray(t) && t.includes('gstin')) return true;
  if (typeof t === 'string' && (t === 'parties_gstin_key' || t.includes('gstin'))) return true;
  return false;
}

function isPanUniqueViolation(err) {
  if (err.code !== 'P2002') return false;
  const t = err.meta?.target;
  if (Array.isArray(t) && t.includes('pan')) return true;
  if (typeof t === 'string' && (t === 'parties_pan_key' || t.includes('pan'))) return true;
  return false;
}

const partyFields = (body) => ({
  name:               body.name               || undefined,
  partyCode:          body.partyCode          || null,
  address:            body.address            || undefined,
  city:               body.city               || null,
  state:              body.state              || null,
  pinCode:            body.pinCode            || null,
  gstin:              normalizeGstin(body.gstin),
  pan:                normalizePan(body.pan),
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
    
    const partyData = partyFields(req.body);
    
    // ✅ FIX C3: Use extended encryption for ALL PII fields (phone, email, bank details)
    const encryptedData = encryptPartyData(partyData);
    
    const party = await withTransaction(prisma, async (tx) => {
      return await tx.party.create({ data: encryptedData });
    });
    
    // Return decrypted data to user
    const decrypted = decryptPartyData(party);
    
    log.business('Party created', { 
      partyId: party.id, 
      partyName: party.name,
      userId: req.user.id 
    });
    
    res.status(201).json({ success: true, data: decrypted });
  } catch (err) {
    if (err.code === 'P2002') {
      if (isGstinUniqueViolation(err))
        return res.status(400).json({ success: false, code: 'DUPLICATE_GSTIN', message: 'This GSTIN is already registered for another party.' });
      if (isPanUniqueViolation(err))
        return res.status(400).json({ success: false, code: 'DUPLICATE_PAN', message: 'This PAN is already registered for another party.' });
      return res.status(400).json({ success: false, code: 'DUPLICATE_CODE', message: 'Party Code already exists.' });
    }
    
    log.error('Party creation failed', { error: err.message });
    res.status(500).json({ success: false, code: 'ERR_INTERNAL', message: err.message });
  }
});

router.put('/:id', auth, requireRole('MANAGER'), async (req, res) => {
  try {
    const partyId = toInt(req.params.id);
    if (Number.isNaN(partyId)) {
      return res.status(400).json({ success: false, message: 'Invalid party ID.' });
    }
    
    let data = partyFields(req.body);
    // Remove undefined so existing values are not overwritten
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    
    // ✅ FIX C3: Use extended encryption for ALL PII fields
    data = encryptPartyData(data);
    
    const party = await withTransaction(prisma, async (tx) => {
      return await tx.party.update({ 
        where: { id: partyId }, 
        data 
      });
    });
    
    // Return decrypted data to user
    const decrypted = decryptPartyData(party);
    res.json({ success: true, data: decrypted });
  } catch (err) {
    if (err.code === 'P2002') {
      if (isGstinUniqueViolation(err))
        return res.status(400).json({ success: false, code: 'DUPLICATE_GSTIN', message: 'This GSTIN is already registered for another party.' });
      if (isPanUniqueViolation(err))
        return res.status(400).json({ success: false, code: 'DUPLICATE_PAN', message: 'This PAN is already registered for another party.' });
      return res.status(400).json({ success: false, code: 'DUPLICATE_CODE', message: 'Party Code already exists.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Party not found.' });
    }
    res.status(500).json({ success: false, code: 'ERR_INTERNAL', message: err.message });
  }
});

module.exports = router;
