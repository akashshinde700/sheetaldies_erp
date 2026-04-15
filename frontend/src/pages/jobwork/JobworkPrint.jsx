import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/formatters';
import PrintHeader from '../../components/PrintHeader';

export default function JobworkPrint() {
  const { id } = useParams();
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);

  useEffect(() => {
    api.get(`/jobwork/${id}`)
      .then(r => setChallan(r.data.data))
      .catch(() => setError('Challan not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-slate-400">Loading challan details...</div>;
  if (error || !challan) return (
    <div className="p-10 space-y-2 text-center">
      <p className="text-rose-500 font-bold">{error || 'Challan not found.'}</p>
      <Link to="/jobwork" className="btn-ghost">← Back to List</Link>
    </div>
  );

  const items = challan.items || [];
  const totalQty    = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const totalWeight = items.reduce((s, it) => s + (Number(it.weight)   || 0), 0);
  const totalAmount = items.reduce((s, it) => s + (Number(it.amount)   || 0), 0);
  const cgst = Number(challan.cgstAmount)  || 0;
  const sgst = Number(challan.sgstAmount)  || 0;
  const igst = Number(challan.igstAmount)  || 0;
  const freight = Number(challan.freightAmount) || 0;
  const subtotal = challan.totalValue ? Number(challan.totalValue) : totalAmount;
  const grandTotal = Number(challan.grandTotal) || (subtotal + cgst + sgst + igst + freight);

  return (
    <div className="bg-slate-50 min-h-screen py-10 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page {
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          body { background: white !important; }
          @page { margin: 1cm; size: A4; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print max-w-[900px] mx-auto mb-6 flex items-center justify-between px-4">
        <Link to={`/jobwork/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Detail
        </Link>
        <button
          onClick={() => window.print()}
          className="btn-primary shadow-indigo-200/50"
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          Print Challan
        </button>
      </div>

      <div className="page max-w-[900px] mx-auto bg-white shadow-2xl border border-slate-200 print:shadow-none print:border-slate-300">

        {/* ── HEADER ── */}
        <PrintHeader title="JOB WORK CHALLAN" showTuv={false} />

        {/* ── CHALLAN REFERENCE ROW ── */}
        <div className="border-b border-slate-900 px-4 py-2 grid grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
          <div>
            <span className="font-black text-slate-500 uppercase">Challan No:</span>{' '}
            <span className="font-mono font-black text-slate-900">{challan.challanNo}</span>
          </div>
          <div>
            <span className="font-black text-slate-500 uppercase">Date:</span>{' '}
            <span className="font-mono font-black text-slate-900">{formatDate(challan.challanDate)}</span>
          </div>
          <div>
            <span className="font-black text-slate-500 uppercase">Cill No.:</span>{' '}
            <span className="font-mono font-black text-slate-900">{fmt(challan.cillNo)}</span>
          </div>
          <div>
            <span className="font-black text-slate-500 uppercase">Job Card:</span>{' '}
            <span className="font-mono font-black text-indigo-800">{fmt(challan.jobCard?.jobCardNo)}</span>
          </div>
          <div>
            <span className="font-black text-slate-500 uppercase">PO No.:</span>{' '}
            <span className="font-mono font-black text-slate-900">{fmt(challan.poNo)}</span>
          </div>
          <div>
            <span className="font-black text-slate-500 uppercase">PO Date:</span>{' '}
            <span className="font-mono font-black text-slate-900">{challan.poDate ? formatDate(challan.poDate) : '—'}</span>
          </div>
          <div>
            <span className="font-black text-slate-500 uppercase">Vehicle No.:</span>{' '}
            <span className="font-mono font-black text-slate-900">{fmt(challan.vehicleNo)}</span>
          </div>
          <div>
            <span className="font-black text-slate-500 uppercase">Vendor Code:</span>{' '}
            <span className="font-mono font-black text-slate-900">{fmt(challan.toParty?.code)}</span>
          </div>
        </div>

        {/* ── PARTY SECTION ── */}
        <div className="grid grid-cols-2 border-b border-slate-900">
          {/* Left: Customer (material owner) */}
          <div className="p-4 border-r border-slate-900">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">CUSTOMER / MATERIAL OWNER</p>
            <p className="text-sm font-black text-slate-900 uppercase">{challan.fromParty?.name || '—'}</p>
            <p className="text-[10px] text-slate-600 leading-tight mt-1 uppercase">{challan.fromParty?.address || ''}</p>
            {challan.fromParty?.gstin && (
              <p className="text-[10px] font-bold text-slate-700 mt-1 uppercase">
                GSTIN: <span className="font-mono text-slate-900">{challan.fromParty.gstin}</span>
              </p>
            )}
          </div>
          {/* Right: Job Worker / Processor */}
          <div className="p-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">NAME & ADDRESS OF JOB WORKER</p>
            <p className="text-sm font-black text-slate-900 uppercase">{challan.toParty?.name || '—'}</p>
            <p className="text-[10px] text-slate-600 leading-tight mt-1 uppercase">{challan.toParty?.address || ''}</p>
            {challan.toParty?.gstin && (
              <p className="text-[10px] font-bold text-slate-700 mt-1 uppercase">
                GSTIN: <span className="font-mono text-slate-900">{challan.toParty.gstin}</span>
              </p>
            )}
            {challan.toParty?.stateName && (
              <p className="text-[10px] font-bold text-slate-700 uppercase">
                STATE: <span className="text-slate-900">{challan.toParty.stateName} ({challan.toParty.stateCode})</span>
              </p>
            )}
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <div className="min-h-[300px]">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-slate-900 text-white font-black uppercase tracking-wider">
                <th className="p-2 text-center w-8 border-r border-slate-700">SR</th>
                <th className="p-2 text-left border-r border-slate-700" style={{minWidth:'120px'}}>DESCRIPTION</th>
                <th className="p-2 text-center w-20 border-r border-slate-700">MATERIAL</th>
                <th className="p-2 text-center w-14 border-r border-slate-700">HRC</th>
                <th className="p-2 text-center w-20 border-r border-slate-700">WO NO</th>
                <th className="p-2 text-center w-20 border-r border-slate-700">SAC NO</th>
                <th className="p-2 text-center w-14 border-r border-slate-700">QTY</th>
                <th className="p-2 text-center w-12 border-r border-slate-700">UOM</th>
                <th className="p-2 text-right w-20 border-r border-slate-700">WT (KG)</th>
                <th className="p-2 text-left w-24 border-r border-slate-700">PROCESS</th>
                <th className="p-2 text-right w-20 border-r border-slate-700">RATE</th>
                <th className="p-2 text-right w-24">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => (
                <tr key={it.id} className="border-b border-slate-200">
                  <td className="p-2 text-center font-bold text-slate-400 border-r border-slate-200">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-200 font-bold text-slate-900 uppercase">
                    {it.description || it.item?.description || '—'}
                  </td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-700 uppercase">{it.material || '—'}</td>
                  <td className="p-2 text-center border-r border-slate-200 text-slate-700">{it.hrc || '—'}</td>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-slate-700">{it.woNo || '—'}</td>
                  <td className="p-2 text-center border-r border-slate-200 font-mono text-slate-600">{it.hsnCode || '—'}</td>
                  <td className="p-2 text-center font-mono font-black border-r border-slate-200">{it.quantity || 0}</td>
                  <td className="p-2 text-center font-bold border-r border-slate-200 uppercase">{it.uom || 'NOS'}</td>
                  <td className="p-2 text-right font-mono font-black border-r border-slate-200">{(Number(it.weight) || 0).toFixed(3)}</td>
                  <td className="p-2 border-r border-slate-200 uppercase text-slate-800 font-bold">
                    {it.processType?.name || it.processName || '—'}
                  </td>
                  <td className="p-2 text-right font-mono border-r border-slate-200 text-slate-700">
                    {it.rate ? Number(it.rate).toFixed(2) : '—'}
                  </td>
                  <td className="p-2 text-right font-mono font-black text-slate-900">
                    {it.amount ? formatCurrency(it.amount) : '—'}
                  </td>
                </tr>
              ))}
              {/* Empty filler rows */}
              {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-7 border-b border-slate-50">
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-black border-t-2 border-slate-900 text-[10px] uppercase">
                <td colSpan={6} className="p-2 text-right border-r border-slate-200 text-slate-500">TOTAL</td>
                <td className="p-2 text-center font-mono border-r border-slate-200 text-indigo-900">{totalQty}</td>
                <td className="border-r border-slate-200" />
                <td className="p-2 text-right font-mono border-r border-slate-200 text-indigo-900">{totalWeight.toFixed(3)}</td>
                <td className="border-r border-slate-200" />
                <td className="border-r border-slate-200" />
                <td className="p-2 text-right font-mono text-indigo-900">{formatCurrency(subtotal)}</td>
              </tr>

              {/* Tax & totals */}
              {freight > 0 && (
                <tr className="text-[10px] font-bold border-t border-slate-200">
                  <td colSpan={11} className="p-2 text-right border-r border-slate-200 text-slate-500 uppercase">Transport / Freight</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(freight)}</td>
                </tr>
              )}
              {cgst > 0 && (
                <tr className="text-[10px] font-bold border-t border-slate-100">
                  <td colSpan={11} className="p-2 text-right border-r border-slate-200 text-slate-500 uppercase">CGST @ 9%</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(cgst)}</td>
                </tr>
              )}
              {sgst > 0 && (
                <tr className="text-[10px] font-bold border-t border-slate-100">
                  <td colSpan={11} className="p-2 text-right border-r border-slate-200 text-slate-500 uppercase">SGST @ 9%</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(sgst)}</td>
                </tr>
              )}
              {igst > 0 && (
                <tr className="text-[10px] font-bold border-t border-slate-100">
                  <td colSpan={11} className="p-2 text-right border-r border-slate-200 text-slate-500 uppercase">IGST @ 18%</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(igst)}</td>
                </tr>
              )}
              <tr className="text-[11px] font-black bg-slate-100 border-t-2 border-slate-900">
                <td colSpan={11} className="p-3 text-right border-r border-slate-200 uppercase tracking-widest text-slate-900">GRAND TOTAL</td>
                <td className="p-3 text-right font-mono text-sm text-indigo-900">{formatCurrency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── PART II + NOTES + SIGNATURES ── */}
        <div className="grid grid-cols-2 border-t-2 border-slate-900">
          {/* Left: Part II (Processor fill-in) + notes */}
          <div className="p-4 border-r border-slate-900 space-y-4">
            <div>
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">
                PART II — TO BE FILLED BY JOB WORKER
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Entry No.</p>
                  <p className="font-bold text-slate-900 border-b border-slate-300 min-h-[18px]">{fmt(challan.entryNo)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Received Date</p>
                  <p className="font-bold text-slate-900 border-b border-slate-300 min-h-[18px]">{challan.receivedDate ? formatDate(challan.receivedDate) : '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Nature of Processing</p>
                  <p className="font-bold text-slate-900 border-b border-slate-300 min-h-[18px]">{fmt(challan.natureOfProcess)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Processed Qty Returned</p>
                  <p className="font-bold text-slate-900 border-b border-slate-300 min-h-[18px]">{fmt(challan.qtyReturned)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Rework Qty</p>
                  <p className="font-bold text-slate-900 border-b border-slate-300 min-h-[18px]">{fmt(challan.reworkQty)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Scrap Qty (kg)</p>
                  <p className="font-bold text-slate-900 border-b border-slate-300 min-h-[18px]">{fmt(challan.scrapQtyKg)}</p>
                </div>
              </div>
            </div>

            {challan.processingNotes && (
              <div>
                <h4 className="text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-1">PROCESSING INSTRUCTIONS</h4>
                <div className="text-[10px] text-slate-700 font-bold bg-slate-50 p-2 border border-slate-200 leading-relaxed italic">
                  {challan.processingNotes}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TERMS & CONDITIONS</h4>
              <ul className="text-[8px] text-slate-500 font-bold space-y-0.5 list-disc pl-3">
                <li>Goods once sent for jobwork remain company property.</li>
                <li>Report any discrepancy within 24 hours of receipt.</li>
                <li>Return material within specified duration.</li>
              </ul>
            </div>
          </div>

          {/* Right: Signatures */}
          <div className="p-4 flex flex-col justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FOR OFFICE USE ONLY</p>
              {challan.createdBy?.name && (
                <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase">Issued by: {challan.createdBy.name}</p>
              )}
            </div>
            <div className="space-y-6 text-right">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">RECEIVER'S SIGNATURE</p>
                <div className="h-12 border-b border-slate-400 mt-2" />
                <p className="text-[9px] text-slate-400 mt-1 uppercase">Name & Date</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">FOR SHEETAL DIES & TOOLS PVT. LTD.</p>
                <div className="h-12 border-b border-slate-400 mt-2" />
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-1">AUTHORISED SIGNATORY</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Computer Generated Challan · SHEETAL DIES ERP · V2.0</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tabular-nums">Printed: {formatDate(new Date(), true)}</p>
        </div>

      </div>
    </div>
  );
}
