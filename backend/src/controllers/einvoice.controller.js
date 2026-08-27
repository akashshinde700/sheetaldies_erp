/**
 * GST e-Invoice (IRP / NIC) support.
 *
 * Do taraf ka kaam:
 *   1. Invoice ko NIC ke "Invoice Bulk Upload" JSON schema (v1.1) me nikaalna,
 *      jise einvoice1.gst.gov.in par upload karke IRN generate hota hai.
 *   2. Portal se wapas aayi result Excel ko padh kar IRN / Ack / e-Way Bill
 *      wapas invoice par save karna.
 *
 * Is ERP ka IRP se seedha API connection nahi hai — beech me user portal par
 * jaata hai. Isliye dono taraf file ke through hota hai.
 */

const ExcelJS = require('exceljs');
const prisma = require('../utils/prisma');
const { toInt, toNum, toMoney } = require('../utils/normalize');

// NIC document number ki seema: 16 character, aur pehla character
// alphanumeric hona chahiye (0, / ya - se shuru nahi ho sakta).
const NIC_DOC_NO_MAX = 16;

const fetchFullInvoice = (id) => prisma.taxInvoice.findUnique({
  where: { id },
  include: { fromParty: true, toParty: true, items: { include: { processType: true } } },
});

/** DD/MM/YYYY — NIC isi format me date leta hai. */
const nicDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};

/** GSTIN ke pehle do digit hi state code hote hain — yahi POS bhi banta hai. */
const stateCodeOf = (party) => {
  const fromGstin = String(party?.gstin || '').trim().slice(0, 2);
  if (/^\d{2}$/.test(fromGstin)) return fromGstin;
  const explicit = String(party?.stateCode || '').trim();
  return /^\d{1,2}$/.test(explicit) ? explicit.padStart(2, '0') : '';
};

const pinOf = (party) => {
  let digits = String(party?.pinCode || '').replace(/\D/g, '');
  if (digits.length !== 6) {
    // pinCode field khali hai — address me se 6-digit PIN nikaal lo
    // (jaise "… PCNTDA, Bhosari, Pune - 411026"). Aakhri wala lete hain.
    const found = String(party?.address || '').match(/(?<!\d)\d{6}(?!\d)/g);
    if (found && found.length) digits = found[found.length - 1];
  }
  return digits.length === 6 ? Number(digits) : null;
};

/** NIC 100 char se lamba address reject karta hai. */
const addr = (party) => String(party?.address || '').replace(/\s+/g, ' ').trim().slice(0, 100);

/**
 * Invoice ko upload se pehle jaanchna. Portal ki error report padhne se behtar
 * hai ki galtiyan yahin pakad li jayen.
 * @returns {string[]} problems — khali array matlab sab theek
 */
const validateForIrp = (invoice) => {
  const problems = [];
  const seller = invoice.fromParty;
  const buyer = invoice.toParty;

  const docNo = String(invoice.invoiceNo || '');
  if (docNo.length > NIC_DOC_NO_MAX) {
    problems.push(`Invoice number "${docNo}" ${docNo.length} character ka hai — NIC sirf ${NIC_DOC_NO_MAX} tak leta hai.`);
  }
  if (/^[0/-]/.test(docNo)) {
    problems.push(`Invoice number "${docNo}" 0, / ya - se shuru nahi ho sakta.`);
  }

  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(seller?.gstin || '').trim())) {
    problems.push(`Seller (${seller?.name || 'unknown'}) ka GSTIN theek nahi hai.`);
  }
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(buyer?.gstin || '').trim())) {
    problems.push(`Buyer (${buyer?.name || 'unknown'}) ka GSTIN theek nahi hai — e-invoice sirf B2B ke liye hai.`);
  }
  if (!pinOf(seller)) problems.push('Seller ka 6-digit PIN code nahi hai.');
  if (!pinOf(buyer)) problems.push('Buyer ka 6-digit PIN code nahi hai.');
  if (!stateCodeOf(seller)) problems.push('Seller ka state code nahi mila.');
  if (!stateCodeOf(buyer)) problems.push('Buyer ka state code nahi mila.');

  if (!invoice.items?.length) problems.push('Invoice me koi item nahi hai.');
  invoice.items?.forEach((it, i) => {
    const hsn = String(it.hsnSac || it.processType?.hsnSacCode || '').trim();
    if (!/^\d{4,8}$/.test(hsn)) {
      problems.push(`Item ${i + 1} ("${it.description}") ka HSN/SAC code nahi hai ya galat hai.`);
    }
  });

  return problems;
};

/**
 * NIC "Invoice Bulk Upload" schema v1.1. Portal array leta hai, isliye ek
 * invoice bhi array me hi jaata hai.
 */
const buildEInvoiceJson = (invoice) => {
  const seller = invoice.fromParty;
  const buyer = invoice.toParty;

  const igst = toNum(invoice.igstAmount, 0);
  const isInterState = igst > 0;

  const items = (invoice.items || []).map((it, i) => {
    const hsn = String(it.hsnSac || it.processType?.hsnSacCode || '').trim();
    // 99xx = SAC, yaani service. Heat treatment job work service hi hai.
    const isService = hsn.startsWith('99');

    const qty = toNum(it.weight, 0) > 0 ? toNum(it.weight, 0) : toNum(it.quantity, 0);
    const assAmt = toMoney(it.amount);
    const rate = toNum(it.rate, 0);

    // Har item par utni hi GST rate lagti hai jitni poore invoice par —
    // is ERP me rate invoice level par rakhi jaati hai, item level par nahi.
    const gstRt = isInterState
      ? toNum(invoice.igstRate, 0)
      : toNum(invoice.cgstRate, 0) + toNum(invoice.sgstRate, 0);

    const cgstAmt = isInterState ? 0 : toMoney((assAmt * toNum(invoice.cgstRate, 0)) / 100);
    const sgstAmt = isInterState ? 0 : toMoney((assAmt * toNum(invoice.sgstRate, 0)) / 100);
    const igstAmt = isInterState ? toMoney((assAmt * toNum(invoice.igstRate, 0)) / 100) : 0;

    return {
      SlNo: String(i + 1),
      PrdDesc: String(it.description || '').slice(0, 300),
      IsServc: isService ? 'Y' : 'N',
      HsnCd: hsn,
      Qty: Number(qty.toFixed(3)),
      Unit: String(it.unit || 'KGS').toUpperCase().slice(0, 8),
      UnitPrice: Number(rate.toFixed(3)),
      TotAmt: assAmt,
      AssAmt: assAmt,
      GstRt: Number(gstRt.toFixed(3)),
      CgstAmt: cgstAmt,
      SgstAmt: sgstAmt,
      IgstAmt: igstAmt,
      TotItemVal: toMoney(assAmt + cgstAmt + sgstAmt + igstAmt),
    };
  });

  // Transport/freight aur extra charges NIC me OthChrg me jaate hain.
  const othChrg = toMoney(toNum(invoice.transportFreight, 0) + toNum(invoice.extraAmt, 0));

  return [{
    Version: '1.1',
    TranDtls: { TaxSch: 'GST', SupTyp: 'B2B', RegRev: 'N', IgstOnIntra: 'N' },
    DocDtls: {
      Typ: 'INV',
      // Poora number jaata hai, kaata nahi. Agar 16 se lamba hai to portal
      // reject karega — ye theek hai. Kaat dene par IRN kisi aur number par
      // ban jaata aur Excel wapas import karte waqt kabhi match hi na hota.
      No: String(invoice.invoiceNo || ''),
      Dt: nicDate(invoice.invoiceDate),
    },
    SellerDtls: {
      Gstin: String(seller?.gstin || '').trim(),
      LglNm: String(seller?.name || '').slice(0, 100),
      Addr1: addr(seller),
      Loc: String(seller?.city || '').slice(0, 50),
      Pin: pinOf(seller),
      Stcd: stateCodeOf(seller),
    },
    BuyerDtls: {
      Gstin: String(buyer?.gstin || '').trim(),
      LglNm: String(buyer?.name || '').slice(0, 100),
      // Place of supply — inter-state ya intra-state ka faisla isi se hota hai.
      Pos: stateCodeOf(buyer),
      Addr1: addr(buyer),
      Loc: String(buyer?.city || '').slice(0, 50),
      Pin: pinOf(buyer),
      Stcd: stateCodeOf(buyer),
    },
    ItemList: items,
    ValDtls: {
      AssVal: toMoney(invoice.subtotal),
      CgstVal: toMoney(invoice.cgstAmount),
      SgstVal: toMoney(invoice.sgstAmount),
      IgstVal: toMoney(invoice.igstAmount),
      OthChrg: othChrg,
      TotInvVal: toMoney(invoice.grandTotal),
    },
  }];
};

// ── Download: NIC bulk-upload JSON ───────────────────────────
exports.getEInvoiceJson = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const invoice = await fetchFullInvoice(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const problems = validateForIrp(invoice);
    // Galtiyan rokti nahi — file phir bhi milti hai, par header me chetavni
    // jaati hai taaki UI upload se pehle bata sake.
    if (problems.length) {
      res.setHeader('X-EInvoice-Warnings', encodeURIComponent(JSON.stringify(problems)));
    }

    const json = buildEInvoiceJson(invoice);
    const filename = `${invoice.invoiceNo.replace(/\//g, '-')}_einvoice.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'X-EInvoice-Warnings');
    res.send(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Error generating e-Invoice JSON.' });
  }
};

// ── Pehle se jaanch (download se pehle UI dikha sake) ────────
exports.checkEInvoiceReady = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const invoice = await fetchFullInvoice(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    const problems = validateForIrp(invoice);
    res.json({ success: true, data: { ready: problems.length === 0, problems } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Portal ki result Excel wapas padhna ──────────────────────

/** Header ke naam portal/version ke hisaab se badalte hain — dhile match. */
const HEADER_ALIASES = {
  docNo:   ['doc no', 'document no', 'invoice no', 'docno', 'document number', 'invoice number'],
  irn:     ['irn', 'irn no', 'irn number'],
  ackNo:   ['ack no', 'ackno', 'acknowledgement no', 'acknowledgment no', 'ack number'],
  ackDate: ['ack date', 'ackdt', 'acknowledgement date', 'acknowledgment date', 'ack dt'],
  ewbNo:   ['ewb no', 'ewbno', 'eway bill no', 'e-way bill no', 'e way bill no', 'ewaybillno', 'ewb number'],
  ewbDate: ['ewb date', 'ewbdt', 'eway bill date', 'e-way bill date', 'e way bill date', 'ewb dt'],
};

const normHeader = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Excel cell se date — ExcelJS Date de sakta hai ya DD/MM/YYYY string. */
const parseCellDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  // DD/MM/YYYY ya DD-MM-YYYY, optionally time ke saath
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const cellText = (cell) => {
  const v = cell?.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.text) return String(v.text).trim();
    if (v.result !== undefined) return String(v.result).trim();
    if (v.richText) return v.richText.map((r) => r.text).join('').trim();
    return '';
  }
  return String(v).trim();
};

/**
 * Header row dhoondhna — portal ki Excel me upar title/blank rows ho sakti
 * hain, isliye pehli 20 rows me se wo row lete hain jisme "IRN" aur "Doc No"
 * dono mil jayen.
 * @returns {{headerRow:number, colMap:Object}|null}
 */
const locateColumns = (ws) => {
  const maxScan = Math.min(ws.rowCount, 20);
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const map = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const h = normHeader(cellText(cell));
      if (!h) return;
      for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
        if (map[key] === undefined && aliases.includes(h)) map[key] = colNumber;
      }
    });
    if (map.irn !== undefined && map.docNo !== undefined) return { headerRow: r, colMap: map };
  }
  return null;
};

exports.importEInvoiceExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Koi file nahi mili. Portal se download ki hui Excel chuniye.' });
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ success: false, message: 'Excel me koi sheet nahi hai.' });

    const located = locateColumns(ws);
    const headerRow = located?.headerRow;
    const colMap = located?.colMap;

    if (!colMap) {
      return res.status(400).json({
        success: false,
        message: 'Is Excel me "IRN" aur "Doc No" wale column nahi mile. Kya ye portal se download ki hui sahi file hai?',
      });
    }

    const updated = [];
    const notFound = [];
    const skipped = [];

    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const docNo = cellText(row.getCell(colMap.docNo));
      const irn = colMap.irn !== undefined ? cellText(row.getCell(colMap.irn)) : '';
      if (!docNo) continue;
      if (!irn) { skipped.push({ invoiceNo: docNo, reason: 'IRN khali hai' }); continue; }

      const invoice = await prisma.taxInvoice.findUnique({ where: { invoiceNo: docNo } });
      if (!invoice) { notFound.push(docNo); continue; }

      const ackNo = colMap.ackNo !== undefined ? cellText(row.getCell(colMap.ackNo)) : '';
      const ackDate = colMap.ackDate !== undefined ? parseCellDate(row.getCell(colMap.ackDate).value) : null;
      const ewbNo = colMap.ewbNo !== undefined ? cellText(row.getCell(colMap.ewbNo)) : '';
      const ewbDate = colMap.ewbDate !== undefined ? parseCellDate(row.getCell(colMap.ewbDate).value) : null;

      await prisma.taxInvoice.update({
        where: { id: invoice.id },
        data: {
          irnNo: irn.slice(0, 100),
          ...(ackNo && { ackNo: ackNo.slice(0, 50) }),
          ...(ackDate && { ackDate }),
          ...(ewbNo && { eWayBillNo: ewbNo.slice(0, 50) }),
          ...(ewbDate && { eWayBillDate: ewbDate }),
        },
      });

      updated.push({ invoiceNo: docNo, irn: irn.slice(0, 20) + '…', eWayBillNo: ewbNo || null });
    }

    res.json({
      success: true,
      data: { updated, notFound, skipped },
      message: `${updated.length} invoice update hui${notFound.length ? `, ${notFound.length} nahi mili` : ''}.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Excel padhne me dikkat hui.' });
  }
};

module.exports.buildEInvoiceJson = buildEInvoiceJson;
module.exports.validateForIrp = validateForIrp;
// Test ke liye — parser ka wo hissa jo portal ke column naam pehchanta hai.
module.exports.locateColumns = locateColumns;
module.exports.parseCellDate = parseCellDate;
