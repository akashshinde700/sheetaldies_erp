const prisma = require('../utils/prisma');
const { jobworkStatusBody } = require('../validation/schemas');
const { toInt, toNum, asArray, toDateOrNull } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');
const { parseJsonIfString } = require('../utils/json');
const { withTransaction } = require('../utils/transactionHandler');
const { generateJobCardNoAtomic } = require('../utils/sequenceManager');

// Last-resort temp-time graph for auto-created run sheets when no default
// TempCycleTemplate is configured. Standard D2 vacuum-hardening staircase —
// mirrors HEAT_TREATMENT_CYCLES.D2 in frontend/src/data/heatTreatmentCycles.js.
const DEFAULT_RUNSHEET_CYCLE = [
  { tempC: 50,   holdMin: 50,  label: 'Room Temp' },
  { tempC: 550,  holdMin: 10,  label: 'Preheat 1' },
  { tempC: 750,  holdMin: 20,  label: 'Preheat 2' },
  { tempC: 950,  holdMin: 20,  label: 'Preheat 3' },
  { tempC: 1040, holdMin: 30,  label: 'Harden' },
  { tempC: 50,   holdMin: 50,  label: 'Cool to RT' },
  { tempC: 500,  holdMin: 120, label: 'Temper 1' },
  { tempC: 50,   holdMin: 50,  label: 'Cool to RT' },
  { tempC: 500,  holdMin: 120, label: 'Temper 2' },
  { tempC: 50,   holdMin: 50,  label: 'Final Cool' },
];

const generateChallanNo = async () => {
  const y  = new Date().getFullYear().toString().slice(-2);   // "26"
  const yn = String(toInt(y, 0) + 1);                        // "27"
  const prefix = `SVT/JW/${y}-${yn}/`;

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

  let challanNo;
  do {
    challanNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    const exists = await prisma.jobworkChallan.findUnique({ where: { challanNo } });
    if (!exists) break;
    nextSerial++;
  } while (nextSerial < 9999);

  return challanNo;
};

const generateInwardNo = async (db = prisma) => {
  const y  = new Date().getFullYear().toString().slice(-2);
  const yn = String(toInt(y, 0) + 1);
  const prefix = `INW/${y}-${yn}/`;

  const last = await db.jobworkChallan.findFirst({
    where:   { inwardNo: { startsWith: prefix } },
    orderBy: { inwardNo: 'desc' },
  });

  let nextSerial = 1;
  if (last?.inwardNo) {
    const parts = last.inwardNo.split('/');
    const lastSerial = toInt(parts[parts.length - 1], 0) || 0;
    nextSerial = lastSerial + 1;
  }

  let inwardNo;
  do {
    inwardNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    const exists = await db.jobworkChallan.findUnique({ where: { inwardNo } });
    if (!exists) break;
    nextSerial++;
  } while (nextSerial < 9999);

  return inwardNo;
};

// Sequential job card number, generated atomically via sequenceManager.js —
// never derived from the highest surviving row, since deleting that row
// would rewind the counter and reissue its number.
const generateJobCardNoSeq = async (tx) => generateJobCardNoAtomic(tx || prisma);

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
      // inwardNo pehle yahan tha hi nahi — "INW/26-27/0004" dhoondhne pe kuch
      // nahi milta tha, kyunki sirf challanNo dekha jata tha.
      and.push({
        OR: [
          { challanNo: { contains: searchText } },
          { inwardNo: { contains: searchText } },
          { fromParty: { is: { name: { contains: searchText } } } },
          { toParty: { is: { name: { contains: searchText } } } },
          { jobCard: { is: { jobCardNo: { contains: searchText } } } },
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
    const include = {
      fromParty: { select: { name: true } },
      toParty:   { select: { name: true } },
      jobCard:   { select: { id: true, jobCardNo: true } },
      // A challan's job cards hang off its ITEMS (a challan can be split across
      // several). The direct `jobCard` relation is almost always null, which is
      // why the list's Job Card column showed "—" even after a card was made.
      items:     { include: { jobCard: { select: { id: true, jobCardNo: true } } } },
      createdBy: { select: { name: true } },
    };

    let challans;
    let total;

    if (searchText && !exportAll) {
      // Newest-first is the wrong order for a search: typing "0001" put a newer
      // challan that merely contains those digits above the one actually being
      // looked for. Rank the matches — exact number, then starts-with, then
      // anywhere, then a party/job-card hit — and only fall back to date
      // within a rank. A number search returns few rows, so ranking the whole
      // match set in memory keeps paging correct.
      const RANK_CAP = 500;
      const matches = await prisma.jobworkChallan.findMany({
        where, include,
        orderBy: { createdAt: 'desc' },
        take: RANK_CAP,
      });

      const q = searchText.toLowerCase();
      const rank = (c) => {
        const nums = [c.inwardNo, c.challanNo].filter(Boolean).map(v => String(v).toLowerCase());
        if (nums.some(v => v === q)) return 0;
        if (nums.some(v => v.startsWith(q))) return 1;
        if (nums.some(v => v.endsWith(q))) return 2;
        if (nums.some(v => v.includes(q))) return 3;
        if (String(c.jobCard?.jobCardNo || '').toLowerCase().includes(q)) return 4;
        return 5;   // party name pe match
      };

      matches.sort((a, b) => {
        const d = rank(a) - rank(b);
        if (d !== 0) return d;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      total = await prisma.jobworkChallan.count({ where });
      challans = matches.slice(finalSkip, finalSkip + finalLimit);
    } else {
      [challans, total] = await Promise.all([
        prisma.jobworkChallan.findMany({
          where, include,
          orderBy: { createdAt: 'desc' },
          skip: finalSkip,
          take: finalLimit,
        }),
        prisma.jobworkChallan.count({ where }),
      ]);
    }


    // Roll the per-item cards up to the challan so the list does not have to.
    const withCards = challans.map((c) => {
      const map = new Map();
      if (c.jobCard) map.set(c.jobCard.id, c.jobCard);
      for (const it of c.items || []) {
        if (it.jobCard) map.set(it.jobCard.id, it.jobCard);
      }
      const jobCards = [...map.values()];
      const itemsTotal = (c.items || []).length;
      const itemsWithCard = (c.items || []).filter(it => it.jobCardId).length;
      return {
        ...c,
        jobCards,
        // An inward is often job-carded a few items at a time, so 'DONE' means
        // every item has a card — not merely that one was made. Anything in
        // between stays 'PARTIAL' so a half-finished inward is never mistaken
        // for a finished one.
        jobCardStatus: itemsTotal === 0 || itemsWithCard === 0
          ? 'NONE'
          : (itemsWithCard < itemsTotal ? 'PARTIAL' : 'DONE'),
        jobCardItemCount: itemsWithCard,
        itemCount: itemsTotal,
      };
    });

    res.json(formatListResponse(withCards, total, exportAll ? 1 : page, withCards.length));
  } catch (err) {
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Server error.'));
  }
};

// ── Get single Challan ────────────────────────────────────────
const CHALLAN_FULL_INCLUDE = {
  fromParty: true,
  toParty:   true,
  jobCard:   { include: { part: true } },
  items:     {
    include: {
      item: true,
      processType: { select: { id: true, name: true, code: true, hsnSacCode: true, pricePerKg: true } },
      jobCard: { select: { id: true, jobCardNo: true, status: true, totalWeight: true } },
      productionEntries: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  },
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

    // Enrich items with production summary
    const enrichedItems = challan.items.map(it => {
      const assignedQty  = Number(it.quantity || 0);
      const completedQty = (it.productionEntries || []).reduce((s, e) => s + Number(e.completedQty || 0), 0);
      const pendingQty   = Math.max(0, assignedQty - completedQty);
      let itemStatus = 'PENDING';
      if (completedQty >= assignedQty && assignedQty > 0) itemStatus = 'COMPLETED';
      else if (completedQty > 0) itemStatus = 'PARTIAL';
      return { ...it, assignedQty, completedQty, pendingQty, itemStatus };
    });

    // Pending items: not yet linked to any job card
    const pendingItems = enrichedItems
      .filter(it => !it.jobCardId)
      .map(it => ({
        id: it.id,
        description: it.description,
        drawingNo: it.drawingNo,
        material: it.material,
        processName: it.processName,
        processTypeId: it.processTypeId,
        hrc: it.hrc,
        quantity: it.quantity,
        weight: it.weight,
        rate: it.rate,
        amount: it.amount,
        assignedQty: it.assignedQty,
        completedQty: it.completedQty,
        pendingQty: it.pendingQty,
        itemStatus: it.itemStatus,
      }));

    // Collect unique job cards linked to this challan's items, with item count
    const jcMap = {};
    for (const it of enrichedItems) {
      if (it.jobCard) {
        if (!jcMap[it.jobCard.id]) {
          jcMap[it.jobCard.id] = { ...it.jobCard, itemCount: 0, itemStatuses: [] };
        }
        jcMap[it.jobCard.id].itemCount++;
        jcMap[it.jobCard.id].itemStatuses.push(it.itemStatus);
      }
    }

    // Inward weight summary — use stored totalInwardWeight, fallback to item sum for old data
    const inwardTotalWeight = Number(challan.totalInwardWeight || 0) ||
      challan.items.reduce((s, it) => s + Number(it.weight || 0), 0);
    const allLinkedJC = Object.values(jcMap);
    const consumedWeight = allLinkedJC.reduce((s, jc) => s + Number(jc.totalWeight || 0), 0);

    res.json({
      success: true,
      data: {
        ...challan,
        items: enrichedItems,
        pendingItems,
        relatedJobCards: allLinkedJC,
        weightSummary: {
          inwardTotalWeight,
          consumedWeight,
          remainingWeight: Math.max(0, inwardTotalWeight - consumedWeight),
          consumptionPct: inwardTotalWeight > 0
            ? Math.min(100, Number(((consumedWeight / inwardTotalWeight) * 100).toFixed(1)))
            : 0,
          fullyConsumed: inwardTotalWeight > 0 && consumedWeight >= inwardTotalWeight,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getByChallanNo = async (req, res) => {
  try {
    // Staff read whichever number is printed in front of them, and that is
    // usually the inward no ("INW/26-27/0002"), not the customer's challan no.
    // Accept either rather than making them work out which is which.
    const ref = String(req.query.ref || req.params.challanNo || '').trim();
    if (!ref) return res.status(400).json({ success: false, message: 'Inward or challan number required.' });
    const challan = await prisma.jobworkChallan.findFirst({
      where:   { OR: [{ challanNo: ref }, { inwardNo: ref }] },
      include: CHALLAN_FULL_INCLUDE,
    });
    if (!challan) return res.status(404).json({ success: false, message: `No inward or challan found for "${ref}".` });
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
      manualChallanNo, totalInwardWeight,
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
      const created = await tx.jobworkChallan.create({
        data: {
          challanNo,
          inwardNo:        await generateInwardNo(tx),
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
          processingNotes:   processingNotes || null,
          totalInwardWeight: totalInwardWeight ? toNum(totalInwardWeight, null) : null,
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

      return created;
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
      totalInwardWeight,
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
        const prefix = `SVT/JW/${y}-${yn}/`;
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
          inwardNo: await generateInwardNo(tx),
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
          processingNotes:   processingNotes || 'Inward entry.',
          totalInwardWeight: totalInwardWeight ? toNum(totalInwardWeight, null) : null,
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
              dispatchDate: it.dispatchDate ? new Date(it.dispatchDate) : null,
              uom: it.uom || 'KGS',
              weight: it.weight ? toNum(it.weight, null) : null,
              rate: toNum(it.rate, 0),
              amount: toNum(it.amount, 0),
              pcQty: it.pcQty ? toNum(it.pcQty, null) : null,
              lotQty: it.lotQty ? toNum(it.lotQty, null) : null,
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
          include: { items: { where: { jobCardId: null } }, fromParty: true },
        })
      : await prisma.jobworkChallan.findFirst({
          // Same here: the number on the paper may be the inward no.
          where: (() => { const ref = String(challanNo).trim();
                          return { OR: [{ challanNo: ref }, { inwardNo: ref }] }; })(),
          include: { items: { where: { jobCardId: null } }, fromParty: true },
        });
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' });
    if (challan.jobCardId) return res.status(400).json({ success: false, message: 'Job card already exists for this challan.' });

    const firstItem = challan.items[0];
    if (!firstItem) return res.status(400).json({ success: false, message: 'Challan has no items.' });

    // ✅ Transaction: Create Job Card and Link to Challan
    const result = await withTransaction(prisma, async (tx) => {
      // 1️⃣ Generate Job Card Number (sequential)
      const jobCardNo = await generateJobCardNoSeq(tx);

      // 2️⃣ Resolve partId (nullable — no auto-create)
      const partId = firstItem.itemId ? toInt(firstItem.itemId) : null;

      // Aggregate across ALL pending items on this challan, not just the
      // first — a multi-item inward otherwise loses every item but the
      // first from the job card's quantity/weight and (previously) from
      // per-item traceability entirely.
      const totalQty    = challan.items.reduce((s, ci) => s + toNum(ci.quantity, 0), 0);
      const totalWeight = challan.items.reduce((s, ci) => s + toNum(ci.weight, 0), 0);

      // 3️⃣ Create Job Card
      const jobCard = await tx.jobCard.create({
        data: {
          jobCardNo,
          partId,
          customerId: challan.fromPartyId,
          drawingNo: firstItem.drawingNo || null,
          hrcRange: firstItem.hrc || null,
          quantity: toInt(totalQty, 0),
          totalWeight: totalWeight > 0 ? totalWeight : null,
          receivedDate: new Date(),
          issueDate: new Date(),
          issueBy: challan.issuedBy || null,
          createdAt: new Date(),
          status: 'SENT_FOR_JOBWORK',
          createdById: req.user.id,
        },
      });

      // 4️⃣ Link every pending challan item to the new job card, plus the
      // challan itself (backward-compat direct relation).
      await tx.challanItem.updateMany({
        where: { id: { in: challan.items.map((ci) => ci.id) } },
        data: { jobCardId: jobCard.id, itemStatus: 'ASSIGNED' },
      });
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

// ── Create Job Card from selected Challan Items ─────────────────
exports.createJobCardFromItems = async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, message: 'itemIds array is required.' });
    }

    // Fetch the challan items and associated challan
    const items = await prisma.challanItem.findMany({
      where: { id: { in: itemIds.map((i) => toInt(i)) } },
      include: { challan: true },
    });
    if (!items || items.length === 0) return res.status(404).json({ success: false, message: 'Challan items not found.' });

    const challan = items[0].challan;
    if (!challan) return res.status(404).json({ success: false, message: 'Parent challan not found for items.' });

    // Transaction: create job card and link selected challan items
    const result = await withTransaction(prisma, async (tx) => {
      // generate jobCardNo (sequential)
      const jobCardNo = await generateJobCardNoSeq(tx);

      // Resolve partId (nullable — no auto-create)
      const firstItem = items[0];
      const partId = firstItem.itemId ? toInt(firstItem.itemId) : null;

      // aggregate quantity from selected items — weight NOT auto-filled (user enters manually)
      const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);

      const jobCard = await tx.jobCard.create({
        data: {
          jobCardNo,
          partId,
          customerId: challan.fromPartyId,
          drawingNo: firstItem.drawingNo || null,
          hrcRange: firstItem.hrc || null,
          quantity: toInt(totalQty, 0),
          totalWeight: null,
          receivedDate: new Date(),
          issueDate: new Date(),
          createdAt: new Date(),
          status: 'SENT_FOR_JOBWORK',
          createdById: req.user.id,
        },
      });

      // Link selected challan items to this job card
      await tx.challanItem.updateMany({
        where: { id: { in: itemIds.map((i) => toInt(i)) } },
        data: { jobCardId: jobCard.id, itemStatus: 'ASSIGNED' },
      });

      return { challan, jobCard, itemsCount: items.length };
    });

    res.status(201).json({ success: true, data: result, message: `Job card created: ${result.jobCard.jobCardNo}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── List Pending Challan Items for an Inward/Challan ────────────
exports.getPendingItems = async (req, res) => {
  try {
    const challanId = req.params.id ? toInt(req.params.id) : null;
    if (!challanId) return res.status(400).json({ success: false, message: 'Challan id is required in params.' });

    const items = await prisma.challanItem.findMany({
      where: { challanId, itemStatus: 'PENDING' },
      orderBy: { id: 'asc' },
    });

    res.json({ success: true, data: items });
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

    const jcInclude = {
      customer: true,
      part: true,
      challanItemLinks: { select: { processTypeId: true }, take: 1 },
    };
    const jobCard = jobCardId
      ? await prisma.jobCard.findUnique({ where: { id: toInt(jobCardId) }, include: jcInclude })
      : await prisma.jobCard.findFirst({ where: { jobCardNo: String(jobCardNo).trim() }, include: jcInclude });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found.' });

    // Seed the temperature-time graph from the default cycle template so the
    // auto-created run sheet (and its print) isn't blank. Prefer the template
    // marked default for this job's process; fall back to the general default.
    const jcProcessTypeId = jobCard.challanItemLinks?.[0]?.processTypeId || null;
    let tempGraphPoints = null;
    try {
      let tpl = jcProcessTypeId
        ? await prisma.tempCycleTemplate.findFirst({ where: { isDefault: true, isActive: true, processTypeId: jcProcessTypeId } })
        : null;
      if (!tpl) tpl = await prisma.tempCycleTemplate.findFirst({ where: { isDefault: true, isActive: true, processTypeId: null } });
      tempGraphPoints = tpl?.data || DEFAULT_RUNSHEET_CYCLE;
    } catch { tempGraphPoints = DEFAULT_RUNSHEET_CYCLE; }

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
        ...(tempGraphPoints ? { tempGraphPoints } : {}),
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

// ── Inward + one Job Card per item ──────────────────────────
exports.createInwardWithJobCards = async (req, res) => {
  try {
    const {
      challanDate, fromPartyId, toPartyId,
      invoiceChNo, vehicleNo, deliveryPerson, issuedBy, processingNotes,
      poNo, poDate, cillNo, receivedDate,
      items, handlingCharges, cgstRate, sgstRate, igstRate, manualChallanNo,
      manualInwardNo, totalInwardWeight,
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
      // 1. Challan No + Inward No
      let challanNo;
      if (manualChallanNo && manualChallanNo.trim()) {
        const trimmed = manualChallanNo.trim();
        const existing = await tx.jobworkChallan.findUnique({ where: { challanNo: trimmed } });
        if (existing) throw new Error(`Challan No "${trimmed}" already exists.`);
        challanNo = trimmed;
      } else {
        challanNo = await generateChallanNo();
      }

      let inwardNo;
      if (manualInwardNo && manualInwardNo.trim()) {
        const trimmed = manualInwardNo.trim();
        const existing = await tx.jobworkChallan.findUnique({ where: { inwardNo: trimmed } });
        if (existing) throw new Error(`Inward No "${trimmed}" already exists.`);
        inwardNo = trimmed;
      } else {
        inwardNo = await generateInwardNo(tx);
      }

      // 2. Create challan with items
      const challan = await tx.jobworkChallan.create({
        data: {
          challanNo,
          inwardNo,
          challanDate: new Date(challanDate || new Date()),
          fromPartyId: toInt(fromPartyId),
          toPartyId: toInt(toPartyId),
          invoiceChNo: invoiceChNo || null,
          transportMode: 'Hand Delivery',
          vehicleNo: vehicleNo || null,
          deliveryPerson: deliveryPerson || null,
          issuedBy: issuedBy || null,
          poNo: poNo || null,
          poDate: poDate ? new Date(poDate) : null,
          cillNo: cillNo || null,
          receivedDate: receivedDate ? new Date(receivedDate) : null,
          processingNotes:   processingNotes || null,
          totalInwardWeight: totalInwardWeight ? toNum(totalInwardWeight, null) : null,
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
              dispatchDate: it.dispatchDate ? new Date(it.dispatchDate) : null,
              uom: it.uom || 'KGS',
              weight: it.weight ? toNum(it.weight, null) : null,
              rate: toNum(it.rate, 0),
              amount: toNum(it.amount, 0),
              pcQty: it.pcQty ? toNum(it.pcQty, null) : null,
              lotQty: it.lotQty ? toNum(it.lotQty, null) : null,
              processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
              processName: it.processName || null,
            })),
          },
        },
        include: { items: true },
      });

      return challan;
    });

    res.status(201).json({
      success: true,
      data: { challan: result },
      message: `Challan ${result.challanNo} created. Select combinations to create Job Cards.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
};

// ── Create ONE Job Card for selected item IDs on an existing Challan ──
exports.createJobCardsForChallan = async (req, res) => {
  try {
    const challanId = toInt(req.params.id);
    const { itemIds } = req.body; // [id1, id2, ...]

    if (!Array.isArray(itemIds) || itemIds.length === 0)
      return res.status(400).json({ success: false, message: 'Select at least one item.' });

    const challan = await prisma.jobworkChallan.findUnique({
      where: { id: challanId },
      include: {
        items: { where: { jobCardId: null } },
        fromParty: { select: { id: true, name: true, address: true, city: true, state: true, pinCode: true } },
      },
    });
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' });

    const parsedIds = itemIds.map(id => toInt(id));
    const selectedItems = challan.items.filter(ci => parsedIds.includes(ci.id));
    if (selectedItems.length === 0)
      return res.status(400).json({ success: false, message: 'No valid pending items found for selected IDs.' });

    const jobCard = await withTransaction(prisma, async (tx) => {
      const jcNo = await generateJobCardNoSeq(tx);
      const totalQty = selectedItems.reduce((s, ci) => s + toNum(ci.quantity, 0), 0);
      const totalWeight = selectedItems.reduce((s, ci) => s + toNum(ci.weight, 0), 0);
      const first = selectedItems[0];

      // Resolve partId (nullable — no auto-create)
      const partId = first.itemId ? first.itemId : null;

      const fp = challan.fromParty;
      const custAddr = fp ? [fp.address, fp.city, fp.state, fp.pinCode].filter(Boolean).join(', ') : null;
      const created = await tx.jobCard.create({
        data: {
          jobCardNo: jcNo,
          partId,
          customerId: challan.fromPartyId,
          customerNameSnapshot: fp?.name || null,
          customerAddressSnapshot: custAddr || null,
          yourNo: challan.invoiceChNo || null,
          drawingNo: first.drawingNo || null,
          hrcRange: first.hrc || null,
          dieMaterial: first.material || null,
          quantity: toInt(totalQty, 0),
          totalWeight: totalWeight > 0 ? totalWeight : null,
          receivedDate: new Date(),
          issueDate: new Date(),
          issueBy: challan.issuedBy || null,
          status: 'SENT_FOR_JOBWORK',
          createdById: req.user.id,
        },
      });

      // Link all selected items to this job card
      for (const ci of selectedItems) {
        await tx.challanItem.update({ where: { id: ci.id }, data: { jobCardId: created.id, itemStatus: 'ASSIGNED' } });
      }

      // Link challan → first job card (backward compat)
      if (!challan.jobCardId) {
        await tx.jobworkChallan.update({ where: { id: challanId }, data: { jobCardId: created.id } });
      }

      return created;
    });

    res.status(201).json({
      success: true,
      data: jobCard,
      message: `Job Card ${jobCard.jobCardNo} created with ${selectedItems.length} item(s).`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
};

exports.createInwardJobCardRunSheet = async (req, res) => {
  try {
    const {
      challanDate, fromPartyId, toPartyId,
      invoiceChNo, vehicleNo, deliveryPerson, dispatchDate, processingNotes,
      poNo, poDate, cillNo, receivedDate,
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
          inwardNo: await generateInwardNo(tx),
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
          receivedDate: receivedDate ? new Date(receivedDate) : null,
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
              dispatchDate: it.dispatchDate ? new Date(it.dispatchDate) : null,
              uom: it.uom || 'KGS',
              weight: it.weight ? toNum(it.weight, null) : null,
              rate: toNum(it.rate, 0),
              amount: toNum(it.amount, 0),
              pcQty: it.pcQty ? toNum(it.pcQty, null) : null,
              lotQty: it.lotQty ? toNum(it.lotQty, null) : null,
              processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
              processName: it.processName || null,
            })),
          },
        },
        include: { items: true },
      });

      const firstItem = challan.items[0];
      if (!firstItem) throw new Error('Challan has no items.');

      const jobCardNo = manualJobCardNo || await generateJobCardNoSeq(tx);

      const partId = firstItem.itemId ? toInt(firstItem.itemId) : null;

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
        include: {
          customer: true,
          part: true,
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

      // Seed the temp-time graph from the default cycle template (see
      // createRunSheetFromJobCard) so the auto-created run sheet isn't blank.
      let rsTempGraph = null;
      try {
        const ptId = challan.items[0]?.processTypeId || null;
        let tpl = ptId
          ? await tx.tempCycleTemplate.findFirst({ where: { isDefault: true, isActive: true, processTypeId: ptId } })
          : null;
        if (!tpl) tpl = await tx.tempCycleTemplate.findFirst({ where: { isDefault: true, isActive: true, processTypeId: null } });
        rsTempGraph = tpl?.data || DEFAULT_RUNSHEET_CYCLE;
      } catch { rsTempGraph = DEFAULT_RUNSHEET_CYCLE; }

      const runsheet = await tx.vHTRunsheet.create({
        data: {
          runsheetNumber,
          runDate: new Date(),
          furnaceId: defaultFurnace.id,
          batchId: null,
          status: 'PLANNED',
          createdById: req.user.id,
          ...(rsTempGraph ? { tempGraphPoints: rsTempGraph } : {}),
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
      challanNo: newChallanNo,
      challanDate, jobCardId, fromPartyId, toPartyId,
      transportMode, vehicleNo, deliveryPerson, issuedBy, dispatchDate, dueDate, processingNotes,
      items, handlingCharges,
      cgstRate, sgstRate, igstRate, totalInwardWeight,
    } = req.body;

    const existingChallan = await prisma.jobworkChallan.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existingChallan) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    // Validate new challanNo uniqueness (only if changed)
    if (newChallanNo && newChallanNo.trim() && newChallanNo.trim() !== existingChallan.challanNo) {
      const conflict = await prisma.jobworkChallan.findUnique({ where: { challanNo: newChallanNo.trim() } });
      if (conflict) return res.status(400).json({ success: false, message: `Challan No "${newChallanNo.trim()}" already exists.` });
    }

    let parsedItems = null;
    if (items !== undefined) {
      try {
        parsedItems = parseJsonIfString(items, { fieldName: 'items', defaultValue: [] });
      } catch (e) {
        if (e.code === 'INVALID_JSON') {
          return res.status(400).json({ success: false, code: e.code, message: e.message });
        }
        throw e;
      }
    }

    const itemsForCalc = parsedItems !== null
      ? parsedItems
      : existingChallan.items.map((it) => ({ amount: toNum(it.amount, 0) }));

    const subtotal = parsedItems !== null
      ? itemsForCalc.reduce((s, it) => s + toNum(it.amount, 0), 0)
      : toNum(existingChallan.subtotal, 0);

    const handling = handlingCharges !== undefined
      ? toNum(handlingCharges, 0)
      : toNum(existingChallan.handlingCharges, 0);

    const cgstRateVal = cgstRate !== undefined
      ? toNum(cgstRate, 0)
      : existingChallan.cgstRate !== null
        ? toNum(existingChallan.cgstRate, 0)
        : null;
    const sgstRateVal = sgstRate !== undefined
      ? toNum(sgstRate, 0)
      : existingChallan.sgstRate !== null
        ? toNum(existingChallan.sgstRate, 0)
        : null;
    const igstRateVal = igstRate !== undefined
      ? toNum(igstRate, 0)
      : existingChallan.igstRate !== null
        ? toNum(existingChallan.igstRate, 0)
        : null;

    const total = subtotal + handling;
    const cgstAmt = cgstRateVal !== null ? toNum((total * cgstRateVal / 100).toFixed(2), 0) : null;
    const sgstAmt = sgstRateVal !== null ? toNum((total * sgstRateVal / 100).toFixed(2), 0) : null;
    const igstAmt = igstRateVal !== null ? toNum((total * igstRateVal / 100).toFixed(2), 0) : null;
    const grandTotalVal = toNum((total + (cgstAmt || 0) + (sgstAmt || 0) + (igstAmt || 0)).toFixed(2), 0);

    // Delete old items and recreate only when items are explicitly supplied
    if (items !== undefined) {
      await prisma.challanItem.deleteMany({ where: { challanId: id } });
    }

    const challan = await prisma.jobworkChallan.update({
      where: { id },
      data: {
        ...(newChallanNo && newChallanNo.trim() && { challanNo: newChallanNo.trim() }),
        ...(challanDate      && { challanDate:     new Date(challanDate) }),
        ...(jobCardId        !== undefined && { jobCardId:      jobCardId ? toInt(jobCardId) : null }),
        ...(fromPartyId      && { fromPartyId:     toInt(fromPartyId) }),
        ...(toPartyId        && { toPartyId:       toInt(toPartyId) }),
        ...(transportMode    !== undefined && { transportMode }),
        ...(vehicleNo        !== undefined && { vehicleNo }),
        ...(deliveryPerson   !== undefined && { deliveryPerson }),
        ...(issuedBy         !== undefined && { issuedBy }),
        ...(dispatchDate     !== undefined && { dispatchDate:   dispatchDate ? new Date(dispatchDate) : null }),
        ...(dueDate          !== undefined && { dueDate:        dueDate      ? new Date(dueDate)      : null }),
        ...(processingNotes  !== undefined && { processingNotes }),
        ...(totalInwardWeight !== undefined && { totalInwardWeight: totalInwardWeight !== null && totalInwardWeight !== '' ? toNum(totalInwardWeight, null) : null }),
        ...(items !== undefined && { subtotal }),
        ...(handlingCharges !== undefined && { handlingCharges: handling }),
        ...((items !== undefined || handlingCharges !== undefined || cgstRate !== undefined || sgstRate !== undefined || igstRate !== undefined) && {
          totalValue: total,
          cgstRate: cgstRateVal !== null ? cgstRateVal : existingChallan.cgstRate,
          cgstAmount: cgstAmt,
          sgstRate: sgstRateVal !== null ? sgstRateVal : existingChallan.sgstRate,
          sgstAmount: sgstAmt,
          igstRate: igstRateVal !== null ? igstRateVal : existingChallan.igstRate,
          igstAmount: igstAmt,
          grandTotal: grandTotalVal,
        }),
        ...(parsedItems !== null && {
          items: {
            create: parsedItems.map(it => ({
            itemId:        it.itemId    ? toInt(it.itemId) : null,
            description:   it.description || null,
            drawingNo:     it.drawingNo   || null,
            material:      it.material    || null,
            hrc:           it.hrc         || null,
            woNo:          it.woNo        || null,
            hsnCode:       it.hsnCode     || null,
            sacNo:         it.sacNo       || null,
            quantity:      toNum(it.quantity, 0),
            qtyOut:        it.qtyOut      ? toNum(it.qtyOut, null) : null,
            uom:           it.uom         || 'KGS',
            weight:        it.weight      ? toNum(it.weight, null) : null,
            rate:          toNum(it.rate, 0),
            amount:        toNum(it.amount, 0),
            pcQty:         it.pcQty       ? toNum(it.pcQty, null)  : null,
            lotQty:        it.lotQty      ? toNum(it.lotQty, null) : null,
            processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
            processName:   it.processName || null,
          })),
        },
      }),
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
          items: {
            include: { jobCard: { select: { jobCardNo: true, createdAt: true } } },
          },
          taxInvoices: {
            include: { items: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

      // One row per inward challan (not per item) — aggregate all its items together.
      let qty = 0;
      let weight = 0;
      let dispatchQty = 0;
      const materials = new Set();
      let jobcardNo = ch.jobCard?.jobCardNo || '-';
      let jobcardDate = ch.jobCard?.createdAt || null;

      for (const it of ch.items) {
        qty += toNum(it.quantity, 0);
        weight += toNum(it.weight, 0);
        const invoiceDispatch = dispatchedQtyByItem.get(it.id) || 0;
        const manualDispatch = toNum(it.qtyOut, 0);
        dispatchQty += invoiceDispatch > 0 ? invoiceDispatch : manualDispatch;
        if (it.material) materials.add(it.material);
        if (jobcardNo === '-' && it.jobCard?.jobCardNo) {
          jobcardNo = it.jobCard.jobCardNo;
          jobcardDate = it.jobCard.createdAt;
        }
      }

      const balQty = Math.max(0, qty - dispatchQty);
      const deliveryPct = qty > 0 ? (dispatchQty / qty) * 100 : 0;
      const velocity = qty > 0 ? dispatchQty / qty : 0;

      rows.push({
        srNo: rows.length + 1,
        companyName: ch.fromParty?.name || '-',
        material: materials.size ? Array.from(materials).join(', ') : '-',
        inwardNo: ch.inwardNo || '-',
        challanNo: ch.challanNo,
        challanDate: ch.challanDate,
        materialInDate: ch.receivedDate || ch.challanDate,
        qty,
        weight,
        jobcardNo,
        jobcardDate,
        invoiceNos: (ch.taxInvoices || []).map((x) => x.invoiceNo).join(', '),
        dispatchQty,
        dispatchDate: ch.dispatchDate || null,
        balQty,
        velocity: toNum(velocity.toFixed(2), 0),
        delPerfPct: toNum(deliveryPct.toFixed(2), 0),
        deliveryPct: toNum(deliveryPct.toFixed(2), 0),
        challanId: ch.id,
        challanItemId: ch.items[0]?.id ?? ch.id,
        itemDescription: ch.items.map((it) => it.description).filter(Boolean).join(', '),
        itemCount: ch.items.length,
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

exports.updateItem = async (req, res) => {
  try {
    const itemId = toInt(req.params.itemId);
    const { weight, quantity, description, partName, material, drawingNo, drawingNoLabel, hrc, processName, processTypeId, qtyOut } = req.body;
    const data = {};
    if (weight !== undefined) data.weight = weight !== '' && weight !== null ? toNum(weight, null) : null;
    if (quantity !== undefined) data.quantity = toNum(quantity, 0);
    if (description !== undefined) data.description = description || null;
    if (partName !== undefined) data.description = partName || null;
    if (material !== undefined) data.material = material || null;
    if (drawingNo !== undefined) data.drawingNo = drawingNo || null;
    if (drawingNoLabel !== undefined) data.drawingNoLabel = drawingNoLabel || null;
    if (hrc !== undefined) data.hrc = hrc || null;
    if (processName !== undefined) data.processName = processName || null;
    if (processTypeId !== undefined) data.processTypeId = processTypeId ? toInt(processTypeId) : null;

    // Validate qtyOut (dispatch qty) cannot exceed completedQty
    if (qtyOut !== undefined && qtyOut !== null && qtyOut !== '') {
      const qtyOutVal = toNum(qtyOut, 0);
      if (qtyOutVal > 0) {
        const item = await prisma.challanItem.findUnique({
          where: { id: itemId },
          include: { productionEntries: true },
        });
        if (item) {
          const completedQty = item.productionEntries.reduce((s, e) => s + Number(e.completedQty || 0), 0);
          if (qtyOutVal > completedQty) {
            return res.status(400).json({
              success: false,
              message: `Dispatch qty (${qtyOutVal}) cannot exceed completed qty (${completedQty.toFixed(3)}).`,
            });
          }
        }
      }
      data.qtyOut = toNum(qtyOut, null);
    }

    const item = await prisma.challanItem.update({ where: { id: itemId }, data });
    res.json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update item.' });
  }
};

// ── Add a new item to an existing inward challan ──────────────
exports.addItem = async (req, res) => {
  try {
    const challanId = toInt(req.params.id);
    const {
      description, drawingNo, material, hrc, woNo, hsnCode, sacNo,
      quantity, weight, rate, uom, processTypeId, processName,
    } = req.body;

    if (!description?.trim() && !material?.trim())
      return res.status(400).json({ success: false, message: 'Description or material is required.' });

    const challan = await prisma.jobworkChallan.findUnique({ where: { id: challanId } });
    if (!challan) return res.status(404).json({ success: false, message: 'Inward challan not found.' });

    const qty     = toNum(quantity, 0);
    const wt      = weight ? toNum(weight, null) : null;
    const rt      = toNum(rate, 0);
    const uomVal  = uom || 'KGS';
    // Amount basis follows the item's own uom — KGS is billed by weight,
    // everything else (NOS/PCS/LOT) by quantity — matching InwardEntryForm's
    // and InvoiceForm's calcAmount rule. Using a bare "weight > 0" heuristic
    // here (ignoring uom) would misprice a piece-priced item that happens to
    // also carry an incidental weight value.
    const base = (uomVal === 'KGS' && wt > 0) ? wt : qty;

    const item = await prisma.challanItem.create({
      data: {
        challanId,
        description:   description || null,
        drawingNo:     drawingNo   || null,
        material:      material    || null,
        hrc:           hrc         || null,
        woNo:          woNo        || null,
        hsnCode:       hsnCode     || null,
        sacNo:         sacNo       || null,
        quantity:      qty,
        weight:        wt,
        rate:          rt,
        amount:        base * rt,
        uom:           uomVal,
        processTypeId: processTypeId ? toInt(processTypeId) : null,
        processName:   processName || null,
      },
    });
    res.status(201).json({ success: true, data: item, message: 'Item added.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add item.' });
  }
};

// ── Remove an item from an inward challan ──────────────────────
exports.removeItem = async (req, res) => {
  try {
    const itemId = toInt(req.params.itemId);
    const item = await prisma.challanItem.findUnique({
      where: { id: itemId },
      include: { invoiceItems: true, dispatchItems: true, productionEntries: true, certItems: true },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    if (item.jobCardId)
      return res.status(409).json({ success: false, message: 'Cannot remove: item is assigned to a job card. Remove it from the job card first.' });

    const blockers = item.invoiceItems.length + item.dispatchItems.length + item.productionEntries.length + item.certItems.length;
    if (blockers > 0)
      return res.status(409).json({ success: false, message: 'Cannot remove: item has linked invoice, dispatch, production or certificate records.' });

    await prisma.challanItem.delete({ where: { id: itemId } });
    res.json({ success: true, message: 'Item removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove item.' });
  }
};

// ── Remove Items from a Job Card (return to PENDING) ─────────
exports.removeItemsFromJobCard = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.id);
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0)
      return res.status(400).json({ success: false, message: 'itemIds array is required.' });

    const parsedIds = itemIds.map(id => toInt(id));

    // Verify these items actually belong to this job card
    const items = await prisma.challanItem.findMany({
      where: { id: { in: parsedIds }, jobCardId },
    });
    if (items.length === 0)
      return res.status(400).json({ success: false, message: 'No matching items found on this job card.' });

    await prisma.challanItem.updateMany({
      where: { id: { in: items.map(i => i.id) } },
      data: { jobCardId: null, itemStatus: 'PENDING' },
    });

    res.json({ success: true, message: `${items.length} item(s) returned to pending.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteJobwork = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    await prisma.jobworkChallan.delete({ where: { id } });
    res.json({ success: true, message: 'Inward deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete inward.' });
  }
};

exports.issuedBySuggestions = async (req, res) => {
  try {
    const rows = await prisma.jobworkChallan.findMany({
      where: { issuedBy: { not: null } },
      select: { issuedBy: true },
      distinct: ['issuedBy'],
      orderBy: { issuedBy: 'asc' },
    });
    const suggestions = rows.map(r => r.issuedBy).filter(Boolean);
    res.json({ success: true, data: suggestions });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.materialSuggestions = async (req, res) => {
  try {
    const rows = await prisma.challanItem.findMany({
      where: { material: { not: null } },
      select: { material: true },
      distinct: ['material'],
      orderBy: { material: 'asc' },
    });
    const suggestions = [...new Set(rows.map(r => r.material?.trim()).filter(Boolean))];
    res.json({ success: true, data: suggestions });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.partNameSuggestions = async (req, res) => {
  try {
    const rows = await prisma.challanItem.findMany({
      where: { description: { not: null } },
      select: { description: true },
      distinct: ['description'],
      orderBy: { description: 'asc' },
    });
    const suggestions = [...new Set(rows.map(r => r.description?.trim()).filter(Boolean))];
    res.json({ success: true, data: suggestions });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.hrcSuggestions = async (req, res) => {
  try {
    const rows = await prisma.challanItem.findMany({
      where: { hrc: { not: null } },
      select: { hrc: true },
      distinct: ['hrc'],
      orderBy: { hrc: 'asc' },
    });
    const suggestions = [...new Set(rows.map(r => r.hrc?.trim()).filter(Boolean))];
    res.json({ success: true, data: suggestions });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
