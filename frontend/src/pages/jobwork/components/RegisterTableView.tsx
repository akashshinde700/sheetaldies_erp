import React from 'react';
import { Link } from 'react-router-dom';
import type { RegisterRow } from '../InwardOutwardRegister';

interface RegisterTableViewProps {
  loading: boolean;
  pagedRows: RegisterRow[];
}

export default function RegisterTableView({ loading, pagedRows }: RegisterTableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-indigo-50/40 border-b border-indigo-100">
            <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest leading-4 w-16">
              <span className="block">Sr</span>
              <span className="block">No</span>
            </th>
            <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest leading-4">
              Register details (Inward & Outward)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">Loading register...</td></tr>
          ) : pagedRows.length === 0 ? (
            <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No register data.</td></tr>
          ) : pagedRows.map((r, idx) => (
            <tr key={`${r.challanItemId}-${r.srNo}`} className="align-top even:bg-slate-50/30">
              <td className="px-2 py-3 align-top">
                <div className="inline-flex items-center justify-center min-w-8 h-8 rounded-lg bg-slate-700 text-white text-xs font-bold">
                  {r.srNo}
                </div>
              </td>
              <td className="px-2 py-2">
                <div className={`${idx === 0 ? 'border-t-0' : 'border-t-2 border-slate-500'} mb-2`} />
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  <Link
                    to={`/jobwork/${r.challanId}`}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-indigo-600 hover:bg-indigo-50"
                    title="View"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </Link>
                  <Link
                    to={`/jobwork/${r.challanId}/edit`}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-700 hover:bg-slate-100"
                    title="Edit / Update"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
                  {[
                    ['Company Name', r.companyName || '-'],
                    ['Material', r.material || '-'],
                    ['Challan No', r.challanNo || '-'],
                    ['Challan Date', r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '-'],
                    ['Material In Date', r.materialInDate ? new Date(r.materialInDate).toLocaleDateString('en-IN') : '-'],
                    ['Qty', r.qty ?? 0],
                    ['Weight', r.weight ?? 0],
                    ['Jobcard No', r.jobcardNo || '-'],
                  ].map(([label, value]) => (
                    <div key={`${r.srNo}-${label}`} className="rounded-md bg-white border border-slate-200/90 px-2.5 py-2 shadow-sm">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 border-b border-indigo-100 pb-1.5 mb-1.5">
                        {label}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 leading-snug break-words">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 mt-2">
                  {[
                    ['Jobcard Date', r.jobcardDate ? new Date(r.jobcardDate).toLocaleDateString('en-IN') : '-'],
                    ['Invoice', r.invoiceNos || '-'],
                    ['Dispatch Qty', r.dispatchQty ?? 0],
                    ['Dispatch Date', r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '-'],
                    ['Bal Qty', r.balQty ?? 0],
                    ['Velocity', r.velocity ?? 0],
                    ['Del Perf %', r.delPerfPct ?? 0],
                    ['Delivery %', r.deliveryPct ?? 0],
                  ].map(([label, value]) => (
                    <div key={`${r.srNo}-${label}`} className="rounded-md bg-slate-50 border border-slate-200/90 px-2.5 py-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 border-b border-indigo-100/80 pb-1.5 mb-1.5">
                        {label}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 leading-snug break-words tabular-nums">{value}</p>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
