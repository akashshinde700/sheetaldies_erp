import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';

function formatCurrency(v) {
  const x = typeof v === 'number' ? v : Number(String(v || '0').replace(/,/g, ''));
  return (Number.isFinite(x) ? x : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchaseOrderPrint() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/purchase/${id}`)
      .then(r => setPo(r.data.data))
      .catch(() => setError('Purchase Order not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-slate-400">Loading Purchase Order...</div>;
  if (error || !po) return (
    <div className="p-10 space-y-2 text-center">
      <p className="text-rose-500 font-bold">{error || 'Purchase Order not found.'}</p>
      <Link to="/purchase" className="btn-ghost">← Back to List</Link>
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
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print max-w-[850px] mx-auto mb-6 flex items-center justify-between px-4">
        <Link to={`/purchase`} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to List
        </Link>
        <button 
          onClick={() => window.print()}
          className="btn-primary"
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          Print Selection
        </button>
      </div>

      <div className="page max-w-[850px] mx-auto bg-white shadow-2xl border border-slate-200">
        {/* Header Section */}
        <div className="p-8 border-b-4 border-slate-900 bg-slate-50">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">SHEETAL DIES & TOOLS</h1>
              <div className="text-[11px] text-slate-600 font-bold space-y-1">
                <p>PLOT NO. 84/1, SECTOR NO. 10, PCNTDA,</p>
                <p>BHOSARI, PUNE - 411026, MAHARASHTRA</p>
                <p>CONTACT: +91 20 27123456 | EMAIL: INFO@SHEETALGROUP.CO.IN</p>
                <p className="pt-2 text-slate-900">GSTIN: <span className="font-mono">27AAAAA0000A1Z5</span></p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="bg-indigo-600 text-white px-5 py-2 inline-block text-xl font-black tracking-widest uppercase rounded-bl-xl shadow-lg mb-6">
                PURCHASE ORDER
              </div>
              <div className="space-y-1 text-xs font-black">
                <p className="flex justify-end gap-4 text-slate-400">PO NO: <span className="text-slate-900 font-mono text-base">{po.poNumber}</span></p>
                <p className="flex justify-end gap-4 text-slate-400">DATE: <span className="text-slate-900 font-mono">{new Date(po.poDate).toLocaleDateString('en-IN')}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Party Details */}
        <div className="grid grid-cols-2 border-b-2 border-slate-900">
          <div className="p-6 border-r-2 border-slate-900">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">VENDOR / SUPPLIER</h3>
            <div className="space-y-1">
              <p className="text-base font-black text-slate-900 uppercase">{po.vendor?.name}</p>
              <p className="text-[11px] text-slate-600 font-bold uppercase min-h-[40px] leading-snug">{po.vendor?.address}</p>
              <div className="pt-3 space-y-1">
                {po.vendor?.gstin && <p className="text-[10px] font-black text-slate-500 uppercase">GSTIN: <span className="text-slate-900 ml-1 font-mono">{po.vendor.gstin}</span></p>}
                {po.vendor?.phone && <p className="text-[10px] font-black text-slate-500 uppercase">PHONE: <span className="text-slate-900 ml-1 font-mono">{po.vendor.phone}</span></p>}
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">SHIPPING / DELIVERY</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">EXPECTED DELIVERY BY</p>
                <p className="text-lg font-black text-rose-600 font-mono italic">
                  {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString('en-IN') : 'URGENT'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">CURRENCY</p>
                  <p className="text-xs font-black text-slate-800 uppercase italic">INR - RUPEES</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">DISPATCH MODE</p>
                  <p className="text-xs font-black text-slate-800 uppercase italic">BY ROAD / COURIER</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="min-h-[450px]">
          <table className="w-full text-xs font-bold divide-y-2 divide-slate-100">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest text-left">
                <th className="p-4 w-12 text-center border-r border-slate-700">SR</th>
                <th className="p-4 border-r border-slate-700">DESCRIPTION OF GOODS / SERVICES</th>
                <th className="p-4 w-28 text-right border-r border-slate-700">QUANTITY</th>
                <th className="p-4 w-28 text-right border-r border-slate-700">UNIT PRICE</th>
                <th className="p-4 w-36 text-right">TOTAL AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(po.items || []).map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <td className="p-4 text-center text-slate-400 font-mono border-r border-slate-50">{idx + 1}</td>
                  <td className="p-4 border-r border-slate-50">
                    <p className="text-sm font-black text-slate-900 uppercase">{line.item?.partNo || '—'}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{line.item?.description || '—'}</p>
                    {line.remark && <p className="text-[9px] text-indigo-400 italic mt-1">Note: {line.remark}</p>}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-900 border-r border-slate-50">
                    <span className="text-base">{line.quantity}</span> 
                    <span className="ml-1 text-[9px] text-slate-400">{line.item?.unit || 'NOS'}</span>
                  </td>
                  <td className="p-4 text-right font-mono text-slate-600 border-r border-slate-50">
                    ₹{formatCurrency(line.unitPrice)}
                  </td>
                  <td className="p-4 text-right font-mono text-lg text-slate-900 bg-slate-50/50">
                    ₹{formatCurrency(line.amount)}
                  </td>
                </tr>
              ))}
              {/* Fill space */}
              {Array.from({ length: Math.max(0, 10 - (po.items?.length || 0)) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-10 border-b border-slate-50">
                  <td className="border-r border-slate-50" /><td className="border-r border-slate-50" /><td className="border-r border-slate-50" /><td className="border-r border-slate-50" /><td className="bg-slate-50/20" />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black uppercase">
                <td colSpan={4} className="p-4 text-right tracking-widest text-xs">GRAND TOTAL (Excl. Tax)</td>
                <td className="p-4 text-right text-xl font-mono">₹{formatCurrency(po.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Instructions */}
        <div className="grid grid-cols-2 border-t-2 border-slate-900 border-b-2 border-slate-900">
          <div className="p-6 border-r-2 border-slate-900 space-y-6">
            <div className="space-y-1">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GENERAL INSTRUCTIONS</h4>
              <ul className="text-[9px] text-slate-500 font-bold space-y-1.5 list-disc pl-4 italic">
                <li>Bill must be in duplicate and include HSN/SAC codes.</li>
                <li>Delivery must be as per the expected date mentioned above.</li>
                <li>Payment terms: As per contract/agreement.</li>
                <li>GSTIN of Sheetal Dies & Tools must be mentioned on the invoice.</li>
              </ul>
            </div>
            {po.remarks && (
              <div className="space-y-1">
                <h4 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">PO REMARKS</h4>
                <p className="text-[10px] text-slate-600 font-bold uppercase leading-relaxed">{po.remarks}</p>
              </div>
            )}
          </div>
          <div className="p-6 flex flex-col justify-between italic bg-slate-50/20">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">FOR SHEETAL DIES & TOOLS</p>
              <div className="h-20" />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">AUTHORISED SIGNATORY</p>
            </div>
          </div>
        </div>

        {/* Sub-footer */}
        <div className="p-4 bg-slate-900 flex justify-between items-center px-8">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Computer Generated Purchase Order · ID: {po.id}</p>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest tabular-nums">TRANS: {new Date(po.createdAt).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="no-print mt-6 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest pb-10">
        Optimized for 80GSM A4 Thermal or Inkjet Printing
      </div>
    </div>
  );
}
