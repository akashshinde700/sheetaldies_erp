const prisma = require('../utils/prisma');
const http   = require('http');
const https  = require('https');
const { sendEmail, sendSms, sendWhatsApp } = require('../utils/notifications');
const { exportInvoices } = require('../utils/export');
const { toInt, toNum, asArray } = require('../utils/normalize');

const generateInvoiceNo = async (db = prisma) => {
  const y      = new Date().getFullYear().toString().slice(-2);
  const yn     = String(toInt(y, 0) + 1);
  const prefix = `SVH/INV/${y}-${yn}/`;

  const last = await db.taxInvoice.findFirst({
    where:   { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: 'desc' },
  });

  let nextSerial = 1;
  if (last) {
    const parts = last.invoiceNo.split('/');
    const lastSerial = toInt(parts[parts.length - 1], 0) || 0;
    nextSerial = lastSerial + 1;
  }

  let invoiceNo;
  do {
    invoiceNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    const exists = await db.taxInvoice.findUnique({ where: { invoiceNo } });
    if (!exists) break;
    nextSerial++;
  } while (nextSerial < 9999);

  return invoiceNo;
};

const getChallanBillingStatusInternal = async (challanId, db = prisma) => {
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
    for (const ii of inv.items || []) {
      if (!ii.sourceChallanItemId) continue;
      const row = itemMap.get(ii.sourceChallanItemId);
      if (!row) continue;
      row.invoicedQty += toNum(ii.quantity, 0);
    }
  }

  // Remaining is based on dispatched qty (invoice only from dispatched)
  for (const row of itemMap.values()) {
    row.remainingQty = Math.max(0, row.dispatchedQty - row.invoicedQty);
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
exports.list = async (req, res) => {
  try {
    const { paymentStatus, challanId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (challanId)     where.challanId     = toInt(challanId);

    const [total, invoices] = await Promise.all([
      prisma.taxInvoice.count({ where }),
      prisma.taxInvoice.findMany({
        where,
        include: {
          fromParty: { select: { name: true } },
          toParty:   { select: { name: true } },
          challan:   { select: { challanNo: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:  (toInt(page, 1) - 1) * toInt(limit, 20),
        take:  toInt(limit, 20),
      }),
    ]);
    res.json({ success: true, data: invoices, meta: { total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Get single Invoice ────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const invoice = await prisma.taxInvoice.findUnique({
      where: { id: toInt(req.params.id) },
      include: {
        fromParty: true,
        toParty:   true,
        challan:   { select: { id: true, challanNo: true, items: true } },
        items:     { include: { processType: true } },
        createdBy: { select: { name: true } },
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
    const status = await getChallanBillingStatusInternal(challanId);
    if (!status) return res.status(404).json({ success: false, message: 'Challan not found.' });
    res.json({ success: true, data: status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Invoice ────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      invoiceDate, dispatchDate, fromPartyId, toPartyId,
      challanRef, poRef, jobCardRef, otherReferences,
      cgstRate, sgstRate, igstRate,
      transportFreight, tcsRate, extraAmt,
      dispatchDocNo, eWayBillNo,
      items,
    } = req.body;

    if (!fromPartyId || !toPartyId)
      return res.status(400).json({ success: false, message: 'From and To party required.' });

    const parsedItems  = asArray(items);
    const subtotal     = parsedItems.reduce((s, it) => s + toNum(it.amount, 0), 0);
    const cgst         = (subtotal * toNum(cgstRate, 9)) / 100;
    const sgst         = (subtotal * toNum(sgstRate, 9)) / 100;
    const igst         = (subtotal * toNum(igstRate, 0)) / 100;
    const total        = subtotal + cgst + sgst + igst;
    const transport    = toNum(transportFreight, 0);
    const tcsRateVal   = toNum(tcsRate, 0);
    const tcsAmt       = (total * tcsRateVal) / 100;
    const extraAmtVal  = toNum(extraAmt, 0);
    const grandTotal   = total + transport + tcsAmt + extraAmtVal;

    const { challanId } = req.body;

    let invoice = null;
    let invoiceNo = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        invoice = await prisma.$transaction(async (tx) => {
          let txBillingType = 'MANUAL';
          if (challanId) {
            const [challan, existingInvoices] = await Promise.all([
              tx.jobworkChallan.findUnique({
                where:  { id: toInt(challanId) },
                select: { subtotal: true, challanNo: true },
              }),
              tx.taxInvoice.findMany({
                where:  { challanId: toInt(challanId) },
                select: { subtotal: true, invoiceNo: true },
              }),
            ]);

            if (challan) {
              const alreadyInvoiced = existingInvoices.reduce((s, inv) => s + toNum(inv.subtotal, 0), 0);
              const remaining = toNum(challan.subtotal, 0) - alreadyInvoiced;

              if (remaining <= 0.01) {
                throw new Error(`Challan ${challan.challanNo} is already fully invoiced (₹${alreadyInvoiced.toFixed(2)} of ₹${challan.subtotal}). No further billing allowed.`);
              }
              if (subtotal > remaining + 0.01) {
                throw new Error(`Over-invoice! Challan ${challan.challanNo}: total ₹${challan.subtotal}, already billed ₹${alreadyInvoiced.toFixed(2)}, remaining ₹${remaining.toFixed(2)}. Current invoice subtotal ₹${subtotal.toFixed(2)} exceeds remaining.`);
              }

              const status = await getChallanBillingStatusInternal(toInt(challanId), tx);
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
          }

          invoiceNo = await generateInvoiceNo(tx);
          return tx.taxInvoice.create({
            data: {
              invoiceNo,
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
          txErr.message.includes('source challan item')
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
const TALLY_LEDGERS = {
  sales:   'Job Work Service Sales',  // Your sales/income ledger in Tally
  cgst:    'Output CGST',             // CGST payable ledger
  sgst:    'Output SGST',             // SGST payable ledger
  igst:    'Output IGST',             // IGST payable ledger (interstate)
};

const buildTallyXML = (invoice) => {
  const d    = new Date(invoice.invoiceDate);
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

  const subtotal = toNum(invoice.subtotal, 0);
  const cgst     = toNum(invoice.cgstAmount, 0);
  const sgst     = toNum(invoice.sgstAmount, 0);
  const igst     = toNum(invoice.igstAmount, 0);
  const total    = toNum(invoice.totalAmount, 0);
  const partyName = invoice.toParty?.name || 'Customer';

  const narration = [
    `Invoice: ${invoice.invoiceNo}`,
    invoice.challanRef ? `Challan: ${invoice.challanRef}` : '',
    invoice.poRef      ? `PO: ${invoice.poRef}`           : '',
    invoice.jobCardRef ? `Job Card: ${invoice.jobCardRef}`: '',
  ].filter(Boolean).join(' | ');

  // Build credit ledger entries (Sales + Tax)
  let creditEntries = `
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${TALLY_LEDGERS.sales}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${subtotal.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>`;

  if (cgst > 0) creditEntries += `
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${TALLY_LEDGERS.cgst}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${cgst.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>`;

  if (sgst > 0) creditEntries += `
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${TALLY_LEDGERS.sgst}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${sgst.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>`;

  if (igst > 0) creditEntries += `
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${TALLY_LEDGERS.igst}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${igst.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>`;

  // Inventory/service line entries (optional narration per item)
  const itemNarration = (invoice.items || [])
    .map(it => `${it.description} x${it.quantity} ${it.unit} @ ₹${it.rate}`)
    .join('; ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${invoice.invoiceNo}</VOUCHERNUMBER>
            <REFERENCE>${invoice.invoiceNo}</REFERENCE>
            <NARRATION>${narration}${itemNarration ? ' | Items: ' + itemNarration : ''}</NARRATION>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <ISINVOICE>Yes</ISINVOICE>
            <!-- Debit: Party (Customer receivable) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${total.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <!-- Credits: Sales + GST -->
            ${creditEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
};

// ── Push XML to Tally HTTP server ─────────────────────────────
// Tally must be open. Enable: Gateway of Tally → F12 Config → Advanced Config → Enable ODBC Server = Yes (port 9000)
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
        // Tally returns XML with <CREATED> count on success
        if (data.includes('<CREATED>1</CREATED>') || data.includes('<CREATED>')) {
          resolve({ success: true, response: data });
        } else if (data.includes('<LINEERROR>') || data.includes('Error')) {
          // Extract error message from Tally response
          const errMatch = data.match(/<LINEERROR>(.*?)<\/LINEERROR>/s);
          reject(new Error(errMatch ? errMatch[1].trim() : 'Tally rejected the voucher. Check ledger names.'));
        } else {
          resolve({ success: true, response: data });
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Tally connection timed out. Make sure Tally is open and HTTP server is enabled (port 9000).'));
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED')
        reject(new Error('Cannot connect to Tally. Make sure Tally is open and HTTP port (9000) is enabled.'));
      else
        reject(err);
    });

    req.write(body);
    req.end();
  });
};

// ── Helper: fetch full invoice for XML ────────────────────────
const fetchFullInvoice = (id) => prisma.taxInvoice.findUnique({
  where:   { id },
  include: { fromParty: true, toParty: true, items: true },
});

// ── Option B: Download Tally XML ─────────────────────────────
exports.getTallyXml = async (req, res) => {
  try {
    const id      = toInt(req.params.id);
    const invoice = await fetchFullInvoice(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const xml      = buildTallyXML(invoice);
    const filename = `${invoice.invoiceNo.replace(/\//g, '-')}_tally.xml`;

    res.setHeader('Content-Type',        'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generating XML.' });
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
