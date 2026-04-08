const prisma = require('../utils/prisma');

const generateChallanNo = async () => {
  const y  = new Date().getFullYear().toString().slice(-2);   // "26"
  const yn = String(parseInt(y) + 1);                        // "27"
  const prefix = `SDT/JW/${y}-${yn}/`;

  // Find the highest existing serial for this financial year
  const last = await prisma.jobworkChallan.findFirst({
    where:   { challanNo: { startsWith: prefix } },
    orderBy: { challanNo: 'desc' },
  });

  let nextSerial = 1;
  if (last) {
    const parts = last.challanNo.split('/');
    const lastSerial = parseInt(parts[parts.length - 1]) || 0;
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
    const { status, page = 1, limit = 20 } = req.query;
    const where = status ? { status } : {};
    const [total, challans] = await Promise.all([
      prisma.jobworkChallan.count({ where }),
      prisma.jobworkChallan.findMany({
        where,
        include: {
          fromParty: { select: { name: true } },
          toParty:   { select: { name: true } },
          items:     true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:  (parseInt(page) - 1) * parseInt(limit),
        take:  parseInt(limit),
      }),
    ]);
    res.json({ success: true, data: challans, meta: { total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Get single Challan ────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const challan = await prisma.jobworkChallan.findUnique({
      where: { id: parseInt(req.params.id) },
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

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : (items || []);
    const subtotal    = parsedItems.reduce((s, it) => s + parseFloat(it.amount || 0), 0);
    const handling    = parseFloat(handlingCharges || 0);
    const total       = subtotal + handling;
    const cgstRateVal = parseFloat(cgstRate || 0);
    const sgstRateVal = parseFloat(sgstRate || 0);
    const igstRateVal = parseFloat(igstRate || 0);
    const cgstAmt     = parseFloat((total * cgstRateVal / 100).toFixed(2));
    const sgstAmt     = parseFloat((total * sgstRateVal / 100).toFixed(2));
    const igstAmt     = parseFloat((total * igstRateVal / 100).toFixed(2));
    const grandTotalVal = parseFloat((total + cgstAmt + sgstAmt + igstAmt).toFixed(2));

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
        jobCardId:       jobCardId       ? parseInt(jobCardId)       : null,
        fromPartyId:     parseInt(fromPartyId),
        toPartyId:       parseInt(toPartyId),
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
            itemId:      it.itemId    ? parseInt(it.itemId) : null,
            description: it.description || null,
            drawingNo:   it.drawingNo   || null,
            material:    it.material    || null,
            hrc:         it.hrc         || null,
            woNo:        it.woNo        || null,
            hsnCode:     it.hsnCode     || null,
            quantity:    parseFloat(it.quantity),
            qtyOut:      it.qtyOut      ? parseFloat(it.qtyOut) : null,
            uom:         it.uom         || 'KGS',
            weight:      it.weight      ? parseFloat(it.weight) : null,
            rate:        parseFloat(it.rate),
            amount:      parseFloat(it.amount),
          })),
        },
      },
      include: { fromParty: true, toParty: true, items: true },
    });

    // Update job card status
    if (jobCardId) {
      await prisma.jobCard.update({
        where: { id: parseInt(jobCardId) },
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
    const id = parseInt(req.params.id);
    const {
      challanDate, jobCardId, fromPartyId, toPartyId,
      transportMode, vehicleNo, deliveryPerson, dispatchDate, dueDate, processingNotes,
      items, handlingCharges,
      cgstRate, sgstRate, igstRate,
    } = req.body;

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : (items || []);
    const subtotal    = parsedItems.reduce((s, it) => s + parseFloat(it.amount || 0), 0);
    const handling    = parseFloat(handlingCharges || 0);
    const total       = subtotal + handling;
    const cgstRateVal = parseFloat(cgstRate || 0);
    const sgstRateVal = parseFloat(sgstRate || 0);
    const igstRateVal = parseFloat(igstRate || 0);
    const cgstAmt     = parseFloat((total * cgstRateVal / 100).toFixed(2));
    const sgstAmt     = parseFloat((total * sgstRateVal / 100).toFixed(2));
    const igstAmt     = parseFloat((total * igstRateVal / 100).toFixed(2));
    const grandTotalVal = parseFloat((total + cgstAmt + sgstAmt + igstAmt).toFixed(2));

    // Delete old items and recreate
    await prisma.challanItem.deleteMany({ where: { challanId: id } });

    const challan = await prisma.jobworkChallan.update({
      where: { id },
      data: {
        ...(challanDate      && { challanDate:     new Date(challanDate) }),
        ...(jobCardId        !== undefined && { jobCardId:      jobCardId ? parseInt(jobCardId) : null }),
        ...(fromPartyId      && { fromPartyId:     parseInt(fromPartyId) }),
        ...(toPartyId        && { toPartyId:       parseInt(toPartyId) }),
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
            itemId:      it.itemId    ? parseInt(it.itemId) : null,
            description: it.description || null,
            drawingNo:   it.drawingNo   || null,
            material:    it.material    || null,
            hrc:         it.hrc         || null,
            woNo:        it.woNo        || null,
            hsnCode:     it.hsnCode     || null,
            quantity:    parseFloat(it.quantity),
            qtyOut:      it.qtyOut      ? parseFloat(it.qtyOut) : null,
            uom:         it.uom         || 'KGS',
            weight:      it.weight      ? parseFloat(it.weight) : null,
            rate:        parseFloat(it.rate),
            amount:      parseFloat(it.amount),
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
    const id     = parseInt(req.params.id);
    const { status, receivedDate, natureOfProcess, qtyReturned, reworkQty, scrapQtyKg, scrapDetails } = req.body;

    const challan = await prisma.jobworkChallan.update({
      where: { id },
      data: {
        status,
        ...(receivedDate    && { receivedDate:    new Date(receivedDate) }),
        ...(natureOfProcess && { natureOfProcess }),
        ...(qtyReturned     && { qtyReturned:     parseInt(qtyReturned) }),
        ...(reworkQty       && { reworkQty:       parseInt(reworkQty) }),
        ...(scrapQtyKg      && { scrapQtyKg:      parseFloat(scrapQtyKg) }),
        ...(scrapDetails    && { scrapDetails }),
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
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        take: parseInt(limit, 10),
      }),
    ]);

    const rows = [];
    for (const ch of challans) {
      const dispatchedQtyByItem = new Map();
      for (const inv of ch.taxInvoices || []) {
        for (const line of inv.items || []) {
          if (!line.sourceChallanItemId) continue;
          const prev = dispatchedQtyByItem.get(line.sourceChallanItemId) || 0;
          dispatchedQtyByItem.set(line.sourceChallanItemId, prev + parseFloat(line.quantity || 0));
        }
      }

      ch.items.forEach((it, idx) => {
        const qty = parseFloat(it.quantity || 0);
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
          weight: parseFloat(it.weight || 0),
          jobcardNo: ch.jobCard?.jobCardNo || '-',
          jobcardDate: ch.jobCard?.createdAt || null,
          invoiceNos: (ch.taxInvoices || []).map((x) => x.invoiceNo).join(', '),
          dispatchQty,
          dispatchDate: ch.dispatchDate || null,
          balQty,
          velocity: parseFloat(velocity.toFixed(2)),
          delPerfPct: parseFloat(perfPct.toFixed(2)),
          deliveryPct: parseFloat(deliveryPct.toFixed(2)),
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
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load inward/outward register.' });
  }
};
