import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function JobworkPrint() {
  const { id } = useParams();
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          @page { margin: 1cm; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print max-w-[850px] mx-auto mb-6 flex items-center justify-between px-4">
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

      <div className="page max-w-[850px] mx-auto bg-white shadow-2xl border border-slate-200 print:shadow-none print:border-slate-300">
        <div className="p-8 border-b-2 border-slate-900">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{challan.fromParty?.name}</h1>
              <p className="text-[11px] text-slate-600 max-w-[300px] leading-tight font-medium uppercase">{challan.fromParty?.address}</p>
              {challan.fromParty?.gstin && (
                <div className="pt-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 border border-slate-200">
                    GSTIN: <span className="font-mono text-slate-900 ml-1">{challan.fromParty.gstin}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="bg-slate-900 text-white px-4 py-1 inline-block text-lg font-black tracking-widest uppercase mb-4">
                JOB WORK CHALLAN
              </div>
              <div className="text-xs space-y-1 font-bold">
                <div className="flex justify-end gap-3 text-slate-500">Challan No: <span className="text-slate-900 font-mono">{challan.challanNo}</span></div>
                <div className="flex justify-end gap-3 text-slate-500">Date: <span className="text-slate-900 font-mono">{formatDate(challan.challanDate)}</span></div>
                <div className="flex justify-end gap-3 text-slate-500 font-bold uppercase">Linked J.C.: <span className="text-indigo-700 font-mono">{challan.jobCard?.jobCardNo || '—'}</span></div>
                <div className="flex justify-end gap-3 text-slate-500">Inv/Ch Ref: <span className="text-slate-900 font-mono uppercase">{challan.invoiceChNo || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-slate-900">
          <div className="p-6 border-r border-slate-900">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">CONSIGNEE (TO PARTY)</h3>
            <div className="space-y-1">
              <p className="text-sm font-black text-indigo-900 uppercase">{challan.toParty?.name}</p>
              <p className="text-[11px] text-slate-600 min-h-[40px] leading-tight font-medium uppercase">{challan.toParty?.address}</p>
              <div className="pt-2 space-y-1">
                {challan.toParty?.gstin && <p className="text-[10px] font-bold text-slate-700 uppercase">GSTIN: <span className="font-mono text-slate-900 ml-1">{challan.toParty.gstin}</span></p>}
                {challan.toParty?.stateName && <p className="text-[10px] font-bold text-slate-700 uppercase">STATE: <span className="text-slate-900 ml-1">{challan.toParty.stateName} ({challan.toParty.stateCode})</span></p>}
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">TRANSPORT & DISPATCH</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Dispatch Mode</p>
                <p className="text-[11px] font-bold text-slate-900 uppercase">{challan.dispatchMode || 'BY ROAD'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Vehicle No</p>
                <p className="text-[11px] font-bold text-slate-900 uppercase font-mono">{challan.vehicleNo || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Due Date</p>
                <p className="text-[11px] font-bold text-slate-900 uppercase">{formatDate(challan.dueDate)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Received By / Person</p>
                <p className="text-[11px] font-bold text-slate-900 uppercase">{challan.deliveryPerson || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-[400px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <th className="p-3 text-left w-12 border-r border-slate-700">SR</th>
                <th className="p-3 text-left border-r border-slate-700">DESCRIPTION OF GOODS</th>
                <th className="p-3 text-center w-24 border-r border-slate-700">HSN/SAC</th>
                <th className="p-3 text-right w-24 border-r border-slate-700">QTY</th>
                <th className="p-3 text-right w-24 border-r border-slate-700">WEIGHT</th>
                <th className="p-3 text-center w-20">UOM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(challan.items || []).map((it, idx) => (
                <tr key={it.id} className="text-[11px] border-b border-slate-200">
                  <td className="p-3 text-center font-bold text-slate-400 border-r border-slate-200">{idx + 1}</td>
                  <td className="p-3 border-r border-slate-200 font-bold">
                    <div className="text-slate-900 uppercase">{it.description || it.item?.description || '—'}</div>
                    <div className="text-[9px] text-slate-400 font-black flex gap-3 mt-0.5 uppercase">
                      <span>MAT: {it.material || '—'}</span>
                      <span>HRC: {it.hrc || '—'}</span>
                      <span>WO: {it.woNo || '—'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 border-r border-slate-200">{it.hsnCode || '—'}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 border-r border-slate-200">{it.quantity || 0}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 border-r border-slate-200">{(it.weight || 0).toFixed(3)}</td>
                  <td className="p-3 text-center font-bold text-slate-600 uppercase">{it.uom || 'KGS'}</td>
                </tr>
              ))}
              {/* Fill remaining space */}
              {Array.from({ length: Math.max(0, 10 - (challan.items?.length || 0)) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8 border-b border-slate-50">
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
              <tr className="bg-slate-50 font-black border-t-2 border-slate-900 uppercase">
                <td colSpan={3} className="p-3 text-right text-[10px] border-r border-slate-200">TOTAL</td>
                <td className="p-3 text-right font-mono text-sm border-r border-slate-200 text-indigo-900">
                  {challan.items?.reduce((s, it) => s + (it.quantity || 0), 0)}
                </td>
                <td className="p-3 text-right font-mono text-sm border-r border-slate-200 text-indigo-900">
                  {challan.items?.reduce((s, it) => s + (Number(it.weight) || 0), 0).toFixed(3)}
                </td>
                <td className="p-3 text-center text-[10px] text-slate-400">NET</td>
              </tr>
              {challan.totalValue > 0 && (
                <>
                  <tr className="text-[11px] font-bold">
                    <td colSpan={5} className="p-2 text-right border-r border-slate-100 uppercase text-slate-500">Subtotal (Before Tax)</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(challan.totalValue)}</td>
                  </tr>
                  {(challan.cgstAmount > 0 || challan.sgstAmount > 0) && (
                    <tr className="text-[11px] font-bold">
                      <td colSpan={5} className="p-2 text-right border-r border-slate-100 uppercase text-slate-500">GST (CGST+SGST)</td>
                      <td className="p-2 text-right font-mono">{formatCurrency((challan.cgstAmount || 0) + (challan.sgstAmount || 0))}</td>
                    </tr>
                  )}
                  {challan.igstAmount > 0 && (
                    <tr className="text-[11px] font-bold">
                      <td colSpan={5} className="p-2 text-right border-r border-slate-100 uppercase text-slate-500">IGST</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(challan.igstAmount)}</td>
                    </tr>
                  )}
                  <tr className="text-[11px] font-black bg-indigo-50/30">
                    <td colSpan={5} className="p-3 text-right border-r border-slate-100 uppercase tracking-widest text-indigo-900">Grand Total</td>
                    <td className="p-3 text-right font-mono text-sm text-indigo-900 border-t border-indigo-200">{formatCurrency(challan.grandTotal || challan.totalValue)}</td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-2 border-t-2 border-slate-900 border-b border-slate-900">
          <div className="p-6 border-r border-slate-900 space-y-4">
            {challan.processingNotes && (
              <div className="space-y-1 mb-4">
                <h4 className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">PROCESSING NOTES / INSTRUCTIONS</h4>
                <div className="text-[10px] text-slate-700 font-bold bg-slate-50 p-2 border border-slate-200 rounded leading-relaxed italic">
                  {challan.processingNotes}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TERMS & CONDITIONS</h4>
              <ul className="text-[9px] text-slate-500 font-bold space-y-1 list-disc pl-3">
                <li>Goods once sent for jobwork remain company property.</li>
                <li>Report any discrepancy within 24 hours of receipt.</li>
                <li>Return material within dynamic specified duration.</li>
              </ul>
            </div>
          </div>
          <div className="p-6 flex flex-col justify-between">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase">FOR OFFICE USE ONLY</p>
              <p className="text-[10px] font-bold text-slate-800 uppercase mt-2">Prepared by: Sheetal Dies Ops Team</p>
              {challan.createdBy?.name && <p className="text-[9px] text-slate-500 mt-1 uppercase">Issued by: {challan.createdBy.name}</p>}
            </div>
            <div className="text-right pt-6">
              <p className="text-xs font-black text-slate-900 uppercase">FOR {challan.fromParty?.name}</p>
              <div className="h-16" />
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">AUTHORISED SIGNATORY</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex justify-between items-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Computer Generated Challan · SHEETAL DIES ERP · V2.0</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tabular-nums">Printed on: {formatDate(new Date(), true)}</p>
        </div>
      </div>
    </div>
  );
}
