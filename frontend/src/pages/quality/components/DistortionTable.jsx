import React from 'react';

export default function DistortionTable({ form, setForm, set }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-blue-500 text-[14px]">straighten</span>
        </div>
        <p className="section-title">Distortion Measurements (8 Points)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
              <th className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase text-left w-24">Measurement</th>
              {[1,2,3,4,5,6,7,8].map(n => (
                <th key={n} className="py-2.5 px-2 text-[10px] font-bold text-slate-400">Pt. {n}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50/80">
            <tr>
              <td className="py-2.5 px-3 text-xs font-bold text-slate-700 text-left">Before HT</td>
              {form.distortionBefore.map((val, i) => (
                <td key={i} className="py-2 px-1">
                  <input type="number" step="0.001" value={val}
                    onChange={e => { const arr=[...form.distortionBefore]; arr[i]=e.target.value; set('distortionBefore', arr); }}
                    className="w-16 border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-center focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200" placeholder="NA" />
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-xs font-bold text-emerald-700 text-left">After HT</td>
              {form.distortionAfter.map((val, i) => (
                <td key={i} className="py-2 px-1">
                  <input type="number" step="0.001" value={val}
                    onChange={e => { const arr=[...form.distortionAfter]; arr[i]=e.target.value; set('distortionAfter', arr); }}
                    className="w-16 border border-emerald-200 rounded-lg px-1 py-1.5 text-xs text-center bg-emerald-50 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200" />
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50/80">
              <td className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase text-left">Δ Diff</td>
              {form.distortionBefore.map((before, i) => {
                const diff = Number(form.distortionAfter[i] || 0) - Number(before || 0);
                return (
                  <td key={i} className={`py-2 px-1 text-xs font-bold ${
                    Math.abs(diff) > 0.05 ? 'text-rose-500' : diff !== 0 ? 'text-amber-500' : 'text-slate-300'
                  }`}>
                    {before || form.distortionAfter[i] ? (diff >= 0 ? '+' : '') + diff.toFixed(3) : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
