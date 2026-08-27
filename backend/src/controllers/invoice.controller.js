const prisma  = require('../utils/prisma');
const http    = require('http');
const https   = require('https');
const ExcelJS = require('exceljs');
const { sendEmail, sendSms, sendWhatsApp } = require('../utils/notifications');
const { exportInvoices } = require('../utils/export');
const { toInt, toNum, toMoney, asArray } = require('../utils/normalize');
const { parsePagination, formatListResponse, formatErrorResponse, getStatusCode } = require('../utils/validation');

const { generateSeriesInvoiceNoAtomic } = require('../utils/sequenceManager');

/**
 * @param {number|null} excludeInvoiceId  Edit ke waqt jis invoice ko dobara
 *   likha ja raha hai uski purani lines ko ginti se bahar rakhna zaroori hai —
 *   warna invoice khud ki hi quantity ko "already billed" maan kar apne aap ko
 *   block kar deti hai.
 */
const getChallanBillingStatusInternal = async (challanId, db = prisma, excludeInvoiceId = null) => {
  const challan = await db.jobworkChallan.findUnique({
    where: { id: toInt(challanId) },
    include: {
      items: true,
      dispatchChallans: {
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      },
      taxInvoices: {
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!challan) return null;

  const itemMap = new Map();
  for (const chItem of challan.items) {
    itemMap.set(chItem.id, {
      challanItemId: chItem.id,
      description: chItem.description,
      totalQty: toNum(chItem.quantity, 0),
      rate: toNum(chItem.rate, 0),
      dispatchedQty: 0,
      invoicedQty: 0,
      remainingQty: 0,
    });
  }

  // Dispatched qty from dispatch challans (only count sent/received/completed)
  for (const dc of challan.dispatchChallans || []) {
    if (!['SENT', 'RECEIVED', 'COMPLETED'].includes(dc.status)) continue;
    for (const di of dc.items || []) {
      if (!di.sourceChallanItemId) continue;
      const row = itemMap.get(di.sourceChallanItemId);
      if (!row) continue;
      row.dispatchedQty += toNum(di.quantity, 0);
    }
  }

  for (const inv of challan.taxInvoices) {
    if (excludeInvoiceId && inv.id === toInt(excludeInvoiceId)) continue;
    for (const ii of inv.items || []) {
      if (!ii.sourceChallanItemId) continue;
      const row = itemMap.get(ii.sourceChallanItemId);
      if (!row) continue;
      row.invoicedQty += toNum(ii.quantity, 0);
    }
  }

  // Remaining: if dispatch challans exist, use dispatched qty; else use total inward qty
  const hasDispatch = (challan.dispatchChallans || []).some(dc =>
    ['SENT', 'RECEIVED', 'COMPLETED'].includes(dc.status)
  );
  for (const row of itemMap.values()) {
    const base = hasDispatch ? row.dispatchedQty : row.totalQty;
    row.remainingQty = Math.max(0, base - row.invoicedQty);
  }

  const lineStatus = Array.from(itemMap.values());
  const totalQty = lineStatus.reduce((s, x) => s + x.totalQty, 0);
  const totalDispatchedQty = lineStatus.reduce((s, x) => s + x.dispatchedQty, 0);
  const totalInvoicedQty = lineStatus.reduce((s, x) => s + x.invoicedQty, 0);
  const totalRemainingQty = lineStatus.reduce((s, x) => s + x.remainingQty, 0);

  return {
    challanId: challan.id,
    challanNo: challan.challanNo,
    invoiceCount: challan.taxInvoices.length,
    totalQty,
    totalDispatchedQty,
    totalInvoicedQty,
    totalRemainingQty,
    isFullyInvoiced: totalRemainingQty <= 0.00001,
    lineStatus,
  };
};

// Number to words (simple Indian format)
const numToWords = (n) => {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const inWords = (num) => {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num/10)] + (num%10 ? ' ' + a[num%10] : '');
    if (num < 1000) return a[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' ' + inWords(num%100) : '');
    if (num < 100000) return inWords(Math.floor(num/1000)) + ' Thousand' + (num%1000 ? ' ' + inWords(num%1000) : '');
    if (num < 10000000) return inWords(Math.floor(num/100000)) + ' Lakh' + (num%100000 ? ' ' + inWords(num%100000) : '');
    return inWords(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' ' + inWords(num%10000000) : '');
  };
  const rupees = Math.floor(n);
  const paise  = Math.round((n - rupees) * 100);
  let words = 'Rupees ' + inWords(rupees);
  if (paise > 0) words += ' and ' + inWords(paise) + ' Paise';
  return words + ' Only';
};

// ── List Invoices ─────────────────────────────────────────────
const MAX_EXPORT_LIMIT = 5000; // ✅ FIXED: Cap export to prevent DOS

exports.list = async (req, res) => {
  try {
    const { paymentStatus, challanId, fromDate, toDate, search } = req.query;
    const { page, limit, skip } = parsePagination(req);
    const exportAll = String(req.query.exportAll) === 'true';

    // ✅ FIXED: Cap export limit to prevent DOS attack
    const finalLimit = exportAll ? Math.min(MAX_EXPORT_LIMIT, 5000) : Math.min(limit, 500);
    const finalSkip = exportAll ? 0 : skip;

    const where = {};
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (challanId)     where.challanId     = toInt(challanId);
    const searchText = String(search || '').trim();
    if (searchText) {
      where.OR = [
        { invoiceNo: { contains: searchText } },
        { challanRef: { contains: searchText } },
        { poRef: { contains: searchText } },
        { jobCardRef: { contains: searchText } },
        { toParty: { is: { name: { contains: searchText } } } },
      ];
    }

    if (fromDate || toDate) {
      where.invoiceDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!Number.isNaN(from.getTime())) where.invoiceDate.gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!Number.isNaN(to.getTime())) {
          to.setDate(to.getDate() + 1);
          where.invoiceDate.lt = to;
        }
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.taxInvoice.findMany({
        where,
        include: {
          fromParty: { select: { name: true } },
          toParty:   { select: { name: true } },
          challan:   { select: { challanNo: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: finalSkip,
        take: finalLimit,
      }),
      prisma.taxInvoice.count({ where }),
    ]);

    res.json(formatListResponse(invoices, total, exportAll ? 1 : page, invoices.length));
  } catch (err) {
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Server error.'));
  }
};

// ── Get single Invoice ────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const invoice = await prisma.taxInvoice.findUnique({
      where: { id: toInt(req.params.id) },
      include: {
        fromParty:     true,
        toParty:       true,
        challan:       { select: { id: true, challanNo: true, items: true } },
        items:         { include: { processType: true } },
        createdBy:     { select: { name: true } },
        invoiceSeries: { select: { id: true, code: true, label: true } },
      },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    // Also fetch sibling invoices for same challan (for partial invoice tracking)
    let siblingInvoices = [];
    if (invoice.challanId) {
      siblingInvoices = await prisma.taxInvoice.findMany({
        where:   { challanId: invoice.challanId, id: { not: invoice.id } },
        select:  { id: true, invoiceNo: true, totalAmount: true, sentToTally: true, paymentStatus: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    res.json({ success: true, data: { ...invoice, siblingInvoices } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Challan Billing Status (per-item qty tracking) ────────────
exports.getChallanBillingStatus = async (req, res) => {
  try {
    const challanId = toInt(req.params.challanId);
    // Edit ke waqt frontend apni hi invoice ko chhodne ko kehta hai, warna
    // "already fully invoiced" dikha kar apna hi save block kar deta.
    const exclude = req.query.excludeInvoiceId ? toInt(req.query.excludeInvoiceId) : null;
    const status = await getChallanBillingStatusInternal(challanId, prisma, exclude);
    if (!status) return res.status(404).json({ success: false, message: 'Challan not found.' });
    res.json({ success: true, data: status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Invoice ────────────────────────────────────────────
/**
 * Party ke apne process rates lagana un lines par jinka rate nahi bhara hua.
 * create aur update dono isi se guzarti hain, taaki ek hi jagah par niyam rahe.
 */
const resolveItemRates = async (items, { challanId, fromPartyId }) => {
  // Fetch party-specific process rates for auto-calculation (for manual invoices without challan)
  let partyRatesMap = {};
  if (!challanId && fromPartyId) {
    const partyRates = await prisma.partyProcessRate.findMany({
      where: { partyId: toInt(fromPartyId) },
      include: { processType: { select: { id: true, pricePerKg: true, pricePerPc: true, lotPrice: true } } },
    });
    for (const pr of partyRates) {
      partyRatesMap[pr.processTypeId] = {
        pricePerKg: pr.pricePerKg ?? pr.processType?.pricePerKg,
        pricePerPc: pr.pricePerPc ?? pr.processType?.pricePerPc,
        lotPrice:   pr.lotPrice   ?? pr.processType?.lotPrice,
      };
    }
  }

  // Apply party-specific rates to items if not explicitly provided. When the
  // client sends a billingType (KGS/PCS/LOT), honour it; otherwise fall back
  // to the historical auto-detect (Lot → Kg → Pc).
  const parsedItems = asArray(items).map(it => {
    const ptId = it.processTypeId ? toInt(it.processTypeId) : null;
    if (ptId && partyRatesMap[ptId] && (!it.rate || toNum(it.rate, 0) === 0)) {
      const partyRate = partyRatesMap[ptId];
      const weight = toNum(it.weight, 0);
      const qty = toNum(it.quantity, 0);
      const type = String(it.billingType || it.unit || '').toUpperCase();

      // Explicit billing type chosen in the UI
      if (type === 'LOT' && toNum(partyRate.lotPrice, 0) > 0) {
        const r = toNum(partyRate.lotPrice, 0);
        return { ...it, rate: String(r.toFixed(2)), amount: String(((qty > 0 ? qty : 1) * r).toFixed(2)) };
      }
      if (type === 'PCS' && toNum(partyRate.pricePerPc, 0) > 0) {
        const r = toNum(partyRate.pricePerPc, 0);
        return { ...it, rate: String(r.toFixed(2)), amount: String((qty * r).toFixed(2)) };
      }
      if (type === 'KGS' && toNum(partyRate.pricePerKg, 0) > 0) {
        const r = toNum(partyRate.pricePerKg, 0);
        const base = weight > 0 ? weight : qty;
        return { ...it, rate: String(r.toFixed(2)), amount: String((base * r).toFixed(2)) };
      }

      // No explicit / matching type — auto-detect (Kg → Pc → Lot), aligned
      // with the frontend's detectBillingType() preference order.
      if (weight > 0 && toNum(partyRate.pricePerKg, 0) > 0) {
        const amount = weight * toNum(partyRate.pricePerKg, 0);
        return { ...it, rate: String(toNum(partyRate.pricePerKg, 0).toFixed(2)), amount: String(amount.toFixed(2)) };
      }
      if (qty > 0 && toNum(partyRate.pricePerPc, 0) > 0) {
        const amount = qty * toNum(partyRate.pricePerPc, 0);
        return { ...it, rate: String(toNum(partyRate.pricePerPc, 0).toFixed(2)), amount: String(amount.toFixed(2)) };
      }
      const lotPrice = toNum(partyRate.lotPrice, 0);
      if (lotPrice > 0) {
        return { ...it, rate: String(lotPrice.toFixed(2)), amount: String(((qty > 0 ? qty : 1) * lotPrice).toFixed(2)) };
      }
    }
    return it;
  });
  return parsedItems;
};

exports.create = async (req, res) => {
  try {
    const {
      invoiceDate, dispatchDate, fromPartyId, toPartyId,
      challanRef, poRef, jobCardRef, otherReferences,
      cgstRate, sgstRate, igstRate,
      transportFreight, tcsRate, extraAmt,
      dispatchDocNo, eWayBillNo,
      invoiceSeriesId,
      showPartName,
      items,
    } = req.body;

    if (!fromPartyId || !toPartyId)
      return res.status(400).json({ success: false, message: 'From and To party required.' });

    if (!invoiceSeriesId)
      return res.status(400).json({ success: false, message: 'Invoice series is required.' });

    const series = await prisma.invoiceSeries.findUnique({ where: { id: toInt(invoiceSeriesId) } });
    if (!series || !series.isActive)
      return res.status(400).json({ success: false, message: 'Selected invoice series is invalid or inactive.' });

    const { challanId } = req.body;

    const parsedItems = await resolveItemRates(items, { challanId, fromPartyId });

    // Each component is rounded to paise before it feeds the next total, so the
    // stored figures add up exactly as they are printed and as Tally posts them.
    const subtotal     = toMoney(parsedItems.reduce((s, it) => s + toNum(it.amount, 0), 0));
    const cgst         = toMoney((subtotal * toNum(cgstRate, 9)) / 100);
    const sgst         = toMoney((subtotal * toNum(sgstRate, 9)) / 100);
    const igst         = toMoney((subtotal * toNum(igstRate, 0)) / 100);
    const total        = toMoney(subtotal + cgst + sgst + igst);
    const transport    = toMoney(transportFreight);
    const tcsRateVal   = toNum(tcsRate, 0);
    const tcsAmt       = toMoney((total * tcsRateVal) / 100);
    const extraAmtVal  = toMoney(extraAmt);
    const grandTotal   = toMoney(total + transport + tcsAmt + extraAmtVal);

    let invoice = null;
    let invoiceNo = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        invoice = await prisma.$transaction(async (tx) => {
          let txBillingType = 'MANUAL';
          if (challanId) {
            const challan = await tx.jobworkChallan.findUnique({
              where:  { id: toInt(challanId) },
              select: { challanNo: true },
            });

            if (!challan) {
              throw new Error(`Linked challan ${challanId} not found.`);
            }

            // Billing limits are enforced by remaining QUANTITY per challan
            // item, not by rupee amount — a line's rate can legitimately
            // differ from what was recorded on the challan (e.g. a party's
            // per-process rate was updated after the inward challan was
            // created), so comparing invoice amount against the challan's
            // frozen subtotal would incorrectly block a valid re-priced
            // invoice.
            const status = await getChallanBillingStatusInternal(toInt(challanId), tx);
            if (status.totalRemainingQty <= 0.00001) {
              throw new Error(`Challan ${challan.challanNo} is already fully invoiced. No further billing allowed.`);
            }
            const remainingByItem = new Map(status.lineStatus.map((x) => [x.challanItemId, x.remainingQty]));

            for (const it of parsedItems) {
              const srcId = it.sourceChallanItemId ? toInt(it.sourceChallanItemId) : null;
              if (!srcId) throw new Error('Each invoice line must map to source challan item for partial dispatch tracking.');
              const rem = remainingByItem.get(srcId);
              if (rem === undefined) throw new Error(`Invalid source challan item id ${srcId}.`);
              const q = toNum(it.quantity, 0);
              if (q <= 0) throw new Error('Invoice quantity must be greater than zero.');
              if (q > rem + 0.00001) throw new Error(`Over-quantity for challan item ${srcId}. Remaining ${rem}, attempted ${q}.`);
            }

            const qtyAfter = status.totalRemainingQty - parsedItems.reduce((s, it) => s + toNum(it.quantity, 0), 0);
            txBillingType = qtyAfter <= 0.00001 ? 'FINAL_DISPATCH' : 'PARTIAL_DISPATCH';
          }

          invoiceNo = await generateSeriesInvoiceNoAtomic(series.code, tx, series.padWidth);
          return tx.taxInvoice.create({
            data: {
              invoiceNo,
              invoiceSeriesId: series.id,
              invoiceDate:     new Date(invoiceDate || new Date()),
              dispatchDate:    dispatchDate    ? new Date(dispatchDate)    : null,
              fromPartyId:     toInt(fromPartyId),
              toPartyId:       toInt(toPartyId),
              challanRef:      challanRef      || null,
              poRef:           poRef           || null,
              jobCardRef:      jobCardRef      || null,
              otherReferences: [otherReferences, challanId ? (txBillingType === 'FINAL_DISPATCH' ? 'Final Invoice against linked Challan' : 'Partial Invoice against linked Challan') : null].filter(Boolean).join(' | ') || null,
              dispatchDocNo:   dispatchDocNo   || null,
              eWayBillNo:      eWayBillNo      || null,
              challanId:       challanId       ? toInt(challanId) : null,
              subtotal,
              cgstRate:         toNum(cgstRate, 9),
              cgstAmount:       cgst,
              sgstRate:         toNum(sgstRate, 9),
              sgstAmount:       sgst,
              igstRate:         toNum(igstRate, 0),
              igstAmount:       igst,
              totalAmount:      total,
              transportFreight: transport,
              tcsRate:          tcsRateVal,
              tcsAmount:        tcsAmt,
              extraAmt:         extraAmtVal,
              grandTotal:       grandTotal,
              amountInWords:    numToWords(grandTotal),
              taxAmountInWords: numToWords(cgst + sgst + igst + tcsAmt),
              showPartName:     showPartName !== false,
              createdById:      req.user.id,
              items: {
                create: parsedItems.map((it) => ({
                  description:   it.description,
                  material:      it.material      || null,
                  hrc:           it.hrc           || null,
                  woNo:          it.woNo          || null,
                  hsnSac:        it.hsnSac        || null,
                  sourceChallanItemId: it.sourceChallanItemId ? toInt(it.sourceChallanItemId) : null,
                  quantity:      toNum(it.quantity, 0),
                  unit:          it.unit          || 'KGS',
                  weight:        it.weight        ? toNum(it.weight, null) : null,
                  rate:          toNum(it.rate, 0),
                  amount:        toNum(it.amount, 0),
                  processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
                  certId:        it.certId        ? toInt(it.certId)        : null,
                })),
              },
            },
            include: { fromParty: true, toParty: true, items: true },
          });
        }, { isolationLevel: 'Serializable' });
        break;
      } catch (txErr) {
        if (txErr?.code === 'P2002' && attempt < 2) continue; // unique collision on invoiceNo
        if (typeof txErr?.message === 'string' && (
          txErr.message.includes('Over-invoice') ||
          txErr.message.includes('already fully invoiced') ||
          txErr.message.includes('Over-quantity') ||
          txErr.message.includes('source challan item') ||
          txErr.message.includes('not found')
        )) {
          return res.status(400).json({ success: false, message: txErr.message });
        }
        throw txErr;
      }
    }
    if (!invoice) {
      return res.status(409).json({ success: false, message: 'Could not generate unique invoice number. Please retry.' });
    }

    res.status(201).json({ success: true, data: invoice, message: `Invoice ${invoiceNo} created.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── e-Invoice details (IRN/Ack No/Ack Date) — filled in manually after the
// invoice is submitted to the government e-invoice portal outside this
// system, since there's no direct IRP integration here. Print's QR code is
// generated from whatever is saved here.
// ── Update Invoice (ADMIN) ────────────────────────────────────
// Invoice number kabhi nahi badalta — wo issue ho chuka hota hai. Locked
// (Tally bhej di gayi) ya IRN wali invoice edit nahi hoti: pehli me accounting
// mismatch ho jata, doosri me sarkari record se farak pad jata.
exports.update = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const existing = await prisma.taxInvoice.findUnique({
      where: { id },
      select: { id: true, invoiceNo: true, sentToTally: true, irnNo: true, challanId: true },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    if (existing.sentToTally) {
      return res.status(400).json({
        success: false,
        message: 'Ye invoice Tally bhej di gayi hai, ab edit nahi ho sakti — accounting me farak pad jayega.',
      });
    }
    if (existing.irnNo) {
      return res.status(400).json({
        success: false,
        message: 'Is invoice ka IRN ban chuka hai. GST portal par register invoice badli nahi ja sakti — cancel karke nayi banaiye.',
      });
    }

    const {
      invoiceDate, dispatchDate, fromPartyId, toPartyId,
      challanRef, poRef, jobCardRef, otherReferences,
      cgstRate, sgstRate, igstRate,
      transportFreight, tcsRate, extraAmt,
      dispatchDocNo, eWayBillNo,
      showPartName,
      items,
    } = req.body;

    if (!fromPartyId || !toPartyId)
      return res.status(400).json({ success: false, message: 'From and To party required.' });

    // Challan wahi rehta hai jo tha — edit se invoice kisi doosre challan par
    // nahi jaa sakti, warna dono challan ki billing ginti bigad jati hai.
    const challanId = existing.challanId;

    const parsedItems = await resolveItemRates(items, { challanId, fromPartyId });
    if (!parsedItems.length)
      return res.status(400).json({ success: false, message: 'Invoice me kam se kam ek item chahiye.' });

    const subtotal    = toMoney(parsedItems.reduce((s, it) => s + toNum(it.amount, 0), 0));
    const cgst        = toMoney((subtotal * toNum(cgstRate, 9)) / 100);
    const sgst        = toMoney((subtotal * toNum(sgstRate, 9)) / 100);
    const igst        = toMoney((subtotal * toNum(igstRate, 0)) / 100);
    const total       = toMoney(subtotal + cgst + sgst + igst);
    const transport   = toMoney(transportFreight);
    const tcsRateVal  = toNum(tcsRate, 0);
    const tcsAmt      = toMoney((total * tcsRateVal) / 100);
    const extraAmtVal = toMoney(extraAmt);
    const grandTotal  = toMoney(total + transport + tcsAmt + extraAmtVal);

    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        if (challanId) {
          // Is invoice ki apni purani lines ginti se bahar — warna edit khud
          // ko hi "already billed" maan kar block kar deta.
          const status = await getChallanBillingStatusInternal(challanId, tx, id);
          const remainingByItem = new Map(status.lineStatus.map((x) => [x.challanItemId, x.remainingQty]));

          for (const it of parsedItems) {
            const srcId = it.sourceChallanItemId ? toInt(it.sourceChallanItemId) : null;
            if (!srcId) throw new Error('Each invoice line must map to source challan item for partial dispatch tracking.');
            const rem = remainingByItem.get(srcId);
            if (rem === undefined) throw new Error(`Invalid source challan item id ${srcId}.`);
            const q = toNum(it.quantity, 0);
            if (q <= 0) throw new Error('Invoice quantity must be greater than zero.');
            if (q > rem + 0.00001) throw new Error(`Over-quantity for challan item ${srcId}. Remaining ${rem}, attempted ${q}.`);
          }
        }

        // Lines dobara likhi jaati hain — kaunsi badli ye pata karne se
        // seedha replace karna saaf aur bharosemand hai.
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

        return tx.taxInvoice.update({
          where: { id },
          data: {
            invoiceDate:     new Date(invoiceDate || new Date()),
            dispatchDate:    dispatchDate ? new Date(dispatchDate) : null,
            fromPartyId:     toInt(fromPartyId),
            toPartyId:       toInt(toPartyId),
            challanRef:      challanRef      || null,
            poRef:           poRef           || null,
            jobCardRef:      jobCardRef      || null,
            otherReferences: otherReferences || null,
            dispatchDocNo:   dispatchDocNo   || null,
            eWayBillNo:      eWayBillNo      || null,
            subtotal,
            cgstRate:         toNum(cgstRate, 9),
            cgstAmount:       cgst,
            sgstRate:         toNum(sgstRate, 9),
            sgstAmount:       sgst,
            igstRate:         toNum(igstRate, 0),
            igstAmount:       igst,
            totalAmount:      total,
            transportFreight: transport,
            tcsRate:          tcsRateVal,
            tcsAmount:        tcsAmt,
            extraAmt:         extraAmtVal,
            grandTotal,
            amountInWords:    numToWords(grandTotal),
            taxAmountInWords: numToWords(cgst + sgst + igst + tcsAmt),
            showPartName:     showPartName !== false,
            items: {
              create: parsedItems.map((it) => ({
                description:   it.description,
                material:      it.material      || null,
                hrc:           it.hrc           || null,
                woNo:          it.woNo          || null,
                hsnSac:        it.hsnSac        || null,
                sourceChallanItemId: it.sourceChallanItemId ? toInt(it.sourceChallanItemId) : null,
                quantity:      toNum(it.quantity, 0),
                unit:          it.unit          || 'KGS',
                weight:        it.weight        ? toNum(it.weight, null) : null,
                rate:          toNum(it.rate, 0),
                amount:        toNum(it.amount, 0),
                processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
                certId:        it.certId        ? toInt(it.certId)        : null,
              })),
            },
          },
          include: { fromParty: true, toParty: true, items: true },
        });
      }, { isolationLevel: 'Serializable' });
    } catch (txErr) {
      if (typeof txErr?.message === 'string' && (
        txErr.message.includes('Over-quantity') ||
        txErr.message.includes('source challan item') ||
        txErr.message.includes('not found')
      )) {
        return res.status(400).json({ success: false, message: txErr.message });
      }
      throw txErr;
    }

    res.json({ success: true, data: updated, message: `Invoice ${existing.invoiceNo} updated.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.updateEInvoiceDetails = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { irnNo, ackNo, ackDate } = req.body;
    const invoice = await prisma.taxInvoice.update({
      where: { id },
      data: {
        irnNo: irnNo || null,
        ackNo: ackNo || null,
        ackDate: ackDate ? new Date(ackDate) : null,
      },
      select: { id: true, irnNo: true, ackNo: true, ackDate: true },
    });
    res.json({ success: true, data: invoice, message: 'e-Invoice details updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Invoice series master (list active for dropdown; admin create) ──
exports.listSeries = async (req, res) => {
  try {
    const onlyActive = req.query.all !== 'true';
    const series = await prisma.invoiceSeries.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: series });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.createSeries = async (req, res) => {
  try {
    const { code, label, isActive } = req.body;
    if (!code || !label)
      return res.status(400).json({ success: false, message: 'Code and label are required.' });

    const series = await prisma.invoiceSeries.create({
      data: { code: code.trim(), label: label.trim(), isActive: isActive !== false },
    });
    res.status(201).json({ success: true, data: series, message: `Series ${series.code} created.` });
  } catch (err) {
    if (err?.code === 'P2002')
      return res.status(400).json({ success: false, message: 'A series with this code already exists.' });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.updateSeries = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { label, isActive, padWidth } = req.body;

    // padWidth = running number ki digit-ginti. Ise badalne se aage ke number
    // ki lambai badalti hai — NIC ki 16-character seema isi par tiki hai.
    let pad;
    if (padWidth !== undefined) {
      pad = toInt(padWidth);
      if (!pad || pad < 1 || pad > 6) {
        return res.status(400).json({ success: false, message: 'padWidth 1 se 6 ke beech hona chahiye.' });
      }
    }

    const series = await prisma.invoiceSeries.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(isActive !== undefined && { isActive }),
        ...(pad !== undefined && { padWidth: pad }),
      },
    });
    res.json({ success: true, data: series, message: `Series ${series.code} updated.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Bump print copy count (ORIGINAL → DUPLICATE → EXTRA on successive
// prints/downloads) — called explicitly when the user triggers a print or
// download, not on page load, so accidental refreshes don't inflate it.
exports.registerPrint = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const invoice = await prisma.taxInvoice.update({
      where: { id },
      data: { printCount: { increment: 1 } },
      select: { id: true, printCount: true },
    });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Update payment status ─────────────────────────────────────
exports.updatePayment = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { paymentStatus, paidDate, paymentRef } = req.body;

    const invoice = await prisma.taxInvoice.update({
      where: { id },
      data: {
        paymentStatus,
        ...(paidDate   && { paidDate:   new Date(paidDate) }),
        ...(paymentRef && { paymentRef }),
      },
    });
    res.json({ success: true, data: invoice, message: 'Payment status updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const invoice = await prisma.taxInvoice.findUnique({ where: { id }, select: { invoiceNo: true, sentToTally: true } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    if (invoice.sentToTally) {
      return res.status(400).json({ success: false, message: 'This invoice has already been sent to Tally and cannot be deleted — it would create a mismatch with the accounting system.' });
    }
    // InvoiceItem rows cascade-delete with the invoice (onDelete: Cascade).
    // Billing status against the linked challan is computed live from
    // existing invoices, so deleting frees up that quantity automatically.
    await prisma.taxInvoice.delete({ where: { id } });
    res.json({ success: true, message: `Invoice ${invoice.invoiceNo} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { type, to, message } = req.body;

    if (!['email', 'sms', 'whatsapp'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type. Use email, sms, or whatsapp.' });
    }

    const invoice = await prisma.taxInvoice.findUnique({
      where: { id },
      include: { toParty: true, fromParty: true },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const bodyMessage = message ||
      `${invoice.invoiceNo} for ₹${toNum(invoice.grandTotal, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} is ready. Please check the ERP system.`;

    let result;
    if (type === 'email') {
      const emailTo = to || invoice.toParty?.email || invoice.fromParty?.email;
      if (!emailTo) return res.status(400).json({ success: false, message: 'No recipient email available.' });
      const subject = `Invoice ${invoice.invoiceNo} from Sheetal Dies ERP`;
      const html = `<p>Dear ${invoice.toParty?.name || invoice.fromParty?.name || 'Customer'},</p>` +
                   `<p>${bodyMessage}</p>` +
                   `<p>Invoice Reference: <strong>${invoice.invoiceNo}</strong></p>`;
      result = await sendEmail(emailTo, subject, html);
    } else if (type === 'sms') {
      const phone = to || invoice.toParty?.phone || invoice.fromParty?.phone;
      if (!phone) return res.status(400).json({ success: false, message: 'No phone number available for SMS.' });
      result = await sendSms(phone, bodyMessage);
    } else if (type === 'whatsapp') {
      const phone = to || invoice.toParty?.phone || invoice.fromParty?.phone;
      if (!phone) return res.status(400).json({ success: false, message: 'No phone number available for WhatsApp.' });
      result = await sendWhatsApp(phone, bodyMessage);
    }

    res.json({ success: true, data: result, message: `Notification sent via ${type}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Notification failure.' });
  }
};

// ── Tally XML Builder ─────────────────────────────────────────
// Ledger names must match exactly what exists in your Tally company.
// Default names used below — change if your Tally ledgers have different names.
// Defaults below are read off SVT's own printed Tally invoices. Every one of
// them must exist in the Tally company spelled identically — Tally never
// auto-creates a master on import, it raises an exception instead. Run
// `node scripts/tally-masters.js` against a live Tally to dump the real names.
const TALLY_LEDGERS = {
  sales:    process.env.TALLY_LEDGER_SALES    || 'Sales',
  cgst:     process.env.TALLY_LEDGER_CGST     || 'Central Tax on Sales @ 9%',
  sgst:     process.env.TALLY_LEDGER_SGST     || 'State Tax on Sales @ 9%',
  igst:     process.env.TALLY_LEDGER_IGST     || 'Integrated Tax on Sales @ 18%',
  freight:  process.env.TALLY_LEDGER_FREIGHT  || 'Transport & Freight Charges',
  tcs:      process.env.TALLY_LEDGER_TCS      || 'TCS Payable',
  roundOff: process.env.TALLY_LEDGER_ROUNDOFF || 'Round Off',
};

// SVT bills job work as a stock item measured in Kgs, not as a plain accounting
// invoice: their printed invoices carry HSN/SAC, Quantity, Rate and "per"
// columns and foot a quantity total ("74.300 Kgs"), none of which a Tally
// accounting invoice produces. So the voucher needs inventory entries, and the
// sales ledger hangs off each item's accounting allocation instead of standing
// as its own line. Set TALLY_INVOICE_MODE=accounting to go back to ledger-only.
const TALLY_INVOICE_MODE = (process.env.TALLY_INVOICE_MODE || 'item').toLowerCase();
const TALLY_STOCK_ITEM   = process.env.TALLY_STOCK_ITEM || 'Vacuum Heat Treatment 18%';
// The stock item's base unit in Tally, which is authoritative over whatever the
// invoice row happens to say (our rows default to "KGS", Tally's unit is "Kgs"
// and a mismatched symbol is rejected).
// HSN/SAC (998873) lives on the Tally stock item master, not on the voucher.
const TALLY_UNIT         = process.env.TALLY_UNIT || 'Kgs';

// Tally carries one stock item per heat-treatment process, so the item on a
// voucher line is the line's own process — not one fixed name for everything.
// A process can override it when Tally spells it differently; TALLY_STOCK_ITEM
// is only the last resort for a line with no process linked at all.
const tallyStockItemFor = (item) =>
  item.processType?.tallyStockItem?.trim()
  || item.processType?.name?.trim()
  || item.processName?.trim()
  || TALLY_STOCK_ITEM;

// Must match the Tally company name character-for-character. Without it Tally
// resolves the voucher against no company at all, which it reports as a missing
// mandatory field rather than a missing company.
const TALLY_COMPANY = process.env.TALLY_COMPANY || '';

// Tally's import parser is not a general XML parser: an unescaped & or < aborts
// the parse part-way through the voucher, and any non-ASCII byte (the rupee sign
// in the item narration, smart quotes pasted into a party name) is mangled into
// bytes it then chokes on. Either failure surfaces in the Import Exceptions
// report as "Voucher Date is missing", because DATE is the first mandatory field
// Tally looks for on the half-built voucher. So everything interpolated below
// goes through here.
const tallyText = (value) => String(value ?? '')
  .replace(/₹/g, 'Rs.')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-')
  .replace(/[^\x20-\x7E]/g, '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .trim();

// invoiceDate is a DATE column, so Prisma hands it back as UTC midnight. Local
// getters would emit the previous day on any server west of GMT.
const tallyDate = (value) => {
  if (value === null || value === undefined || value === '') return null; // new Date(null) is epoch, not invalid
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

// Tally picks the entry collection by voucher mode, and silently ignores the
// wrong one: ALLLEDGERENTRIES.LIST belongs to double-entry vouchers
// (ISINVOICE=No), LEDGERENTRIES.LIST to invoice-mode vouchers (ISINVOICE=Yes).
// Job work is a service, so there are no inventory entries and this stays an
// accounting invoice — mismatch here reads as "No accounting or inventory
// entries are available" in the Import Exceptions report.
const ENTRY_TAG = 'LEDGERENTRIES.LIST';

const ledgerEntry = (name, amount, { isParty = false, isDebit = false, billRef = null } = {}) => `
            <${ENTRY_TAG}>
              <LEDGERNAME>${tallyText(name)}</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>${isParty ? 'Yes' : 'No'}</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>${(isDebit ? -amount : amount).toFixed(2)}</AMOUNT>${billRef ? `
              <BILLALLOCATIONS.LIST>
                <NAME>${tallyText(billRef)}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>${(isDebit ? -amount : amount).toFixed(2)}</AMOUNT>
              </BILLALLOCATIONS.LIST>` : ''}
            </${ENTRY_TAG}>`;

// One inventory line per invoice row. The extra description mirrors the italic
// sub-line Tally prints under the item name ("1\"HSS , 2\", 1 1/2\" HSS").
const inventoryEntry = (item, salesLedger) => {
  const rate = toNum(item.rate, 0);
  // `quantity` counts pieces; `weight` is the kilos the job is actually billed
  // on, and the stock item's base unit is Kgs. Billing weight is only stored
  // when it differs from the piece count, so fall back to quantity.
  const weight = toNum(item.weight, 0);
  let qty = weight > 0 ? weight : toNum(item.quantity, 0);
  const amt = toNum(item.amount, 0) || Number((qty * rate).toFixed(2));
  // Tally recomputes AMOUNT from RATE x QTY, so a line where those disagree
  // would silently change the voucher total and leave it unbalanced. Amount is
  // the figure that was billed and that feeds the subtotal, so it wins.
  if (rate > 0 && Math.abs(qty * rate - amt) >= 0.01) qty = amt / rate;
  // Same billing line the print page shows: the process is the service sold,
  // the customer's part name qualifies it.
  const service = item.processType?.name || item.processName || '';
  const part    = (item.description || '').trim();
  const desc = tallyText(
    service && part.toLowerCase() !== service.trim().toLowerCase()
      ? `${service} - ${part}`
      : (service || part));
  return `
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${tallyText(tallyStockItemFor(item))}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
              <ISAUTONEGATE>No</ISAUTONEGATE>
              <RATE>${rate.toFixed(2)}/${tallyText(TALLY_UNIT)}</RATE>
              <ACTUALQTY>${qty.toFixed(3)} ${tallyText(TALLY_UNIT)}</ACTUALQTY>
              <BILLEDQTY>${qty.toFixed(3)} ${tallyText(TALLY_UNIT)}</BILLEDQTY>
              <AMOUNT>${amt.toFixed(2)}</AMOUNT>${desc ? `
              <BASICUSERDESCRIPTION.LIST>
                <BASICUSERDESCRIPTION>${desc}</BASICUSERDESCRIPTION>
              </BASICUSERDESCRIPTION.LIST>` : ''}
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${tallyText(salesLedger)}</LEDGERNAME>
                <GSTCLASS/>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <LEDGERFROMITEM>No</LEDGERFROMITEM>
                <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
                <ISPARTYLEDGER>No</ISPARTYLEDGER>
                <AMOUNT>${amt.toFixed(2)}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>`;
};

// Tally treats REMOTEID as the external system's key for a voucher. Without it
// every import of the same invoice creates ANOTHER voucher — Tally assigns its
// own voucher numbers, so it cannot spot the repeat on its own and the books
// end up double-counting. With it, a re-import updates the voucher already
// there instead, which is also what should happen when a corrected invoice is
// exported again.
const tallyRemoteId = (invoice) => `SVTERP-INV-${invoice.id}`;

// Tally looks the party up by ledger name and creates nothing on import, so the
// name has to be whatever that Tally company calls this customer — which is not
// always what the ERP calls them.
const tallyPartyLedger = (invoice) =>
  invoice.toParty?.tallyLedgerName?.trim() || invoice.toParty?.name || 'Customer';

const buildTallyXML = (invoice) => {
  const date = tallyDate(invoice.invoiceDate);
  if (!date) throw new Error('Invoice has no valid invoice date — Tally would reject the voucher.');
  const remoteId = tallyText(tallyRemoteId(invoice));

  const subtotal = toNum(invoice.subtotal, 0);
  const cgst     = toNum(invoice.cgstAmount, 0);
  const sgst     = toNum(invoice.sgstAmount, 0);
  const igst     = toNum(invoice.igstAmount, 0);
  const freight  = toNum(invoice.transportFreight, 0);
  const tcs      = toNum(invoice.tcsAmount, 0);
  const total    = toNum(invoice.totalAmount, 0);
  const grand    = toNum(invoice.grandTotal, 0) || total;
  const partyName = tallyPartyLedger(invoice);

  const narration = [
    `Invoice: ${invoice.invoiceNo}`,
    invoice.challanRef ? `Challan: ${invoice.challanRef}` : '',
    invoice.poRef      ? `PO: ${invoice.poRef}`           : '',
    invoice.jobCardRef ? `Job Card: ${invoice.jobCardRef}`: '',
  ].filter(Boolean).join(' | ');

  const itemNarration = (invoice.items || [])
    .map(it => `${it.description} x${it.quantity} ${it.unit} @ ${it.rate}`)
    .join('; ');

  // An item invoice with no rows would import as "no accounting or inventory
  // entries are available", so fall back to a ledger-only voucher in that case.
  const rows       = (invoice.items || []);
  const isItemMode = TALLY_INVOICE_MODE === 'item' && rows.length > 0;

  const inventory  = isItemMode ? rows.map(it => inventoryEntry(it, TALLY_LEDGERS.sales)).join('') : '';
  const stockValue = isItemMode
    ? rows.reduce((sum, it) => sum + (toNum(it.amount, 0) || toNum(it.quantity, 0) * toNum(it.rate, 0)), 0)
    : 0;

  // In item mode the sales value already rides on each inventory entry's
  // accounting allocation, so it must not also appear as its own ledger line.
  const credits = [
    ...(isItemMode ? [] : [[TALLY_LEDGERS.sales, subtotal]]),
    [TALLY_LEDGERS.cgst,    cgst],
    [TALLY_LEDGERS.sgst,    sgst],
    [TALLY_LEDGERS.igst,    igst],
    [TALLY_LEDGERS.freight, freight],
    [TALLY_LEDGERS.tcs,     tcs],
  ].filter(([, amt]) => amt > 0);

  // The party is debited with the grand total, so anything the line ledgers and
  // inventory do not account for (extraAmt, rounding) has to land somewhere or
  // Tally rejects the voucher as unbalanced.
  const creditTotal = credits.reduce((sum, [, amt]) => sum + amt, stockValue);
  const residual    = Number((grand - creditTotal).toFixed(2));
  if (Math.abs(residual) >= 0.01) credits.push([TALLY_LEDGERS.roundOff, residual]);

  const entries = [
    ledgerEntry(partyName, grand, { isParty: true, isDebit: true, billRef: invoice.invoiceNo }),
    ...credits.map(([name, amt]) => ledgerEntry(name, amt)),
  ].join('') + inventory;

  // e-Invoice / e-Way Bill. Ye tag sirf tab jodte hain jab data ho — jis
  // invoice me IRN nahi hai uska XML bilkul pehle jaisa hi banta hai.
  const ackDate = tallyDate(invoice.ackDate);
  const ewbDate = tallyDate(invoice.eWayBillDate);
  const irnBlock = invoice.irnNo ? `
            <IRNNO>${tallyText(invoice.irnNo)}</IRNNO>${invoice.ackNo ? `
            <IRNACKNO>${tallyText(invoice.ackNo)}</IRNACKNO>` : ''}${ackDate ? `
            <IRNACKDATE>${ackDate}</IRNACKDATE>` : ''}` : '';
  const ewbBlock = invoice.eWayBillNo ? `
            <EWAYBILLDETAILS.LIST>
              <EWAYBILLNO>${tallyText(invoice.eWayBillNo)}</EWAYBILLNO>${ewbDate ? `
              <EWAYBILLDATE>${ewbDate}</EWAYBILLDATE>` : ''}
            </EWAYBILLDETAILS.LIST>` : '';

  // Tag order and the full mandatory set below mirror what TallyPrime itself
  // emits when exporting a sales voucher — its importer is far stricter about
  // this than a plain XML parser would be.
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>${TALLY_COMPANY ? `
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${tallyText(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>` : ''}
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="${remoteId}" VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <EFFECTIVEDATE>${date}</EFFECTIVEDATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${tallyText(invoice.invoiceNo)}</VOUCHERNUMBER>
            <REFERENCE>${tallyText(invoice.invoiceNo)}</REFERENCE>
            <REFERENCEDATE>${date}</REFERENCEDATE>
            <NARRATION>${tallyText(narration + (itemNarration ? ' | Items: ' + itemNarration : ''))}</NARRATION>
            <PARTYLEDGERNAME>${tallyText(partyName)}</PARTYLEDGERNAME>
            <PARTYNAME>${tallyText(partyName)}</PARTYNAME>
            <BASICBASEPARTYNAME>${tallyText(partyName)}</BASICBASEPARTYNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <ISDELETED>No</ISDELETED>
            <ISOPTIONAL>No</ISOPTIONAL>
            <ISCANCELLED>No</ISCANCELLED>
            <HASCASHFLOW>No</HASCASHFLOW>
            <DIFFACTUALQTY>No</DIFFACTUALQTY>
            <ASORIGINAL>No</ASORIGINAL>${irnBlock}${ewbBlock}${entries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
};

// ── Push XML to Tally HTTP server ─────────────────────────────
// Tally must be open with its HTTP server on: F1 Help → Settings → Connectivity
// → Client/Server configuration → acts as Both, port 9000.
// This only works when the API server can actually reach that machine over the
// network. On a hosted deployment it cannot reach a Tally sitting on someone's
// desk, so "Download XML" is the supported route there.
const isLoopback = (host) => ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(String(host).toLowerCase());

const pushXmlToTally = (xml, tallyUrl = 'http://localhost:9000') => {
  return new Promise((resolve, reject) => {
    let urlObj;
    try { urlObj = new URL(tallyUrl); } catch { return reject(new Error('Invalid Tally URL.')); }

    const transport = urlObj.protocol === 'https:' ? https : http;
    const body      = Buffer.from(xml, 'utf-8');

    const options = {
      hostname: urlObj.hostname,
      port:     urlObj.port || 9000,
      path:     '/',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/xml',
        'Content-Length': body.length,
      },
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Tally answers every import with a counts block, so the presence of a
        // <CREATED> tag says nothing — a rejected voucher reports
        // <CREATED>0</CREATED> alongside the reason. Read the numbers.
        const count = (tag) => {
          const m = new RegExp(`<${tag}>(-?\\d+)</${tag}>`).exec(data);
          return m ? Number(m[1]) : 0;
        };
        const created    = count('CREATED');
        const problems   = count('ERRORS') + count('EXCEPTIONS');
        const lineErrors = [...data.matchAll(/<LINEERROR>([\s\S]*?)<\/LINEERROR>/g)]
          .map(m => m[1].trim().replace(/&apos;/g, "'").replace(/&amp;/g, '&'));

        if (created >= 1 && problems === 0 && lineErrors.length === 0) {
          return resolve({ success: true, created, response: data });
        }
        if (lineErrors.length) return reject(new Error(lineErrors[0]));
        if (created === 0 && problems === 0) {
          return reject(new Error(
            'Tally accepted the request but created nothing. Check that the correct company is open in Tally.'));
        }
        reject(new Error(`Tally rejected the voucher (errors: ${problems}). Check that the ledgers and stock item named in the invoice exist in Tally.`));
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Tally connection timed out. Make sure Tally is open and HTTP server is enabled (port 9000).'));
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH' || err.code === 'ETIMEDOUT') {
        // This request leaves the API server, not the user's browser. When the
        // API runs on a hosted server, "localhost" is that server — never the
        // machine Tally is open on — so a direct push can never work from here.
        reject(new Error(isLoopback(urlObj.hostname)
          ? `Direct push cannot reach Tally at ${tallyUrl}: that address means "this API server", not your PC. Tally runs on your computer, so use "Download XML" and import the file into Tally instead.`
          : `Cannot connect to Tally at ${tallyUrl}. Check that Tally is open there, its HTTP server is on (port 9000), and the address is reachable from the API server.`));
      } else {
        reject(err);
      }
    });

    req.write(body);
    req.end();
  });
};

// ── Voucher as plain data ─────────────────────────────────────
// The XML, JSON and Excel exports all describe the same voucher, so they are
// built from one structure — a fix to the accounting shape lands in all three.
const buildVoucherModel = (invoice) => {
  const date = tallyDate(invoice.invoiceDate);
  if (!date) throw new Error('Invoice has no valid invoice date — Tally would reject the voucher.');

  const subtotal = toNum(invoice.subtotal, 0);
  const cgst     = toNum(invoice.cgstAmount, 0);
  const sgst     = toNum(invoice.sgstAmount, 0);
  const igst     = toNum(invoice.igstAmount, 0);
  const freight  = toNum(invoice.transportFreight, 0);
  const tcs      = toNum(invoice.tcsAmount, 0);
  const grand    = toNum(invoice.grandTotal, 0) || toNum(invoice.totalAmount, 0);
  const partyName = tallyPartyLedger(invoice);

  const rows = invoice.items || [];
  const items = rows.map((it) => {
    const rate = toNum(it.rate, 0);
    const weight = toNum(it.weight, 0);
    let qty = weight > 0 ? weight : toNum(it.quantity, 0);
    const amount = toNum(it.amount, 0) || Number((qty * rate).toFixed(2));
    if (rate > 0 && Math.abs(qty * rate - amount) >= 0.01) qty = amount / rate;
    const service = it.processType?.name || it.processName || '';
    const part = (it.description || '').trim();
    return {
      stockItem: tallyStockItemFor(it),
      process: service,
      partName: part,
      description: service && part.toLowerCase() !== service.trim().toLowerCase()
        ? `${service} - ${part}` : (service || part),
      hsnSac: it.hsnSac || it.processType?.hsnSacCode || '',
      quantity: Number(qty.toFixed(3)),
      unit: TALLY_UNIT,
      rate: Number(rate.toFixed(2)),
      amount: Number(amount.toFixed(2)),
      salesLedger: TALLY_LEDGERS.sales,
    };
  });

  const stockValue = items.reduce((s, it) => s + it.amount, 0);
  const taxes = [
    { ledger: TALLY_LEDGERS.cgst,    amount: cgst,    rate: toNum(invoice.cgstRate, 0) },
    { ledger: TALLY_LEDGERS.sgst,    amount: sgst,    rate: toNum(invoice.sgstRate, 0) },
    { ledger: TALLY_LEDGERS.igst,    amount: igst,    rate: toNum(invoice.igstRate, 0) },
    { ledger: TALLY_LEDGERS.freight, amount: freight, rate: null },
    { ledger: TALLY_LEDGERS.tcs,     amount: tcs,     rate: toNum(invoice.tcsRate, 0) },
  ].filter(t => t.amount > 0);

  const residual = Number((grand - taxes.reduce((s, t) => s + t.amount, stockValue)).toFixed(2));
  if (Math.abs(residual) >= 0.01) taxes.push({ ledger: TALLY_LEDGERS.roundOff, amount: residual, rate: null });

  return {
    voucherType: 'Sales',
    voucherNumber: invoice.invoiceNo,
    // Same key the XML carries, so a system consuming the JSON can be
    // idempotent too.
    remoteId: tallyRemoteId(invoice),
    date,
    dateISO: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    party: partyName,
    partyGstin: invoice.toParty?.gstin || '',
    company: TALLY_COMPANY || null,
    references: {
      challan: invoice.challanRef || '',
      po:      invoice.poRef      || '',
      jobCard: invoice.jobCardRef || '',
    },
    eInvoice: {
      irn:        invoice.irnNo   || '',
      ackNo:      invoice.ackNo   || '',
      ackDate:    tallyDate(invoice.ackDate)       || '',
      eWayBillNo: invoice.eWayBillNo               || '',
      eWayBillDate: tallyDate(invoice.eWayBillDate) || '',
    },
    items,
    taxes,
    subtotal: Number(stockValue.toFixed(2)),
    grandTotal: Number(grand.toFixed(2)),
  };
};

// ── Option C: Tally JSON ─────────────────────────────────────
exports.getTallyJson = async (req, res) => {
  try {
    const id      = toInt(req.params.id);
    const invoice = await fetchFullInvoice(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const v = buildVoucherModel(invoice);
    const filename = `${invoice.invoiceNo.replace(/\//g, '-')}_tally.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(v, null, 2));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Error generating JSON.' });
  }
};

// ── Option D: Tally Excel ────────────────────────────────────
exports.getTallyExcel = async (req, res) => {
  try {
    const id      = toInt(req.params.id);
    const invoice = await fetchFullInvoice(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const v  = buildVoucherModel(invoice);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SVT ERP';

    const ws = wb.addWorksheet('Voucher');
    ws.columns = [
      { header: 'Date',          key: 'date',    width: 12 },
      { header: 'Voucher Type',  key: 'vtype',   width: 14 },
      { header: 'Voucher No',    key: 'vno',     width: 20 },
      { header: 'Party Ledger',  key: 'party',   width: 34 },
      { header: 'Item',          key: 'item',    width: 26 },
      { header: 'Description',   key: 'desc',    width: 40 },
      { header: 'HSN/SAC',       key: 'hsn',     width: 10 },
      { header: 'Quantity',      key: 'qty',     width: 11 },
      { header: 'Unit',          key: 'unit',    width: 7  },
      { header: 'Rate',          key: 'rate',    width: 10 },
      { header: 'Amount',        key: 'amount',  width: 13 },
      { header: 'Sales Ledger',  key: 'ledger',  width: 26 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };

    for (const it of v.items) {
      ws.addRow({
        date: v.dateISO, vtype: v.voucherType, vno: v.voucherNumber, party: v.party,
        item: it.stockItem, desc: it.description, hsn: it.hsnSac,
        qty: it.quantity, unit: it.unit, rate: it.rate, amount: it.amount, ledger: it.salesLedger,
      });
    }
    for (const t of v.taxes) {
      ws.addRow({ date: v.dateISO, vtype: v.voucherType, vno: v.voucherNumber, party: v.party,
        desc: t.ledger, amount: t.amount, ledger: t.ledger });
    }
    const totalRow = ws.addRow({ desc: 'GRAND TOTAL', amount: v.grandTotal });
    totalRow.font = { bold: true };
    ws.getColumn('qty').numFmt    = '0.000';
    ws.getColumn('rate').numFmt   = '0.00';
    ws.getColumn('amount').numFmt = '0.00';

    // A second sheet so whoever opens it can see the voucher as accountants read it.
    const s = wb.addWorksheet('Summary');
    s.columns = [{ header: 'Field', key: 'k', width: 24 }, { header: 'Value', key: 'v', width: 46 }];
    s.getRow(1).font = { bold: true };
    [['Invoice No', v.voucherNumber], ['Date', v.dateISO], ['Party', v.party],
     ['Party GSTIN', v.partyGstin], ['Challan Ref', v.references.challan],
     ['PO Ref', v.references.po], ['Job Card Ref', v.references.jobCard],
     ['Taxable Value', v.subtotal], ...v.taxes.map(t => [t.ledger, t.amount]),
     ['Grand Total', v.grandTotal]].forEach(([k, val]) => s.addRow({ k, v: val }));

    const filename = `${invoice.invoiceNo.replace(/\//g, '-')}_tally.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Error generating Excel.' });
  }
};

// ── Helper: fetch full invoice for XML ────────────────────────
const fetchFullInvoice = (id) => prisma.taxInvoice.findUnique({
  where:   { id },
  include: { fromParty: true, toParty: true, items: { include: { processType: true } } },
});

// ── Option B: Download Tally XML ─────────────────────────────
exports.getTallyXml = async (req, res) => {
  try {
    const id      = toInt(req.params.id);
    const invoice = await fetchFullInvoice(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const xml      = buildTallyXML(invoice);
    const filename = `${invoice.invoiceNo.replace(/\//g, '-')}_tally.xml`;

    if (!invoice.sentToTally) {
      await prisma.taxInvoice.update({ where: { id }, data: { xmlDownloadedAt: new Date() } });
    }

    res.setHeader('Content-Type',        'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Error generating XML.' });
  }
};

// ── Option A: Send to Tally (push + lock invoice) ─────────────
exports.sendToTally = async (req, res) => {
  try {
    const id       = toInt(req.params.id);
    const tallyUrl = req.body.tallyUrl || 'http://localhost:9000';

    const existing = await fetchFullInvoice(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    if (existing.sentToTally)
      return res.status(400).json({ success: false, message: 'Invoice already sent to Tally and is locked.' });

    const xml = buildTallyXML(existing);

    // Try pushing to Tally
    let tallyResult = null;
    let tallyError  = null;
    try {
      tallyResult = await pushXmlToTally(xml, tallyUrl);
    } catch (err) {
      tallyError = err.message;
    }

    if (tallyError) {
      // Option A failed — return error, do NOT lock invoice yet
      return res.status(502).json({
        success: false,
        message: tallyError,
        hint: 'Use "Download XML" (Option B) to manually import into Tally.',
      });
    }

    // Push succeeded — now lock the invoice
    const invoice = await prisma.taxInvoice.update({
      where: { id },
      data:  { sentToTally: true, sentToTallyAt: new Date() },
    });

    res.json({
      success: true,
      data:    invoice,
      message: `Invoice ${existing.invoiceNo} pushed to Tally and locked.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Mark as sent to Tally manually (after Option B import) ────
exports.markSentToTally = async (req, res) => {
  try {
    const id = toInt(req.params.id);

    const existing = await prisma.taxInvoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    if (existing.sentToTally)
      return res.status(400).json({ success: false, message: 'Invoice already locked.' });

    const invoice = await prisma.taxInvoice.update({
      where: { id },
      data:  { sentToTally: true, sentToTallyAt: new Date() },
    });

    res.json({ success: true, data: invoice, message: `Invoice ${existing.invoiceNo} marked as sent to Tally and locked.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Export Invoices ──────────────────────────────────────────
exports.exportInvoices = async (req, res) => {
  try {
    const format = req.params.format || 'xlsx'; // 'pdf' or 'xlsx'
    
    if (!['pdf', 'xlsx'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Invalid format. Use pdf or xlsx.' });
    }

    // Fetch all invoices with party details
    const invoices = await prisma.taxInvoice.findMany({
      select: {
        id: true,
        invoiceNo: true,
        fromParty:  { select: { name: true } },
        toParty:    { select: { name: true } },
        totalAmount: true,
        invoiceDate: true,
        paymentStatus: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const filename = `invoices_${Date.now()}.${format}`;
    const filepath = await exportInvoices(invoices, format);
    
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: 'Error exporting invoices.' });
  }
};
