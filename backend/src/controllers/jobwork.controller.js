const prisma = require('../utils/prisma');
const { jobworkStatusBody } = require('../validation/schemas');
const { toInt, toNum, asArray, toDateOrNull } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');
const { parseJsonIfString } = require('../utils/json');
const { withTransaction } = require('../utils/transactionHandler');

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
const MAX_EXPORT_LIMIT = 5000; // ✅ FIXED: Cap export to prevent DOS

exports.list = async (req, res) => {
  try {
    const { status, seedDemo, fromDate, toDate, search } = req.query;
    const { page, limit, skip } = parsePagination(req);
    const exportAll = String(req.query.exportAll) === 'true';

    // ✅ FIXED: Cap export limit to prevent DOS attack
    const finalLimit = exportAll ? Math.min(MAX_EXPORT_LIMIT, 5000) : Math.min(limit, 500);
    const finalSkip = exportAll ? 0 : skip;

    
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
        skip: finalSkip,
        take: finalLimit,
      }),
      prisma.jobworkChallan.count({ where }),
    ]);


    res.json(formatListResponse(challans, total, exportAll ? 1 : page, challans.length));
  } catch (err) {
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Server error.'));
  }
};

// ── Get single Challan ────────────────────────────────────────
const CHALLAN_FULL_INCLUDE = {
  fromParty: true,
  toParty:   true,
  jobCard:   { include: { part: true } },
  items:     { include: { item: true, processType: { select: { id: true, name: true, code: true, hsnSacCode: true, pricePerKg: true } } } },
  createdBy: { select: { name: true } },
  taxInvoices: { select: { id: true, invoiceNo: true } },
};

exports.getOne = async (req, res) => {
  try {
    const challan = await prisma.jobworkChallan.findUnique({
      where:   { id: toInt(req.params.id) },
      include: CHALLAN_FULL_INCLUDE,
    });
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' });
    res.json({ success: true, data: challan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getByChallanNo = async (req, res) => {
  try {
    const { challanNo } = req.params;
    const challan = await prisma.jobworkChallan.findUnique({
      where:   { challanNo },
      include: CHALLAN_FULL_INCLUDE,
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

    // ✅ FIXED: Wrap in transaction to prevent partial failures
    const challan = await withTransaction(prisma, async (tx) => {
      return await tx.jobworkChallan.create({
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
              sacNo:       it.sacNo       || null,
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

      // ✅ FIXED: Update job card status INSIDE transaction to maintain consistency
      if (jobCardId) {
        await tx.jobCard.update({
          where: { id: toInt(jobCardId) },
          data:  { status: 'SENT_FOR_JOBWORK' },
        });
      }

      return challan;
    });

    res.status(201).json({ success: true, data: challan, message: `Challan ${challanNo} created.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Inward Entry (with Auto Job Card Generation) ───────
exports.createInward = async (req, res) => {
  try {
    const {
      challanDate, fromPartyId, toPartyId,
      manualChallanNo, receivedDate,
      jobCardNo: manualJobCardNo, jobCardDate: manualJobCardDate,
      invoiceChNo, invoiceChDate,
      vehicleNo, deliveryPerson, processingNotes, dispatchDate,
      poNo, poDate, cillNo,
      items, handlingCharges,
      cgstRate, sgstRate, igstRate,
    } = req.body;

    if (!fromPartyId || !toPartyId)
      return res.status(400).json({ success: false, message: 'From and To party are required.' });

    const parsedItems = asArray(items);
    if (!parsedItems.length)
      return res.status(400).json({ success: false, message: 'At least one item is required.' });

    const firstItem = parsedItems[0]; // Use first item's characteristics for Job Card
    if (!firstItem.material || !firstItem.quantity)
      return res.status(400).json({ success: false, message: 'Each item must have material and quantity.' });

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

    // ✅ Transaction: Create Challan Only (No Job Card Yet)
    const challan = await withTransaction(prisma, async (tx) => {
      // 1️⃣ Generate Challan Number
      let challanNo = manualChallanNo;
      if (!challanNo) {
        const y  = new Date().getFullYear().toString().slice(-2);
        const yn = String(toInt(y, 0) + 1);
        const prefix = `SDT/JW/${y}-${yn}/`;
        const last = await tx.jobworkChallan.findFirst({
          where: { challanNo: { startsWith: prefix } },
          orderBy: { challanNo: 'desc' },
        });
        let nextSerial = 1;
        if (last) {
          const parts = last.challanNo.split('/');
          const lastSerial = toInt(parts[parts.length - 1], 0) || 0;
          nextSerial = lastSerial + 1;
        }
        challanNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;
      }

      // 2️⃣ Create Challan (No Job Card Link Yet)
      const challan = await tx.jobworkChallan.create({
        data: {
          challanNo,
          challanDate: new Date(challanDate || new Date()),
          fromPartyId: toInt(fromPartyId),
          toPartyId: toInt(toPartyId),
          invoiceChNo: invoiceChNo || null,
          invoiceChDate: invoiceChDate ? new Date(invoiceChDate) : null,
          transportMode: 'Hand Delivery',
          vehicleNo: vehicleNo || null,
          deliveryPerson: deliveryPerson || null,
          poNo: poNo || null,
          poDate: poDate ? new Date(poDate) : null,
          cillNo: cillNo || null,
          receivedDate: receivedDate ? new Date(receivedDate) : null,
          processingNotes: processingNotes || 'Inward entry.',
          subtotal,
          handlingCharges: handling,
          totalValue: total,
          cgstRate: cgstRateVal || null,
          cgstAmount: cgstAmt || null,
          sgstRate: sgstRateVal || null,
          sgstAmount: sgstAmt || null,
          igstRate: igstRateVal || null,
          igstAmount: igstAmt || null,
          grandTotal: grandTotalVal,
          createdById: req.user.id,
          items: {
            create: parsedItems.map(it => ({
              itemId: it.itemId ? toInt(it.itemId) : null,
              description: it.description || null,
              drawingNo: it.drawingNo || null,
              material: it.material || null,
              hrc: it.hrc || null,
              woNo: it.woNo || null,
              hsnCode: it.hsnCode || null,
              sacNo: it.sacNo || null,
              quantity: toNum(it.quantity, 0),
              qtyOut: toNum(it.qtyOut, 0), // Dispatch Qty
              uom: it.uom || 'KGS',
              weight: it.weight ? toNum(it.weight, null) : null,
              rate: toNum(it.rate, 0),
              amount: toNum(it.amount, 0),
              processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
              processName: it.processName || null,
            })),
          },
        },
        include: { jobCard: true, fromParty: true, toParty: true, items: true },
      });

      return challan;
    });

    res.status(201).json({
      success: true,
      data: { challan },
      message: `Inward entry created: Challan ${challan.challanNo}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Job Card from Challan ─────────────────────────────
exports.createJobCardFromChallan = async (req, res) => {
  try {
    const { challanId, challanNo } = req.body;
    if (!challanId && !challanNo) {
      return res.status(400).json({ success: false, message: 'Challan ID or Challan No is required.' });
    }

    const challan = challanId
      ? await prisma.jobworkChallan.findUnique({
          where: { id: toInt(challanId) },
          include: { items: true, fromParty: true },
        })
      : await prisma.jobworkChallan.findFirst({
          where: { challanNo: String(challanNo).trim() },
          include: { items: true, fromParty: true },
        });
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' });
    if (challan.jobCardId) return res.status(400).json({ success: false, message: 'Job card already exists for this challan.' });

    const firstItem = challan.items[0];
    if (!firstItem) return res.status(400).json({ success: false, message: 'Challan has no items.' });

    // ✅ Transaction: Create Job Card and Link to Challan
    const result = await withTransaction(prisma, async (tx) => {
      // 1️⃣ Generate Job Card Number (YYMM + 4 random digits, unique per month/year)
      const now = new Date();
      const yy  = String(now.getFullYear()).slice(-2);
      const mm  = String(now.getMonth() + 1).padStart(2, '0');
      const jobCardPrefix = `${yy}${mm}`;
      let jobCardNo;
      let attempts = 0;
      do {
        const rand = String(Math.floor(1000 + Math.random() * 9000));
        jobCardNo = `${jobCardPrefix}${rand}`;
        const existing = await tx.jobCard.findUnique({ where: { jobCardNo } });
        if (!existing) break;
        attempts += 1;
      } while (attempts < 50);

      // 2️⃣ Create Item for this job card (if not already in system)
      let partId = null;
      if (firstItem.itemId) {
        partId = toInt(firstItem.itemId);
      } else {
        const genericItem = await tx.item.create({
          data: {
            partNo: `JOBCARD-${jobCardNo}`,
            description: firstItem.material || 'Job Card Material',
            hsnCode: firstItem.hsnCode || null,
          },
        });
        partId = genericItem.id;
      }

      // 3️⃣ Create Job Card
      const jobCard = await tx.jobCard.create({
        data: {
          jobCardNo,
          partId,
          customerId: challan.fromPartyId, // Customer is the fromParty
          drawingNo: firstItem.drawingNo || null,
          hrcRange: firstItem.hrc || null,
          quantity: toInt(firstItem.quantity, 0),
          totalWeight: firstItem.weight ? toNum(firstItem.weight, null) : null,
          receivedDate: new Date(),
          issueDate: new Date(),
          createdAt: new Date(),
          status: 'SENT_FOR_JOBWORK',
          createdById: req.user.id,
        },
      });

      // 4️⃣ Link Job Card to Challan
      await tx.jobworkChallan.update({
        where: { id: challan.id },
        data: { jobCardId: jobCard.id },
      });

      return { challan, jobCard };
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `Job card created: ${result.jobCard.jobCardNo} linked to challan ${result.challan.challanNo}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Run Sheet from Job Card ───────────────────────────
exports.createRunSheetFromJobCard = async (req, res) => {
  try {
    const { jobCardId, jobCardNo, furnaceId, runDate, batchId } = req.body;
    if (!jobCardId && !jobCardNo) return res.status(400).json({ success: false, message: 'Job Card ID or Job Card No is required.' });

    const jobCard = jobCardId
      ? await prisma.jobCard.findUnique({
          where: { id: toInt(jobCardId) },
          include: { customer: true, part: true },
        })
      : await prisma.jobCard.findFirst({
          where: { jobCardNo: String(jobCardNo).trim() },
          include: { customer: true, part: true },
        });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found.' });

    // Check if run sheet already exists for this job card
    const existing = await prisma.vHTRunsheetItem.findFirst({
      where: { jobCardId: jobCard.id },
    });
    if (existing) return res.status(400).json({ success: false, message: 'Run sheet already exists for this job card.' });

    let finalFurnaceId = furnaceId ? toInt(furnaceId) : null;
    if (!finalFurnaceId) {
      const defaultFurnace = await prisma.machine.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      });
      if (!defaultFurnace) return res.status(400).json({ success: false, message: 'No active furnace available to create run sheet.' });
      finalFurnaceId = defaultFurnace.id;
    }

    // Generate runsheet number
    const lastRS = await prisma.vHTRunsheet.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { runsheetNumber: true },
    });
    const lastNum = lastRS?.runsheetNumber ? toInt(lastRS.runsheetNumber.split('/').pop(), 0) : 0;
    const runsheetNumber = `VHT/${new Date().getFullYear()}/${String(lastNum + 1).padStart(5, '0')}`;

    // Create run sheet
    const runsheet = await prisma.vHTRunsheet.create({
      data: {
        runsheetNumber,
        runDate: runDate ? new Date(runDate) : new Date(),
        furnaceId: finalFurnaceId,
        batchId: batchId ? toInt(batchId) : null,
        status: 'PLANNED',
        createdById: req.user.id,
        items: {
          create: [{
            jobCardId: jobCard.id,
            itemId: jobCard.partId,
            customerName: jobCard.customer?.name || null,
            jobDescription: jobCard.part?.description || null,
            materialGrade: jobCard.part?.material || jobCard.dieMaterial || null,
            hrcRequired: jobCard.hrcRange || null,
            quantity: jobCard.quantity,
            weightKg: jobCard.totalWeight,
            plannedSlot: null,
          }],
        },
      },
      include: {
        furnace: true,
        batch: true,
        items: { include: { jobCard: true, item: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: runsheet,
      message: `Run sheet created: ${runsheet.runsheetNumber} for job card ${jobCard.jobCardNo}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.createInwardJobCardRunSheet = async (req, res) => {
  try {
    const {
      challanDate, fromPartyId, toPartyId,
      invoiceChNo, vehicleNo, deliveryPerson, dispatchDate, processingNotes,
      poNo, poDate, cillNo,
      items, handlingCharges, cgstRate, sgstRate, igstRate, manualChallanNo,
      jobCardNo: manualJobCardNo,
    } = req.body;

    if (!fromPartyId || !toPartyId)
      return res.status(400).json({ success: false, message: 'From and To party are required.' });

    const parsedItems = asArray(items);
    if (parsedItems.length === 0)
      return res.status(400).json({ success: false, message: 'At least one item is required.' });

    const subtotal = parsedItems.reduce((s, it) => s + toNum(it.amount, 0), 0);
    const handling = toNum(handlingCharges, 0);
    const total = subtotal + handling;
    const cgstRateVal = toNum(cgstRate, 0);
    const sgstRateVal = toNum(sgstRate, 0);
    const igstRateVal = toNum(igstRate, 0);
    const cgstAmt = toNum((total * cgstRateVal / 100).toFixed(2), 0);
    const sgstAmt = toNum((total * sgstRateVal / 100).toFixed(2), 0);
    const igstAmt = toNum((total * igstRateVal / 100).toFixed(2), 0);
    const grandTotalVal = toNum((total + cgstAmt + sgstAmt + igstAmt).toFixed(2), 0);

    const result = await withTransaction(prisma, async (tx) => {
      let challanNo;
      if (manualChallanNo && manualChallanNo.trim()) {
        const trimmed = manualChallanNo.trim();
        const existing = await tx.jobworkChallan.findUnique({ where: { challanNo: trimmed } });
        if (existing)
          throw new Error(`Challan No "${trimmed}" already exists.`);
        challanNo = trimmed;
      } else {
        challanNo = await generateChallanNo();
      }

      const challan = await tx.jobworkChallan.create({
        data: {
          challanNo,
          challanDate: new Date(challanDate || new Date()),
          fromPartyId: toInt(fromPartyId),
          toPartyId: toInt(toPartyId),
          invoiceChNo: invoiceChNo || null,
          transportMode: 'Hand Delivery',
          vehicleNo: vehicleNo || null,
          deliveryPerson: deliveryPerson || null,
          poNo: poNo || null,
          poDate: poDate ? new Date(poDate) : null,
          cillNo: cillNo || null,
          dispatchDate: dispatchDate ? new Date(dispatchDate) : null,
          processingNotes: processingNotes || null,
          subtotal,
          handlingCharges: handling,
          totalValue: total,
          cgstRate: cgstRateVal || null,
          cgstAmount: cgstAmt || null,
          sgstRate: sgstRateVal || null,
          sgstAmount: sgstAmt || null,
          igstRate: igstRateVal || null,
          igstAmount: igstAmt || null,
          grandTotal: grandTotalVal,
          createdById: req.user.id,
          items: {
            create: parsedItems.map(it => ({
              itemId: it.itemId ? toInt(it.itemId) : null,
              description: it.description || null,
              drawingNo: it.drawingNo || null,
              material: it.material || null,
              hrc: it.hrc || null,
              woNo: it.woNo || null,
              hsnCode: it.hsnCode || null,
              sacNo: it.sacNo || null,
              quantity: toNum(it.quantity, 0),
              qtyOut: it.qtyOut ? toNum(it.qtyOut, null) : null,
              uom: it.uom || 'KGS',
              weight: it.weight ? toNum(it.weight, null) : null,
              rate: toNum(it.rate, 0),
              amount: toNum(it.amount, 0),
              processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
              processName: it.processName || null,
            })),
          },
        },
        include: { items: true },
      });

      const firstItem = challan.items[0];
      if (!firstItem) throw new Error('Challan has no items.');

      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const jobCardPrefix = `${yy}${mm}`;
      let jobCardNo = manualJobCardNo;
      let attempts = 0;
      if (!jobCardNo) {
        do {
          const rand = String(Math.floor(1000 + Math.random() * 9000));
          jobCardNo = `${jobCardPrefix}${rand}`;
          const existing = await tx.jobCard.findUnique({ where: { jobCardNo } });
          if (!existing) break;
          attempts += 1;
        } while (attempts < 50);
      }

      let partId = null;
      if (firstItem.itemId) {
        partId = toInt(firstItem.itemId);
      } else {
        const genericItem = await tx.item.create({
          data: {
            partNo: `JOBCARD-${jobCardNo}`,
            description: firstItem.material || 'Job Card Material',
            hsnCode: firstItem.hsnCode || null,
          },
        });
        partId = genericItem.id;
      }

      const jobCard = await tx.jobCard.create({
        data: {
          jobCardNo,
          partId,
          customerId: toInt(fromPartyId),
          drawingNo: firstItem.drawingNo || null,
          hrcRange: firstItem.hrc || null,
          quantity: toInt(firstItem.quantity, 0),
          totalWeight: firstItem.weight ? toNum(firstItem.weight, null) : null,
          receivedDate: new Date(),
          issueDate: new Date(),
          createdAt: new Date(),
          status: 'SENT_FOR_JOBWORK',
          createdById: req.user.id,
        },
      });

      await tx.jobworkChallan.update({
        where: { id: challan.id },
        data: { jobCardId: jobCard.id },
      });

      const defaultFurnace = await tx.machine.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      });
      if (!defaultFurnace) throw new Error('No active furnace available to create run sheet.');

      const lastRS = await tx.vHTRunsheet.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { runsheetNumber: true },
      });
      const lastNum = lastRS?.runsheetNumber ? toInt(lastRS.runsheetNumber.split('/').pop(), 0) : 0;
      const runsheetNumber = `VHT/${new Date().getFullYear()}/${String(lastNum + 1).padStart(5, '0')}`;

      const runsheet = await tx.vHTRunsheet.create({
        data: {
          runsheetNumber,
          runDate: new Date(),
          furnaceId: defaultFurnace.id,
          batchId: null,
          status: 'DRAFT',
          createdById: req.user.id,
          items: {
            create: [{
              jobCardId: jobCard.id,
              itemId: jobCard.partId,
              customerName: jobCard.customer?.name || null,
              jobDescription: jobCard.part?.description || null,
              materialGrade: jobCard.part?.material || jobCard.dieMaterial || null,
              hrcRequired: jobCard.hrcRange || null,
              quantity: jobCard.quantity,
              weightKg: jobCard.totalWeight,
              plannedSlot: null,
            }],
          },
        },
        include: {
          furnace: true,
          batch: true,
          items: { include: { jobCard: true, item: true } },
        },
      });

      return { challan, jobCard, runsheet };
    });

    res.status(201).json({ success: true, data: result, message: 'Inward, job card and run sheet created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
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
    const { status, receivedDate, natureOfProcess, qtyReturned, reworkQty, scrapQtyKg, scrapDetails, processorSign } = value;

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
        ...(processorSign !== undefined && { processorSign: processorSign || null }),
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
    if (companyName) where.fromParty = { name: { contains: companyName } };

    const [total, challans] = await Promise.all([
      prisma.jobworkChallan.count({ where }),
      prisma.jobworkChallan.findMany({
        where,
        include: {
          fromParty: { select: { name: true } },
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
        // Dispatch Qty: logic (prefer real invoices, then fallback to manual qtyOut from challan item)
        const invoiceDispatch = dispatchedQtyByItem.get(it.id) || 0;
        const manualDispatch = toNum(it.qtyOut, 0);
        const dispatchQty = invoiceDispatch > 0 ? invoiceDispatch : manualDispatch;

        const balQty = Math.max(0, qty - dispatchQty);
        const deliveryPct = qty > 0 ? (dispatchQty / qty) * 100 : 0;
        const velocity = qty > 0 ? dispatchQty / qty : 0;
        const perfPct = deliveryPct;

        rows.push({
          srNo: rows.length + 1,
          companyName: ch.fromParty?.name || '-',
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
