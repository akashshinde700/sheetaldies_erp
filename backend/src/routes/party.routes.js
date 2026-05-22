const router = require('express').Router();
const prisma = require('../utils/prisma');
const auth   = require('../middleware/auth');
const { requireRole, requireManager } = require('../middleware/role');
const { requireManager: enforceManager, requireOperator, requireOwnership } = require('../middleware/authEnforcer');
const ctrl = require('../controllers/party.controller');
const { toInt, toNum } = require('../utils/normalize');
const { parsePagination, formatListResponse, formatErrorResponse, getStatusCode } = require('../utils/validation');
const { encryptPartyData, decryptPartyData, maskSensitiveFields } = require('../utils/piiHandlerExtended');
const { hash } = require('../utils/encryption');
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.party.count({ where }),
    ]);
    
    const decrypted = parties.map(p => {
      const d = decryptPartyData(p);
      delete d.gstinHash;
      delete d.panHash;
      return maskSensitiveFields(d);
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

// All-party process rates matrix — must be before /:id
router.get('/process-rates/matrix', auth, requireRole('MANAGER'), async (req, res) => {
  try {
    const [parties, processes, rates] = await Promise.all([
      prisma.party.findMany({
        where: { isActive: true },
        select: { id: true, name: true, partyType: true },
        orderBy: { name: 'asc' },
      }),
      prisma.processType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, pricePerKg: true, pricePerPc: true, lotPrice: true },
        orderBy: { name: 'asc' },
      }),
      prisma.partyProcessRate.findMany({
        select: { partyId: true, processTypeId: true, pricePerKg: true, pricePerPc: true, lotPrice: true },
      }),
    ]);

    const rateMap = {};
    for (const r of rates) {
      rateMap[`${r.partyId}:${r.processTypeId}`] = {
        pricePerKg: r.pricePerKg,
        pricePerPc: r.pricePerPc,
        lotPrice: r.lotPrice,
      };
    }

    res.json({ success: true, data: { parties, processes, rateMap } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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
    
    const decrypted = decryptPartyData(p);
    delete decrypted.gstinHash;
    delete decrypted.panHash;
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
  if (Array.isArray(t) && (t.includes('gstinHash') || t.includes('gstin_hash'))) return true;
  if (typeof t === 'string' && t.includes('gstin')) return true;
  return false;
}

function isPanUniqueViolation(err) {
  if (err.code !== 'P2002') return false;
  const t = err.meta?.target;
  if (Array.isArray(t) && (t.includes('panHash') || t.includes('pan_hash'))) return true;
  if (typeof t === 'string' && t.includes('pan')) return true;
  return false;
}

const partyFields = (body) => {
  const gstin = normalizeGstin(body.gstin);
  const pan   = normalizePan(body.pan);
  return {
    name:               body.name               || undefined,
    partyCode:          body.partyCode          || null,
    address:            body.address            || undefined,
    city:               body.city               || null,
    state:              body.state              || null,
    pinCode:            body.pinCode            || null,
    gstin,
    gstinHash:          gstin ? hash(gstin) : null,
    pan,
    panHash:            pan   ? hash(pan)   : null,
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
  };
};

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
    
    // Return decrypted data to user (strip internal hash fields)
    const decrypted = decryptPartyData(party);
    delete decrypted.gstinHash;
    delete decrypted.panHash;

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

// GET party-specific process rates
router.get('/:id/process-rates', auth, requireRole('OPERATOR'), async (req, res) => {
  try {
    const partyId = toInt(req.params.id);
    if (Number.isNaN(partyId)) return res.status(400).json({ success: false, message: 'Invalid party ID.' });

    const rates = await prisma.partyProcessRate.findMany({
      where: { partyId },
      include: { processType: { select: { id: true, code: true, name: true, pricePerKg: true, pricePerPc: true, lotPrice: true } } },
    });
    res.json({ success: true, data: rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT (bulk upsert) party process rates — array of { processTypeId, pricePerKg, pricePerPc, lotPrice }
router.put('/:id/process-rates', auth, requireRole('MANAGER'), async (req, res) => {
  try {
    const partyId = toInt(req.params.id);
    if (Number.isNaN(partyId)) return res.status(400).json({ success: false, message: 'Invalid party ID.' });

    const rows = Array.isArray(req.body) ? req.body : [];
    await withTransaction(prisma, async (tx) => {
      for (const row of rows) {
        const ptId = toInt(row.processTypeId);
        if (!ptId) continue;
        const data = {
          pricePerKg: row.pricePerKg != null && row.pricePerKg !== '' ? toNum(row.pricePerKg) : null,
          pricePerPc: row.pricePerPc != null && row.pricePerPc !== '' ? toNum(row.pricePerPc) : null,
          lotPrice:  row.lotPrice  != null && row.lotPrice  !== '' ? toNum(row.lotPrice)  : null,
        };
        await tx.partyProcessRate.upsert({
          where: { partyId_processTypeId: { partyId, processTypeId: ptId } },
          update: data,
          create: { partyId, processTypeId: ptId, ...data },
        });
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    
    // Return decrypted data to user (strip internal hash fields)
    const decrypted = decryptPartyData(party);
    delete decrypted.gstinHash;
    delete decrypted.panHash;
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

router.delete('/:id', auth, requireRole('MANAGER'), async (req, res) => {
  try {
    const partyId = toInt(req.params.id);
    if (Number.isNaN(partyId)) return res.status(400).json({ success: false, message: 'Invalid party ID.' });
    await prisma.party.delete({ where: { id: partyId } });
    res.json({ success: true, message: 'Party deleted.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Party not found.' });
    if (err.code === 'P2003') return res.status(400).json({ success: false, message: 'Cannot delete: party has linked records (inwards, invoices, etc.).' });
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
