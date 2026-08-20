import React from 'react';

export default function CertItemsTable({ certItems, setCertItems }) {
  return (
    <div className="card p-5">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
        <p className="section-title">Items / Parts</p>
        <button type="button"
          onClick={() => setCertItems(p => [...p, { description: '', quantity: '1', weightPerPc: '', totalWeight: '', remarks: '' }])}
          className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-sm">add</span> Add Row
        </button>
      </div>
      {/* Six editable columns do not fit a phone; let the table scroll inside
          its card instead of squeezing the inputs to nothing. */}
      <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-xs min-w-[520px]">
        <thead>
          <tr className="bg-gradient-to-r from-slate-50 to-sky-50/30 border-b border-slate-100">
            {['#', 'Part Description', 'Qty', 'Wt/Pc (kg)', 'Total Wt (kg)', ''].map(h => (
              <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50/80">
          {certItems.map((it, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-3 py-2 text-slate-400 font-mono">
                {i + 1}
                {it.sourceChallanItemId && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-sky-400" title="Linked from inward item" />
                )}
              </td>
              <td className="px-1 py-2">
                <input value={it.description} onChange={e => { const a = [...certItems]; a[i] = { ...a[i], description: e.target.value }; setCertItems(a); }}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-sky-300" placeholder="Part name" />
              </td>
              <td className="px-1 py-2">
                <input type="number" value={it.quantity}
                  onChange={e => { const a = [...certItems]; a[i].quantity = e.target.value; setCertItems(a); }}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-16 text-center focus:outline-none focus:ring-1 focus:ring-sky-300" />
              </td>
              <td className="px-1 py-2">
                <input type="number" step="0.001" value={it.weightPerPc}
                  onChange={e => { const a = [...certItems]; a[i].weightPerPc = e.target.value; setCertItems(a); }}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 text-right focus:outline-none focus:ring-1 focus:ring-sky-300" />
              </td>
              <td className="px-1 py-2">
                <input type="number" step="0.001" value={it.totalWeight}
                  onChange={e => { const a = [...certItems]; a[i] = { ...a[i], totalWeight: e.target.value }; setCertItems(a); }}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 text-right focus:outline-none focus:ring-1 focus:ring-sky-300" />
              </td>
              <td className="px-1 py-2">
                {certItems.length > 1 && (
                  <button type="button" onClick={() => setCertItems(p => p.filter((_, j) => j !== i))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
