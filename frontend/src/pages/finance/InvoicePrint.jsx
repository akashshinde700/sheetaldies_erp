import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

// ── SVT Company Constants ─────────────────────────────────────
const SVT = {
  name:    'SHITAL VACUUM TREAT PVT. LTD.',
  address: 'Plot No. 84/1, Sector No. 10, PCNTDA, Bhosari, Pune - 411020',
  gstin:   '27AATCS0577L1ZK',
  pan:     'AATCS0577L',
  cin:     'U29253PN2013PTC146364',
  msme:    'UDYAM-MH-26 0006664',
  msmeType:'Small',
  state:   'Maharashtra',
  stateCode:'27',
  jurisdiction: 'PUNE',
  bank: {
    name:    'Kotak Mahindra Bank',
    holder:  'SHITAL VACUUM TREAT PVT. LTD.',
    acNo:    '6601016330',
    ifsc:    'KKBN0001768',
    branch:  'Wakad Road, Hinjewadi',
    vatTin:  '27501011577V',
    cstNo:   '27501011577C',
  },
};

// ── Helpers ───────────────────────────────────────────────────
function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }

function fmt(v, dec = 2) {
  return n(v).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}
function belowThousand(n) {
  if (n < 100) return belowHundred(n);
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + belowHundred(n % 100) : '');
}
function numberToWords(amount) {
  if (!amount || amount === 0) return 'Zero Only';
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let words = '';
  if (rupees >= 10000000) words += belowThousand(Math.floor(rupees / 10000000)) + ' Crore ';
  if (rupees % 10000000 >= 100000) words += belowThousand(Math.floor((rupees % 10000000) / 100000)) + ' Lakh ';
  if (rupees % 100000 >= 1000) words += belowThousand(Math.floor((rupees % 100000) / 1000)) + ' Thousand ';
  if (rupees % 1000 >= 100) words += ONES[Math.floor((rupees % 1000) / 100)] + ' Hundred ';
  if (rupees % 100) words += belowHundred(rupees % 100) + ' ';
  // "Only" closes the whole amount, so the paise have to be said before it:
  // "One Hundred Ninety Four and Twenty Two Paise Only".
  words = words.trim();
  if (paise > 0) words += `${words ? ' and ' : ''}${belowHundred(paise)} Paise`;
  return 'INR ' + `${words} Only`.trim();
}

// ── Cell/border helpers ───────────────────────────────────────
const B = '1px solid black';
const tdStyle = (extra = {}) => ({ border: B, padding: '3px 5px', ...extra });

// Job work is billed on weight when a weight is recorded, otherwise on the
// piece count — that is the figure the rate multiplies, so it drives the "per"
// unit too.
const billedOnWeight = (it) => n(it.weight) > 0;
const perUnit = (it) => (billedOnWeight(it) ? 'Kgs' : (it.unit || 'Nos'));
// `it.unit` stores the *billing* unit (KGS/PCS/LOT), not the unit the
// physical Quantity count is in — a KGS-billed line's quantity is still a
// piece count, so labelling it "KGS" (as if quantity itself were kilos) is
// wrong. The Quantity column always shows a piece/lot count, so a KGS
// billing unit maps to Nos there; PCS/LOT print as-is.
const qtyUnitOf = (it) => {
  const u = (it.unit || 'Nos').toUpperCase();
  return u === 'KGS' ? 'Nos' : (it.unit || 'Nos');
};
// A piece count is a whole number and should print as one: 12, not 12.000.
const qtyText = (v) => {
  const x = n(v);
  return Number.isInteger(x) ? String(x) : String(Number(x.toFixed(3)));
};

// What is actually being sold is the heat-treatment process, not the customer's
// part — so that is what "Description of Services" leads with. Lines saved
// before a process was linked, or free-typed lines, still have only the
// description to fall back on.
const serviceName = (it) => it.processType?.name || it.processName || it.description || '';
// The part name only repeats underneath when it adds something.
const partName = (it) => {
  const d = (it.description || '').trim();
  return d && d.toLowerCase() !== serviceName(it).trim().toLowerCase() ? d : '';
};

export default function InvoicePrint() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

  useEffect(() => {
    api.get(`/invoices/${id}`)
      .then(r => setInv(r.data.data))
      .catch(() => setError('Invoice not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  // No IRP integration here — this ERP doesn't submit invoices to the
  // government e-invoice portal itself, so there's no authenticated/signed
  // government QR payload to reproduce. Once someone manually records the
  // IRN/Ack details (after submitting externally), this encodes them plus
  // the core invoice facts into a QR purely so the printed copy carries a
  // scannable reference — not a substitute for the real IRP-issued QR.
  useEffect(() => {
    if (!inv?.irnNo) { setQrDataUrl(null); return; }
    const payload = JSON.stringify({
      irn: inv.irnNo,
      ackNo: inv.ackNo || '',
      ackDt: inv.ackDate ? inv.ackDate.slice(0, 10) : '',
      invNo: inv.invoiceNo,
      invDt: inv.invoiceDate ? inv.invoiceDate.slice(0, 10) : '',
      sellerGstin: inv.fromParty?.gstin || '',
      buyerGstin: inv.toParty?.gstin || '',
      amt: inv.grandTotal || inv.totalAmount || 0,
    });
    QRCode.toDataURL(payload, { margin: 0, width: 120 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [inv]);

  // 1st view of this invoice = ORIGINAL, next = DUPLICATE, 3rd onward = EXTRA
  // — matches a physical multi-copy invoice book. printCount reflects prints
  // already registered as of page load; it's bumped when the user actually
  // clicks Print/Save PDF (not on load, so refreshes don't burn a copy).
  const COPY_LABELS = ['(ORIGINAL FOR RECIPIENT)', '(DUPLICATE FOR SUPPLIER)', '(EXTRA COPY)'];
  const copyLabel = COPY_LABELS[Math.min(n(inv?.printCount), 2)];

  const handlePrint = async () => {
    try { await api.post(`/invoices/${id}/register-print`); } catch { /* non-blocking */ }
    window.print();
  };

  const derived = useMemo(() => {
    if (!inv) return {};
    const subtotal  = n(inv.subtotal);
    const cgstAmt   = n(inv.cgstAmount);
    const sgstAmt   = n(inv.sgstAmount);
    const igstAmt   = n(inv.igstAmount);
    const grand     = n(inv.grandTotal || inv.totalAmount);
    const totalTax  = cgstAmt + sgstAmt + igstAmt;
    const items     = inv.items || [];
    const totalWt   = items.reduce((s, it) => s + n(it.weight), 0);
    const totalQty  = items.reduce((s, it) => s + n(it.quantity), 0);
    // Adding a piece count to a weight would be meaningless, so the quantity
    // total is only shown when every line is counted in the same unit. Uses
    // qtyUnitOf so a KGS-billed line (quantity = piece count, not kilos)
    // groups under Nos here too, matching each line's own Quantity cell.
    const qtyUnits  = new Set(items.map(it => qtyUnitOf(it).toUpperCase()));
    const qtyUnit   = qtyUnits.size === 1 ? [...qtyUnits][0] : null;

    const hsnMap = {};
    for (const it of (inv.items || [])) {
      const key = it.hsnSac || '998873';
      hsnMap[key] = (hsnMap[key] || 0) + n(it.amount);
    }
    // Round each cell to paise before it is shown, so the HSN rows visibly add
    // up to the totals underneath (which come from the stored, rounded figures).
    const paise = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
    const hsnRows = Object.entries(hsnMap).map(([hsn, taxable]) => {
      const cgst = paise(taxable * n(inv.cgstRate) / 100);
      const sgst = paise(taxable * n(inv.sgstRate) / 100);
      const igst = paise(taxable * n(inv.igstRate) / 100);
      return {
        hsn,
        taxable: paise(taxable),
        cgstRate: n(inv.cgstRate), cgst,
        sgstRate: n(inv.sgstRate), sgst,
        igstRate: n(inv.igstRate), igst,
        total: paise(cgst + sgst + igst),
      };
    });

    return { subtotal, cgstAmt, sgstAmt, igstAmt, grand, totalTax, totalWt, totalQty, qtyUnit, hsnRows };
  }, [inv]);

  if (loading) return <div className="p-4 text-slate-400 text-sm">Loading…</div>;
  if (error || !inv) return (
    <div className="p-4 space-y-2">
      <p className="text-slate-500 text-sm">{error || 'Invoice not found.'}</p>
      <Link to="/invoices" className="text-indigo-600 text-sm hover:underline">← Back</Link>
    </div>
  );

  const supplier  = inv.fromParty || {};
  const customer  = inv.toParty   || {};
  const items     = inv.items     || [];
  // Invoices saved before this was a choice have no flag and kept showing the
  // part name, so an absent value means "show".
  const showParts = inv.showPartName !== false;
  const hasIGST   = n(inv.igstRate) > 0;
  // An out-of-state buyer must not be printed as Maharashtra — the state and
  // place of supply are what decide IGST vs CGST+SGST.
  const custState     = customer.state     || SVT.state;
  const custStateCode = customer.stateCode || (customer.gstin || '').slice(0, 2) || SVT.stateCode;

  const amtWords  = numberToWords(n(derived.grand));
  const taxWords  = numberToWords(n(derived.totalTax));

  return (
    <div className="bg-slate-100 py-4 print:bg-white print:py-0">
      <style>{`
        @page { margin: 0mm; size: A4 portrait; }
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; }
          html, body { margin: 0 !important; padding: 4mm !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print max-w-[960px] mx-auto mb-3 flex items-center gap-2 px-2">
        <Link to={`/invoices/${id}`} className="btn-ghost text-sm">← Back</Link>
        <button className="btn-primary ml-auto text-sm" onClick={handlePrint}>Print / Save PDF</button>
      </div>

      <div className="page max-w-[960px] mx-auto bg-white shadow-lg"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', border: B }}>

        {/* ── TITLE ROW ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle(), width: '50%', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', borderRight: B }}>
                Tax Invoice
              </td>
              <td style={{ ...tdStyle(), textAlign: 'center', fontSize: '11px', borderRight: B }}>
                {copyLabel}
              </td>
              <td style={{ ...tdStyle(), textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '110px' }}>
                e-Invoice
                {qrDataUrl && (
                  <div style={{ marginTop: 4 }}>
                    <img src={qrDataUrl} alt="e-Invoice QR" style={{ width: 80, height: 80 }} />
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── IRN / ACK ROW ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle(), width: '15%', fontWeight: 'bold' }}>IRN</td>
              <td style={{ ...tdStyle(), fontFamily: 'monospace', fontSize: '9px', wordBreak: 'break-all' }} colSpan={3}>
                {inv.irnNo || ''}
              </td>
            </tr>
            <tr>
              <td style={{ ...tdStyle(), fontWeight: 'bold' }}>Ack No:</td>
              <td style={{ ...tdStyle(), width: '30%', fontFamily: 'monospace' }}>{inv.ackNo || ''}</td>
              <td style={{ ...tdStyle(), fontWeight: 'bold', width: '15%' }}>Ack Date:</td>
              <td style={{ ...tdStyle(), fontFamily: 'monospace' }}>{inv.ackDate ? formatDate(inv.ackDate) : ''}</td>
            </tr>
          </tbody>
        </table>

        {/* ── SUPPLIER + INVOICE REF ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              {/* Supplier details */}
              <td style={{ ...tdStyle(), width: '55%', verticalAlign: 'top', borderRight: B }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: 2 }}>{SVT.name}</div>
                <div>{SVT.address}</div>
                <div style={{ marginTop: 3 }}>
                  <span>MSME / Udyam Type: {SVT.msmeType}</span>
                </div>
                <div>MSME No: {SVT.msme}</div>
                <div style={{ marginTop: 3 }}>
                  <strong>GSTIN/UIN:</strong> <span style={{ fontFamily: 'monospace' }}>{SVT.gstin}</span>
                </div>
                <div><strong>State Name:</strong> {SVT.state}, <strong>Code:</strong> {SVT.stateCode}</div>
                <div>CIN: {SVT.cin}</div>
              </td>

              {/* Invoice ref table */}
              <td style={{ verticalAlign: 'top', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', height: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderTop: 'none', borderLeft: 'none', width: '50%' }}>Invoice No</td>
                      <td style={{ ...tdStyle(), borderTop: 'none', borderRight: 'none' }}>{inv.invoiceNo}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderLeft: 'none' }}>Date</td>
                      <td style={{ ...tdStyle(), borderRight: 'none' }}>{formatDate(inv.invoiceDate)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderLeft: 'none' }}>Delivery Note</td>
                      <td style={{ ...tdStyle(), borderRight: 'none' }}>{inv.challanRef || inv.challan?.challanNo || ''}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderLeft: 'none' }}>Reference No & Date</td>
                      <td style={{ ...tdStyle(), borderRight: 'none' }}>{inv.poRef || ''}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderLeft: 'none' }}>Other References</td>
                      <td style={{ ...tdStyle(), borderRight: 'none' }}>{inv.otherReferences || ''}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderLeft: 'none' }}>Buyer's Order No</td>
                      <td style={{ ...tdStyle(), borderRight: 'none' }}></td>
                    </tr>
                    <tr>
                      <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderLeft: 'none' }}>Dated</td>
                      <td style={{ ...tdStyle(), borderRight: 'none' }}></td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── CONSIGNEE + BUYER ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle({ fontWeight: 'bold', background: '#f8f8f8' }), borderRight: B }}>
                Consignee (Ship to)
              </td>
              <td style={{ ...tdStyle({ fontWeight: 'bold', background: '#f8f8f8' }) }}>
                Buyer (Bill to)
              </td>
            </tr>
            <tr>
              {/* Consignee */}
              <td style={{ ...tdStyle({ verticalAlign: 'top' }), borderRight: B }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{customer.name || '—'}</div>
                <div style={{ marginTop: 2 }}>{customer.address || ''}</div>
                <div style={{ marginTop: 3 }}>
                  <strong>GSTIN/UIN:</strong> <span style={{ fontFamily: 'monospace' }}>{customer.gstin || ''}</span>
                </div>
                <div><strong>State Name:</strong> {custState}, <strong>Code:</strong> {custStateCode}</div>
              </td>
              {/* Buyer (same as consignee for job work) */}
              <td style={{ ...tdStyle({ verticalAlign: 'top' }) }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{customer.name || '—'}</div>
                <div style={{ marginTop: 2 }}>{customer.address || ''}</div>
                <div style={{ marginTop: 3 }}>
                  <strong>GSTIN/UIN:</strong> <span style={{ fontFamily: 'monospace' }}>{customer.gstin || ''}</span>
                </div>
                <div><strong>Place of Supply:</strong> {custState}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── DISPATCH / DELIVERY ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderRight: B, width: '25%' }}>Dispatch Doc No.</td>
              <td style={{ ...tdStyle(), fontFamily: 'monospace', borderRight: B, width: '25%' }}>{inv.dispatchDocNo || inv.invoiceNo}</td>
              <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderRight: B, width: '25%' }}>Delivery Note Date</td>
              <td style={{ ...tdStyle(), fontFamily: 'monospace' }}>{formatDate(inv.dispatchDate || inv.invoiceDate)}</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderRight: B }}>Dispatched through</td>
              <td style={{ ...tdStyle(), borderRight: B }}></td>
              <td style={{ ...tdStyle({ fontWeight: 'bold' }), borderRight: B }}>Destination</td>
              <td style={{ ...tdStyle() }}></td>
            </tr>
          </tbody>
        </table>

        {/* ── ITEMS TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ ...tdStyle({ textAlign: 'center' }), width: '30px' }}>Sl No.</th>
              <th style={{ ...tdStyle() }}>Description of Services</th>
              <th style={{ ...tdStyle({ textAlign: 'center' }), width: '68px' }}>HSN/SAC</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '62px' }}>Quantity</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '72px' }}>Weight</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '62px' }}>Rate</th>
              <th style={{ ...tdStyle({ textAlign: 'center' }), width: '36px' }}>per</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '78px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id}>
                <td style={{ ...tdStyle({ textAlign: 'center', verticalAlign: 'top' }) }}>{i + 1}</td>
                <td style={{ ...tdStyle({ verticalAlign: 'top' }) }}>
                  {/* The service being billed is the process, so that heads the
                      line; the part name sits under it the way it does on the
                      invoices this format was copied from. */}
                  <div style={{ fontWeight: 600 }}>{serviceName(it)}</div>
                  {showParts && partName(it) && <div style={{ fontSize: '9px', color: '#555', fontStyle: 'italic' }}>{partName(it)}</div>}
                  {it.woNo  && <div style={{ fontSize: '9px', color: '#555' }}>WO NO - {it.woNo}</div>}
                  {it.hrc   && <div style={{ fontSize: '9px', color: '#555' }}>{it.hrc}</div>}
                </td>
                <td style={{ ...tdStyle({ textAlign: 'center', fontFamily: 'monospace' }) }}>{it.hsnSac || '998873'}</td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>
                  {qtyText(it.quantity)} {qtyUnitOf(it)}
                </td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>
                  {n(it.weight) > 0 ? `${fmt(it.weight, 3)} Kgs` : ''}
                </td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(it.rate)}</td>
                <td style={{ ...tdStyle({ textAlign: 'center' }) }}>{perUnit(it)}</td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }) }}>{fmt(it.amount)}</td>
              </tr>
            ))}

            {/* Empty rows */}
            {Array.from({ length: Math.max(0, 2 - items.length) }).map((_, i) => (
              <tr key={`e${i}`} style={{ height: '22px' }}>
                {Array.from({ length: 8 }).map((_, c) => <td key={c} style={tdStyle()}></td>)}
              </tr>
            ))}

            {/* Tax lines */}
            {n(inv.cgstRate) > 0 && (
              <tr>
                <td style={{ ...tdStyle(), textAlign: 'right', fontStyle: 'italic' }} colSpan={7}>
                  Central Tax on Sales @ {inv.cgstRate}%
                </td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(derived.cgstAmt)}</td>
              </tr>
            )}
            {n(inv.sgstRate) > 0 && (
              <tr>
                <td style={{ ...tdStyle(), textAlign: 'right', fontStyle: 'italic' }} colSpan={7}>
                  State Tax on Sales @ {inv.sgstRate}%
                </td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(derived.sgstAmt)}</td>
              </tr>
            )}
            {n(inv.igstRate) > 0 && (
              <tr>
                <td style={{ ...tdStyle(), textAlign: 'right', fontStyle: 'italic' }} colSpan={7}>
                  Integrated Tax @ {inv.igstRate}%
                </td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(derived.igstAmt)}</td>
              </tr>
            )}

            {/* Total row */}
            <tr style={{ background: '#f8f8f8' }}>
              <td style={{ ...tdStyle({ fontWeight: 'bold' }), textAlign: 'right' }} colSpan={3}>Total</td>
              <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }) }}>
                {derived.qtyUnit ? `${qtyText(derived.totalQty)} ${derived.qtyUnit}` : ''}
              </td>
              <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }) }}>
                {derived.totalWt > 0 ? `${fmt(derived.totalWt, 3)} Kgs` : ''}
              </td>
              <td colSpan={2} style={tdStyle()}></td>
              <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }) }}>
                Rs. {fmt(derived.grand)} E &amp; OE
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── AMOUNT IN WORDS ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle({ fontWeight: 'bold', width: '220px' }) }}>Amount Chargeable (in words)</td>
              <td style={{ ...tdStyle({ fontWeight: 'bold', fontStyle: 'italic' }) }}>{amtWords}</td>
            </tr>
          </tbody>
        </table>

        {/* ── HSN SUMMARY TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ ...tdStyle({ textAlign: 'center' }), width: '80px' }}>HSN/SAC</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '110px' }}>Taxable Value</th>
              <th style={{ ...tdStyle({ textAlign: 'center' }) }} colSpan={2}>Central Tax</th>
              <th style={{ ...tdStyle({ textAlign: 'center' }) }} colSpan={2}>{hasIGST ? 'Integrated Tax' : 'State Tax'}</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }) }}>Total Tax Amount</th>
            </tr>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={tdStyle()}></th>
              <th style={tdStyle()}></th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '50px' }}>Rate</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '80px' }}>Amount</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '50px' }}>Rate</th>
              <th style={{ ...tdStyle({ textAlign: 'right' }), width: '80px' }}>Amount</th>
              <th style={tdStyle()}></th>
            </tr>
          </thead>
          <tbody>
            {derived.hsnRows?.map((r, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle({ textAlign: 'center', fontFamily: 'monospace' }) }}>{r.hsn}</td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(r.taxable)}</td>
                <td style={{ ...tdStyle({ textAlign: 'right' }) }}>{r.cgstRate}%</td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(r.cgst)}</td>
                <td style={{ ...tdStyle({ textAlign: 'right' }) }}>{hasIGST ? r.igstRate : r.sgstRate}%</td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(hasIGST ? r.igst : r.sgst)}</td>
                <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }) }}>{fmt(r.total)}</td>
              </tr>
            ))}
            <tr style={{ background: '#f8f8f8', fontWeight: 'bold' }}>
              <td style={{ ...tdStyle({ textAlign: 'center' }) }}>Total</td>
              <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(derived.subtotal)}</td>
              <td style={tdStyle()}></td>
              <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(derived.cgstAmt)}</td>
              <td style={tdStyle()}></td>
              <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(hasIGST ? derived.igstAmt : derived.sgstAmt)}</td>
              <td style={{ ...tdStyle({ textAlign: 'right', fontFamily: 'monospace' }) }}>{fmt(derived.totalTax)}</td>
            </tr>
          </tbody>
        </table>

        {/* ── BANK DETAILS + TAX WORDS + DECLARATION + SIGNATURE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: B }}>
          <tbody>
            <tr>
              {/* Left: Bank + Declaration */}
              <td style={{ ...tdStyle({ verticalAlign: 'top' }), width: '55%', borderRight: B }}>
                <div style={{ marginBottom: 4 }}>
                  <div><strong>Company's VAT TIN:</strong> {SVT.bank.vatTin}</div>
                  <div><strong>Company's CST No:</strong> {SVT.bank.cstNo}</div>
                  <div><strong>Company's PAN:</strong> {SVT.pan}</div>
                </div>
                {/* Bank details are printed once, in the right-hand block. */}
                <div style={{ marginTop: 6, fontSize: '9px', fontStyle: 'italic', color: '#555' }}>
                  Declaration: We declare that this invoice shows the actual price of the goods
                  described and that all particulars are true and correct.
                </div>
                <div style={{ marginTop: 20, fontSize: '9px', color: '#555' }}>Customer's Seal and Signature</div>
              </td>

              {/* Right: Tax words + For company + Signatures */}
              <td style={{ ...tdStyle({ verticalAlign: 'top' }) }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '9px', color: '#555' }}>Tax Amount (in words)</div>
                  <div style={{ fontWeight: 'bold', fontStyle: 'italic' }}>{taxWords}</div>
                </div>
                <div style={{ marginTop: 6, fontSize: '9px' }}>
                  <div><strong>Company's Bank Details</strong></div>
                  <div>Bank Name: {SVT.bank.name}</div>
                  <div>A/c Holder's Name: {SVT.bank.holder}</div>
                  <div>A/c No: {SVT.bank.acNo}</div>
                  <div>Branch &amp; IFS Code: {SVT.bank.branch} &amp; {SVT.bank.ifsc}</div>
                </div>
                <div style={{ marginTop: 12, textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>
                  for {SVT.name}
                </div>
                <div style={{ marginTop: 4 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ height: '40px' }}>
                        <td style={{ ...tdStyle({ textAlign: 'center', verticalAlign: 'bottom', fontSize: '9px' }), borderRight: B }}>Prepared By</td>
                        <td style={{ ...tdStyle({ textAlign: 'center', verticalAlign: 'bottom', fontSize: '9px' }), borderRight: B }}>Verified by</td>
                        <td style={{ ...tdStyle({ textAlign: 'center', verticalAlign: 'bottom', fontSize: '9px' }) }}>Authorised Signatory</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── FOOTER ── */}
        <div style={{ padding: '4px 6px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555' }}>
          <span>SUBJECT TO {SVT.jurisdiction} JURISDICTION</span>
          <span>This is a Computer Generated Invoice</span>
        </div>
      </div>
    </div>
  );
}
