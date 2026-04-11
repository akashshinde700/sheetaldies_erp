import React from 'react';
import { Link } from 'react-router-dom';
import type { RegisterRow } from '../InwardOutwardRegister';

interface RegisterCardViewProps {
  loading: boolean;
  pagedRows: RegisterRow[];
}

export default function RegisterCardView({ loading, pagedRows }: RegisterCardViewProps) {
  if (loading) return <div className="p-8 text-center text-slate-400">Loading register...</div>;
  if (pagedRows.length === 0) return <div className="p-8 text-center text-slate-400">No register data.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5 bg-slate-50/50">
      {pagedRows.map((r) => (
        <div key={`${r.challanItemId}-${r.srNo}`} className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col overflow-hidden">
          {/* SR NO. Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/30 border-b border-indigo-100 flex-none">
            <span className="flex items-center justify-center w-7 h-7 bg-indigo-600 text-[11px] font-bold text-white rounded-lg">
              {r.srNo}
            </span>
            <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
              <Link to={`/jobwork/${r.challanId}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white border-white hover:border-indigo-100">
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </Link>
              <Link to={`/jobwork/${r.challanId}/edit`} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white hover:border-slate-200">
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </Link>
            </div>
          </div>

          <div className="p-4 space-y-4 flex-grow">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">Company</p>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-800 transition-colors leading-tight">
                {r.companyName || '-'}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Challan No / Date</p>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-slate-400">description</span>
                  <p className="text-xs font-semibold text-slate-800">{r.challanNo || '-'}</p>
                </div>
                <p className="text-[10px] text-slate-500 ml-5">
                  {r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '-'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Material</p>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-slate-400">settings_applications</span>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1">{r.material || '-'}</p>
                </div>
                <p className="text-[10px] text-slate-500 ml-5">
                  In: {r.materialInDate ? new Date(r.materialInDate).toLocaleDateString('en-IN') : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-center border-r border-slate-200 last:border-0 pr-2 last:pr-0">
                <p className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400">Quantity</p>
                <p className="text-xs font-bold text-slate-900">{r.qty ?? 0}</p>
              </div>
              <div className="text-center border-r border-slate-200 last:border-0 px-2 last:pr-0">
                <p className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400">Weight</p>
                <p className="text-xs font-bold text-slate-900">{r.weight ?? 0}</p>
              </div>
              <div className="text-center px-2 last:pr-0">
                <p className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400">Balance</p>
                <p className={`text-xs font-black ${r.balQty > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {r.balQty ?? 0}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Jobcard</p>
                  <p className="text-xs font-bold text-slate-700">{r.jobcardNo || '-'}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Invoice</p>
                  <p className="text-xs font-bold text-indigo-700">{r.invoiceNos || '-'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center px-2.5 py-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-indigo-500">speed</span>
                  <p className="text-[10px] font-bold text-indigo-800">Velocity: <span className="text-indigo-900">{r.velocity ?? 0}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right leading-none">
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Perf</p>
                    <p className="text-[10px] font-black text-indigo-900 tabular-nums">{r.delPerfPct ?? 0}%</p>
                  </div>
                  <div className="text-right leading-none">
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Deliv</p>
                    <p className="text-[10px] font-black text-emerald-600 tabular-nums">{r.deliveryPct ?? 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
