import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import PrintHeader, { COMPANY } from '../../components/PrintHeader';

export default function DispatchChallanPrint() {
  const { id } = useParams();
  const [dc, setDc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/dispatch-challans/${id}`)
      .then(r => setDc(r.data.data))
      .catch(() => setError('Dispatch challan not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-slate-400">Loading…</div>;
  if (error || !dc) return (
    <div className="p-10 space-y-2 text-center">
      <p className="text-rose-500 font-bold">{error || 'Not found.'}</p>
      <Link to="/dispatch" className="text-indigo-600 text-sm hover:underline">← Back</Link>
    </div>
  );

  const totalQty = (dc.items || []).reduce((s, it) => s + Number(it.quantity || 0), 0);
  const totalWt  = (dc.items || []).reduce((s, it) => s + Number(it.weightKg  || 0), 0);

  return (
    <div className="bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; border: none !important; }
          body { background: white !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <div className="no-print max-w-[860px] mx-auto mb-3 flex items-center gap-2">
        <Link to={`/dispatch/${id}`} className="btn-ghost">← Back</Link>
        <button className="btn-primary ml-auto" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="page max-w-[860px] mx-auto bg-white shadow-lg border border-slate-200">
        <PrintHeader title="DELIVERY CHALLAN" subtitle="(Outward Dispatch)" showTuv={false} />

        {/* Ref row */}
        <div className="flex justify-between px-5 pt-3 pb-2 border-b border-slate-900 text-xs">
          <div className="space-y-0.5">
            <div><span className="text-slate-500">GSTIN:</span> <span className="font-mono font-bold">{COMPANY.gstin}</span></div>
          </div>
          <div className="text-right space-y-0.5">
            <div><span className="text-slate-500">Challan No:</span> <span className="font-mono font-bold">{dc.challanNo}</span></div>
            <div><span className="text-slate-500">Date:</span> <span className="font-mono">{formatDate(dc.challanDate)}</span></div>
            <div><span className="text-slate-500">Status:</span> <span className="font-semibold">{dc.status}</span></div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 border-b border-slate-900 text-xs">
          <div className="p-4 border-r border-slate-900">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-2">From (Consignor)</div>
            <div className="font-extrabold">{dc.fromParty?.name || COMPANY.name}</div>
            <div className="text-[11px] text-slate-600 mt-1">{dc.fromParty?.address || COMPANY.factory}</div>
            {dc.fromParty?.gstin && <div className="text-[11px] mt-1"><span className="text-slate-500">GSTIN:</span> <span className="font-mono">{dc.fromParty.gstin}</span></div>}
          </div>
          <div className="p-4">
            <div className="text-[9px] font-black text-slate-400 uppercase mb-2">To (Consignee)</div>
            <div className="font-extrabold">{dc.toParty?.name}</div>
            <div className="text-[11px] text-slate-600 mt-1">{dc.toParty?.address}</div>
            {dc.toParty?.gstin && <div className="text-[11px] mt-1"><span className="text-slate-500">GSTIN:</span> <span className="font-mono">{dc.toParty.gstin}</span></div>}
          </div>
        </div>

        {/* Transport */}
        <div className="grid grid-cols-4 border-b border-slate-900 text-[11px]">
          <div className="p-3 border-r border-slate-200"><div className="text-[9px] text-slate-400 uppercase mb-1">Mode</div><div className="font-semibold">{dc.dispatchMode || '—'}</div></div>
          <div className="p-3 border-r border-slate-200"><div className="text-[9px] text-slate-400 uppercase mb-1">Vehicle No</div><div className="font-mono">{dc.vehicleNo || '—'}</div></div>
          <div className="p-3 border-r border-slate-200"><div className="text-[9px] text-slate-400 uppercase mb-1">Ref Challan</div><div className="font-mono">{dc.jobworkChallan?.challanNo || '—'}</div></div>
          <div className="p-3"><div className="text-[9px] text-slate-400 uppercase mb-1">Remarks</div><div>{dc.remarks || '—'}</div></div>
        </div>

        {/* Items table */}
        <div className="border-b border-slate-900">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-50">
                <th className="p-2 text-left w-8">Sl</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-right w-20">Qty</th>
                <th className="p-2 text-right w-20">Weight (Kg)</th>
                <th className="p-2 text-left w-28">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(dc.items || []).map((it, i) => (
                <tr key={it.id || i} className="border-b border-slate-100">
                  <td className="p-2 text-slate-500 font-mono">{i + 1}</td>
                  <td className="p-2">{it.description || it.item?.name || '—'}</td>
                  <td className="p-2 text-right font-mono">{Number(it.quantity || 0).toFixed(3)}</td>
                  <td className="p-2 text-right font-mono">{Number(it.weightKg || 0).toFixed(3)}</td>
                  <td className="p-2 text-slate-500">{it.remarks || '—'}</td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className="p-2" colSpan={2}>Total</td>
                <td className="p-2 text-right font-mono">{totalQty.toFixed(3)}</td>
                <td className="p-2 text-right font-mono">{totalWt.toFixed(3)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 p-5 text-xs gap-8">
          <div>
            <div className="text-[10px] text-slate-400 uppercase mb-1">Receiver's Signature & Stamp</div>
            <div className="h-14 border-b border-slate-400 mt-8" />
            <div className="text-[9px] text-slate-400 mt-1">Name &amp; Date</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase mb-1">For {COMPANY.name}</div>
            <div className="h-14" />
            <div className="text-[9px] text-slate-400">Authorised Signatory</div>
          </div>
        </div>

        <div className="px-5 pb-3 text-[9px] text-slate-400 flex justify-between border-t border-slate-100">
          <div>This is a computer generated delivery challan.</div>
          <div>Printed: {new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
}
