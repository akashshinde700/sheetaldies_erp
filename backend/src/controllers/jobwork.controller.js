const prisma = require('../utils/prisma');
const { jobworkStatusBody } = require('../validation/schemas');
const { toInt, toNum, asArray, toDateOrNull } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');
const { parseJsonIfString } = require('../utils/json');

const generateChallanNo = async () => {
  const y  = new Date().getFullYear().toString().slice(-2);   // "26"
  const yn = String(toInt(y, 0) + 1);                        // "27"
  const prefix = `SDT/JW/${y}-${yn}/`;

  // Find the highest existing serial for this financial year
  const last = await prisma.jobworkChallan.findFirst({
    where:   { challanNo: { startsWith: prefix } },
    orderBy: { challanNo: 'desc' },
  });

  let nextSerial = 1;
  if (last) {
    const parts = last.challanNo.split('/');
    const lastSerial = toInt(parts[parts.length - 1], 0) || 0;
    nextSerial = lastSerial + 1;
  }

  // Retry until unique (handles race conditions)
  let challanNo;
  do {
    challanNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    const exists = await prisma.jobworkChallan.findUnique({ where: { challanNo } });
    if (!exists) break;
    nextSerial++;
  } while (nextSerial < 9999);

  return challanNo;
};

// ── List Challans ─────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, seedDemo, fromDate, toDate, search } = req.query;
    const { page, limit, skip } = parsePagination(req);
    const exportAll = String(req.query.exportAll) === 'true';

    // DEBUG: Log export request details
    console.log('[JOBWORK EXPORT DEBUG]', {
      exportAll,
      page,
      limit,
      skip,
      status,
      fromDate,
      toDate,
      timestamp: new Date().toISOString(),
    });
    
    const and = [];
    if (status) and.push({ status });
    const searchText = String(search || '').trim();
    if (searchText) {
      and.push({
        OR: [
          { challanNo: { contains: searchText, mode: 'insensitive' } },
          { fromParty: { is: { name: { contains: searchText, mode: 'insensitive' } } } },
          { toParty: { is: { name: { contains: searchText, mode: 'insensitive' } } } },
          { jobCard: { is: { jobCardNo: { contains: searchText, mode: 'insensitive' } } } },
        ],
      });
    }
    // Hide seeded demo challans by default; allow explicit override via query.
    const demoMode = seedDemo === 'only' ? 'only' : (seedDemo === 'all' ? 'all' : 'hide');
    if (demoMode === 'only') {
      and.push({ processingNotes: { contains: 'Seed: demo challan' } });
    } else if (demoMode === 'hide') {
      and.push({
        OR: [
          { processingNotes: null },
          { processingNotes: { not: { contains: 'Seed: demo challan' } } },
        ],
      });
    }

    if (fromDate || toDate) {
      const challanDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!Number.isNaN(from.getTime())) challanDate.gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!Number.isNaN(to.getTime())) {
          to.setDate(to.getDate() + 1);
          challanDate.lt = to;
        }
      }
      if (Object.keys(challanDate).length) and.push({ challanDate });
    }

    const where = and.length ? { AND: and } : {};
    const [challans, total] = await Promise.all([
      prisma.jobworkChallan.findMany({
        where,
        include: {
          fromParty: { select: { name: true } },
          toParty:   { select: { name: true } },
          jobCard:   { select: { id: true, jobCardNo: true } },
          items:     true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...(exportAll ? { skip: 0, take: 100000 } : { skip, take: limit }),
      }),
      prisma.jobworkChallan.count({ where }),
    ]);

    // DEBUG: Log results
    console.log('[JOBWORK RESULTS]', {
      challansReturned: challans.length,
      totalInDB: total,
      exportAll,
      responseLimit: exportAll ? challans.length : limit,
      timestamp: new Date().toISOString(),
    });

    res.json(formatListResponse(challans, total, exportAll ? 1 : page, exportAll ? challans.length : limit));
  } catch (err) {
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Server error.'));
  }
};

// ── Get single Challan ────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const challan = await prisma.jobworkChallan.findUnique({
      where: { id: toInt(req.params.id) },
      include: {
        fromParty: true,
        toParty:   true,
        jobCard:   { include: { part: true } },
        items:     { include: { item: true } },
        createdBy: { select: { name: true } },
      },
    });
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' });
    res.json({ success: true, data: challan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Challan ────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      challanDate, jobCardId, fromPartyId, toPartyId,
      invoiceChNo, invoiceChDate,
      transportMode, vehicleNo, deliveryPerson, dispatchDate, dueDate, processingNotes,
      items, handlingCharges,
      cgstRate, sgstRate, igstRate,
      manualChallanNo,
    } = req.body;

    if (!fromPartyId || !toPartyId)
      return res.status(400).json({ success: false, message: 'From and To party are required.' });

    const parsedItems = asArray(items);
    const subtotal    = parsedItems.reduce((s, it) => s + toNum(it.amount, 0), 0);
    const handling    = toNum(handlingCharges, 0);
    const total       = subtotal + handling;
    const cgstRateVal = toNum(cgstRate, 0);
    const sgstRateVal = toNum(sgstRate, 0);
    const igstRateVal = toNum(igstRate, 0);
    const cgstAmt     = toNum((total * cgstRateVal / 100).toFixed(2), 0);
    const sgstAmt     = toNum((total * sgstRateVal / 100).toFixed(2), 0);
    const igstAmt     = toNum((total * igstRateVal / 100).toFixed(2), 0);
    const grandTotalVal = toNum((total + cgstAmt + sgstAmt + igstAmt).toFixed(2), 0);

    let challanNo;
    if (manualChallanNo && manualChallanNo.trim()) {
      const trimmed = manualChallanNo.trim();
      const existing = await prisma.jobworkChallan.findUnique({ where: { challanNo: trimmed } });
      if (existing)
        return res.status(400).json({ success: false, message: `Challan No "${trimmed}" already exists.` });
      challanNo = trimmed;
    } else {
      challanNo = await generateChallanNo();
    }

    const challan = await prisma.jobworkChallan.create({
      data: {
        challanNo,
        challanDate:     new Date(challanDate || new Date()),
        jobCardId:       jobCardId       ? toInt(jobCardId)       : null,
        fromPartyId:     toInt(fromPartyId),
        toPartyId:       toInt(toPartyId),
        invoiceChNo:     invoiceChNo     || null,
        invoiceChDate:   invoiceChDate   ? new Date(invoiceChDate)   : null,
        transportMode:   transportMode   || 'Hand Delivery',
        vehicleNo:       vehicleNo       || null,
        deliveryPerson:  deliveryPerson  || null,
        dispatchDate:    dispatchDate    ? new Date(dispatchDate)    : null,
        dueDate:         dueDate         ? new Date(dueDate)         : null,
        processingNotes: processingNotes || null,
        subtotal,
        handlingCharges: handling,
        totalValue:      total,
        cgstRate:        cgstRateVal || null,
        cgstAmount:      cgstAmt     || null,
        sgstRate:        sgstRateVal || null,
        sgstAmount:      sgstAmt     || null,
        igstRate:        igstRateVal || null,
        igstAmount:      igstAmt     || null,
        grandTotal:      grandTotalVal,
        createdById:     req.user.id,
        items: {
          create: parsedItems.map(it => ({
            itemId:      it.itemId    ? toInt(it.itemId) : null,
            description: it.description || null,
            drawingNo:   it.drawingNo   || null,
            material:    it.material    || null,
            hrc:         it.hrc         || null,
            woNo:        it.woNo        || null,
            hsnCode:     it.hsnCode     || null,
            quantity:    toNum(it.quantity, 0),
            qtyOut:      it.qtyOut      ? toNum(it.qtyOut, null) : null,
            uom:         it.uom         || 'KGS',
            weight:      it.weight      ? toNum(it.weight, null) : null,
            rate:        toNum(it.rate, 0),
            amount:      toNum(it.amount, 0),
          })),
        },
      },
      include: { fromParty: true, toParty: true, items: true },
    });

    // Update job card status
    if (jobCardId) {
      await prisma.jobCard.update({
        where: { id: toInt(jobCardId) },
        data:  { status: 'SENT_FOR_JOBWORK' },
      });
    }

    res.status(201).json({ success: true, data: challan, message: `Challan ${challanNo} created.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Full Update Challan ───────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const {
      challanDate, jobCardId, fromPartyId, toPartyId,
      transportMode, vehicleNo, deliveryPerson, dispatchDate, dueDate, processingNotes,
      items, handlingCharges,
      cgstRate, sgstRate, igstRate,
    } = req.body;

    let parsedItems;
    try {
      parsedItems = parseJsonIfString(items, { fieldName: 'items', defaultValue: [] }) || [];
    } catch (e) {
      if (e.code === 'INVALID_JSON') {
        return res.status(400).json({ success: false, code: e.code, message: e.message });
      }
      throw e;
    }
    const subtotal    = parsedItems.reduce((s, it) => s + toNum(it.amount, 0), 0);
    const handling    = toNum(handlingCharges, 0);
    const total       = subtotal + handling;
    const cgstRateVal = toNum(cgstRate, 0);
    const sgstRateVal = toNum(sgstRate, 0);
    const igstRateVal = toNum(igstRate, 0);
    const cgstAmt     = toNum((total * cgstRateVal / 100).toFixed(2), 0);
    const sgstAmt     = toNum((total * sgstRateVal / 100).toFixed(2), 0);
    const igstAmt     = toNum((total * igstRateVal / 100).toFixed(2), 0);
    const grandTotalVal = toNum((total + cgstAmt + sgstAmt + igstAmt).toFixed(2), 0);

    // Delete old items and recreate
    await prisma.challanItem.deleteMany({ where: { challanId: id } });

    const challan = await prisma.jobworkChallan.update({
      where: { id },
      data: {
        ...(challanDate      && { challanDate:     new Date(challanDate) }),
        ...(jobCardId        !== undefined && { jobCardId:      jobCardId ? toInt(jobCardId) : null }),
        ...(fromPartyId      && { fromPartyId:     toInt(fromPartyId) }),
        ...(toPartyId        && { toPartyId:       toInt(toPartyId) }),
        ...(transportMode    !== undefined && { transportMode }),
        ...(vehicleNo        !== undefined && { vehicleNo }),
        ...(deliveryPerson   !== undefined && { deliveryPerson }),
        ...(dispatchDate     !== undefined && { dispatchDate:   dispatchDate ? new Date(dispatchDate) : null }),
        ...(dueDate          !== undefined && { dueDate:        dueDate      ? new Date(dueDate)      : null }),
        ...(processingNotes  !== undefined && { processingNotes }),
        subtotal,
        handlingCharges: handling,
        totalValue:      total,
        cgstRate:        cgstRateVal || null,
        cgstAmount:      cgstAmt     || null,
        sgstRate:        sgstRateVal || null,
        sgstAmount:      sgstAmt     || null,
        igstRate:        igstRateVal || null,
        igstAmount:      igstAmt     || null,
        grandTotal:      grandTotalVal,
        items: {
          create: parsedItems.map(it => ({
            itemId:      it.itemId    ? toInt(it.itemId) : null,
            description: it.description || null,
            drawingNo:   it.drawingNo   || null,
            material:    it.material    || null,
            hrc:         it.hrc         || null,
            woNo:        it.woNo        || null,
            hsnCode:     it.hsnCode     || null,
            quantity:    toNum(it.quantity, 0),
            qtyOut:      it.qtyOut      ? toNum(it.qtyOut, null) : null,
            uom:         it.uom         || 'KGS',
            weight:      it.weight      ? toNum(it.weight, null) : null,
            rate:        toNum(it.rate, 0),
            amount:      toNum(it.amount, 0),
          })),
        },
      },
      include: { fromParty: true, toParty: true, items: true },
    });

    res.json({ success: true, data: challan, message: 'Challan updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Update Challan status ─────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { error, value } = jobworkStatusBody.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const { status, receivedDate, natureOfProcess, qtyReturned, reworkQty, scrapQtyKg, scrapDetails } = value;

    const challan = await prisma.jobworkChallan.update({
      where: { id },
      data: {
        status,
        ...(toDateOrNull(receivedDate) && { receivedDate: toDateOrNull(receivedDate) }),
        ...(natureOfProcess && { natureOfProcess }),
        ...(qtyReturned !== undefined && qtyReturned !== null && qtyReturned !== '' && { qtyReturned: toInt(qtyReturned) }),
        ...(reworkQty !== undefined && reworkQty !== null && reworkQty !== '' && { reworkQty: toInt(reworkQty) }),
        ...(scrapQtyKg !== undefined && scrapQtyKg !== null && scrapQtyKg !== '' && { scrapQtyKg: toNum(scrapQtyKg) }),
        ...(scrapDetails && { scrapDetails }),
      },
    });
    res.json({ success: true, data: challan, message: 'Status updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Inward / Outward Register ─────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { page = 1, limit = 100, companyName = '', challanNo = '' } = req.query;
    const where = {};
    if (challanNo) where.challanNo = { contains: challanNo };
    if (companyName) where.toParty = { name: { contains: companyName } };

    const [total, challans] = await Promise.all([
      prisma.jobworkChallan.count({ where }),
      prisma.jobworkChallan.findMany({
        where,
        include: {
          toParty: { select: { name: true } },
          jobCard: { select: { jobCardNo: true, createdAt: true } },
          items: true,
          taxInvoices: {
            include: { items: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { challanDate: 'desc' },
        skip: (toInt(page, 1) - 1) * toInt(limit, 10),
        take: toInt(limit, 10),
      }),
    ]);

    const rows = [];
    for (const ch of challans) {
      const dispatchedQtyByItem = new Map();
      for (const inv of ch.taxInvoices || []) {
        for (const line of inv.items || []) {
          if (!line.sourceChallanItemId) continue;
          const prev = dispatchedQtyByItem.get(line.sourceChallanItemId) || 0;
          dispatchedQtyByItem.set(line.sourceChallanItemId, prev + toNum(line.quantity, 0));
        }
      }

      ch.items.forEach((it, idx) => {
        const qty = toNum(it.quantity, 0);
        const dispatchQty = dispatchedQtyByItem.get(it.id) || 0;
        const balQty = Math.max(0, qty - dispatchQty);
        const deliveryPct = qty > 0 ? (dispatchQty / qty) * 100 : 0;
        const velocity = qty > 0 ? dispatchQty / qty : 0;
        const perfPct = deliveryPct;

        rows.push({
          srNo: rows.length + 1,
          companyName: ch.toParty?.name || '-',
          material: it.material || '-',
          challanNo: ch.challanNo,
          challanDate: ch.challanDate,
          materialInDate: ch.receivedDate || ch.challanDate,
          qty,
          weight: toNum(it.weight, 0),
          jobcardNo: ch.jobCard?.jobCardNo || '-',
          jobcardDate: ch.jobCard?.createdAt || null,
          invoiceNos: (ch.taxInvoices || []).map((x) => x.invoiceNo).join(', '),
          dispatchQty,
          dispatchDate: ch.dispatchDate || null,
          balQty,
          velocity: toNum(velocity.toFixed(2), 0),
          delPerfPct: toNum(perfPct.toFixed(2), 0),
          deliveryPct: toNum(deliveryPct.toFixed(2), 0),
          challanId: ch.id,
          challanItemId: it.id,
          itemDescription: it.description || '',
        });
      });
    }

    res.json({
      success: true,
      data: rows,
      meta: {
        totalChallans: total,
        rowCount: rows.length,
        page: toInt(page, 1),
        limit: toInt(limit, 10),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load inward/outward register.' });
  }
};
