import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';

function n(v) {
  const x = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(x) ? x : 0;
}

function money(v) {
  const x = n(v);
  return x.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicePrint() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/invoices/${id}`)
      .then(r => setInv(r.data.data))
      .catch(() => setError('Invoice not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const derived = useMemo(() => {
    const subtotal = n(inv?.subtotal);
    const freight = n(inv?.transportFreight);
    const cgstAmt = n(inv?.cgstAmount);
    const sgstAmt = n(inv?.sgstAmount);
    const igstAmt = n(inv?.igstAmount);
    const tcsAmt = n(inv?.tcsAmount);
    const extra = n(inv?.extraAmt);
    const grand = n(inv?.grandTotal || inv?.totalAmount);
    const totalTax = cgstAmt + sgstAmt + igstAmt;

    const hsnSummary = Object.entries(
      (inv?.items || []).reduce((acc, it) => {
        const key = it.hsnSac || '—';
        acc[key] = (acc[key] || 0) + n(it.amount);
        return acc;
      }, {})
    ).map(([hsn, taxable]) => {
      const cgst = taxable * n(inv?.cgstRate) / 100;
      const sgst = taxable * n(inv?.sgstRate) / 100;
      const igst = taxable * n(inv?.igstRate) / 100;
      return { hsn, taxable, cgst, sgst, igst, totalTax: cgst + sgst + igst };
    });

    return { subtotal, freight, cgstAmt, sgstAmt, igstAmt, totalTax, tcsAmt, extra, grand, hsnSummary };
  }, [inv]);

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (error || !inv) return (
    <div className="space-y-2">
      <p className="text-slate-500 text-sm">{error || 'Invoice not found.'}</p>
      <Link to="/invoices" className="text-indigo-600 text-sm hover:underline">← Back</Link>
    </div>
  );

  return (
    <div className="bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; border: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print max-w-[980px] mx-auto mb-3 flex items-center gap-2">
        <Link to={`/invoices/${id}`} className="btn-ghost">← Back</Link>
        <button className="btn-primary ml-auto" type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="page max-w-[980px] mx-auto bg-white shadow-lg border border-slate-200">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="text-xs">
              <div className="font-extrabold text-sm">{inv.fromParty?.name}</div>
              <div className="text-slate-700 whitespace-pre-wrap">{inv.fromParty?.address}</div>
              <div className="text-slate-700 mt-1">
                {inv.fromParty?.gstin && <div><span className="text-slate-500">GSTIN:</span> <span className="font-mono font-bold">{inv.fromParty.gstin}</span></div>}
                {inv.fromParty?.pan && <div><span className="text-slate-500">PAN:</span> <span className="font-mono">{inv.fromParty.pan}</span></div>}
              </div>
            </div>
            <div className="text-center">
              <div className="font-extrabold text-xl tracking-wide">TAX INVOICE</div>
              <div className="text-[10px] text-slate-500 mt-1">(Duplicate for Supplier)</div>
            </div>
            <div className="text-xs text-right">
              <div><span className="text-slate-500">Invoice No:</span> <span className="font-mono font-bold">{inv.invoiceNo}</span></div>
              <div><span className="text-slate-500">Date:</span> <span className="font-mono">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</span></div>
              {inv.dispatchDate && <div><span className="text-slate-500">Dispatch Date:</span> <span className="font-mono">{new Date(inv.dispatchDate).toLocaleDateString('en-IN')}</span></div>}
              {inv.challan?.challanNo && <div><span className="text-slate-500">Delivery Note:</span> <span className="font-mono">{inv.challan.challanNo}</span></div>}
              {inv.poRef && <div><span className="text-slate-500">Reference:</span> <span className="font-mono">{inv.poRef}</span></div>}
              {inv.dispatchDocNo && <div><span className="text-slate-500">Dispatch Doc No:</span> <span className="font-mono">{inv.dispatchDocNo}</span></div>}
            </div>
          </div>

          <div className="mt-4 border border-slate-900">
            <div className="grid grid-cols-2 border-b border-slate-900">
              <div className="p-3 text-xs border-r border-slate-900">
                <div className="font-bold">Customer</div>
                <div className="font-extrabold">{inv.toParty?.name}</div>
                <div className="text-[11px] whitespace-pre-wrap">{inv.toParty?.address}</div>
                {inv.toParty?.gstin && <div className="text-[11px] mt-1"><span className="text-slate-500">GSTIN:</span> <span className="font-mono font-bold">{inv.toParty.gstin}</span></div>}
                {inv.toParty?.stateName && <div className="text-[11px]"><span className="text-slate-500">State:</span> {inv.toParty.stateName}{inv.toParty.stateCode ? `, Code: ${inv.toParty.stateCode}` : ''}</div>}
              </div>
              <div className="p-3 text-xs">
                <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                  <div className="text-slate-500">Challan Ref</div><div className="font-mono">{inv.challanRef || '—'}</div>
                  <div className="text-slate-500">Job Card Ref</div><div className="font-mono">{inv.jobCardRef || '—'}</div>
                  <div className="text-slate-500">Other References</div><div className="font-mono">{inv.otherReferences || '—'}</div>
                  <div className="text-slate-500">E-Way Bill No</div><div className="font-mono">{inv.eWayBillNo || '—'}</div>
                </div>
              </div>
            </div>

            <div className="border-b border-slate-900">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-900">
                    <th className="p-2 text-left w-10">Sl</th>
                    <th className="p-2 text-left">Description of Services</th>
                    <th className="p-2 text-center w-20">HSN/SAC</th>
                    <th className="p-2 text-right w-20">Qty</th>
                    <th className="p-2 text-right w-20">Rate</th>
                    <th className="p-2 text-center w-14">per</th>
                    <th className="p-2 text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(inv.items || []).map((it, i) => (
                    <tr key={it.id} className="border-b border-slate-200">
                      <td className="p-2 font-mono text-slate-600">{i + 1}</td>
                      <td className="p-2 whitespace-pre-wrap">
                        <div className="font-semibold">{it.description}</div>
                        <div className="text-[10px] text-slate-600">{it.material ? `Material: ${it.material}` : ''}{it.hrc ? ` · HRC: ${it.hrc}` : ''}{it.woNo ? ` · WO: ${it.woNo}` : ''}</div>
                      </td>
                      <td className="p-2 text-center font-mono">{it.hsnSac || '—'}</td>
                      <td className="p-2 text-right font-mono">{it.weight ? n(it.weight).toFixed(3) : (it.quantity || 0)}</td>
                      <td className="p-2 text-right font-mono">{money(it.rate)}</td>
                      <td className="p-2 text-center">{it.unit || 'Kgs'}</td>
                      <td className="p-2 text-right font-mono font-bold">{money(it.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2 font-bold" colSpan={6}>Subtotal</td>
                    <td className="p-2 text-right font-mono font-bold">{money(derived.subtotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2">
              <div className="p-3 text-xs border-r border-slate-900">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Amount Chargeable (in words)</div>
                <div className="text-sm font-bold text-slate-800">{inv.amountInWords || '—'}</div>

                <div className="mt-4 text-[10px] font-bold text-slate-500 uppercase">Declaration</div>
                <div className="text-[10px] text-slate-600 italic leading-relaxed">
                  We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.
                </div>

                <div className="mt-6 text-[10px] text-slate-500">Customer's Seal and Signature</div>
                <div className="h-10" />
              </div>
              <div className="p-3 text-xs">
                <div className="space-y-1">
                  {derived.freight > 0 && <div className="flex justify-between"><span>Transport / Freight</span><span className="font-mono">{money(derived.freight)}</span></div>}
                  {derived.cgstAmt > 0 && <div className="flex justify-between"><span>CGST @ {inv.cgstRate}%</span><span className="font-mono">{money(derived.cgstAmt)}</span></div>}
                  {derived.sgstAmt > 0 && <div className="flex justify-between"><span>SGST @ {inv.sgstRate}%</span><span className="font-mono">{money(derived.sgstAmt)}</span></div>}
                  {derived.igstAmt > 0 && <div className="flex justify-between"><span>IGST @ {inv.igstRate}%</span><span className="font-mono">{money(derived.igstAmt)}</span></div>}
                  {derived.tcsAmt > 0 && <div className="flex justify-between"><span>TCS @ {inv.tcsRate}%</span><span className="font-mono">{money(derived.tcsAmt)}</span></div>}
                  {derived.extra > 0 && <div className="flex justify-between"><span>Extra Amount</span><span className="font-mono">{money(derived.extra)}</span></div>}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between font-extrabold text-base">
                  <span>Grand Total</span>
                  <span className="font-mono">{money(derived.grand)}</span>
                </div>

                <div className="mt-3 text-[10px] font-bold text-slate-500 uppercase">Tax Amount (in words)</div>
                <div className="text-[11px] font-semibold text-slate-700">{inv.taxAmountInWords || '—'}</div>

                <div className="mt-4 pt-3 border-t border-slate-900">
                  <div className="text-right text-xs font-bold">For {inv.fromParty?.name}</div>
                  <div className="h-10" />
                  <div className="text-right text-[10px] text-slate-500">Authorised Signatory</div>
                </div>
              </div>
            </div>

            {/* HSN/SAC Summary */}
            <div className="border-t border-slate-900">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-900">
                    <th className="p-2 text-left">HSN/SAC</th>
                    <th className="p-2 text-right">Taxable Value</th>
                    <th className="p-2 text-right">CGST</th>
                    <th className="p-2 text-right">SGST</th>
                    {n(inv.igstRate) > 0 && <th className="p-2 text-right">IGST</th>}
                    <th className="p-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {derived.hsnSummary.map((r) => (
                    <tr key={r.hsn} className="border-b border-slate-200">
                      <td className="p-2 font-mono">{r.hsn}</td>
                      <td className="p-2 text-right font-mono">{money(r.taxable)}</td>
                      <td className="p-2 text-right font-mono">{money(r.cgst)}</td>
                      <td className="p-2 text-right font-mono">{money(r.sgst)}</td>
                      {n(inv.igstRate) > 0 && <td className="p-2 text-right font-mono">{money(r.igst)}</td>}
                      <td className="p-2 text-right font-mono font-bold">{money(r.totalTax)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2 font-bold">Total</td>
                    <td className="p-2 text-right font-mono font-bold">{money(derived.subtotal)}</td>
                    <td className="p-2 text-right font-mono font-bold">{money(derived.cgstAmt)}</td>
                    <td className="p-2 text-right font-mono font-bold">{money(derived.sgstAmt)}</td>
                    {n(inv.igstRate) > 0 && <td className="p-2 text-right font-mono font-bold">{money(derived.igstAmt)}</td>}
                    <td className="p-2 text-right font-mono font-bold">{money(derived.totalTax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 text-[10px] text-slate-600 flex justify-between">
            <div>SUBJECT TO 1 JURISDICTION · This is a Computer Generated Invoice</div>
            <div>Date & Time: {new Date(inv.createdAt).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

