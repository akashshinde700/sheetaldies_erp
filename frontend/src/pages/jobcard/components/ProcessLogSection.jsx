import React from 'react';

export default function ProcessLogSection({ heatRows, setHeatRows, processes, emptyHeatRow }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-rose-500 text-[14px]">thermostat</span>
          </div>
          <p className="section-title">Heat Treatment Process Log</p>
        </div>
        <button type="button" onClick={() => setHeatRows(p => [...p, emptyHeatRow()])}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-sm">add</span> Add Row
        </button>
      </div>
      {heatRows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No heat treatment records. Click "Add Row" to add.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Equipment','Process','Cycle','Temp/Time','Temp From°C','Temp To°C','Hold (min)','Start Time','End Time','Date','Loading By','Atmosphere','UOM','Result','Sign',''].map(h => (
                  <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {heatRows.map((row, i) => {
                const upd = (field, val) => setHeatRows(prev => { const a=[...prev]; a[i]={...a[i],[field]:val}; return a; });
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-1 py-2"><input value={row.equipment} onChange={e=>upd('equipment',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Furnace" /></td>
                    <td className="px-1 py-2">
                      <select value={row.processTypeId} onChange={e=>upd('processTypeId',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                        <option value="">—</option>
                        {processes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-2"><input type="number" value={row.cycleNo} onChange={e=>upd('cycleNo',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-14 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="1" /></td>
                    <td className="px-1 py-2"><input value={row.tempTime} onChange={e=>upd('tempTime',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-28 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="e.g. 1020°C / 30m" /></td>
                    <td className="px-1 py-2"><input type="number" value={row.tempFrom} onChange={e=>upd('tempFrom',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-20 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="800" /></td>
                    <td className="px-1 py-2"><input type="number" value={row.tempTo} onChange={e=>upd('tempTo',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-20 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="900" /></td>
                    <td className="px-1 py-2"><input type="number" value={row.holdTimeMin} onChange={e=>upd('holdTimeMin',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-16 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="60" /></td>
                    <td className="px-1 py-2"><input type="datetime-local" value={row.startTime} onChange={e=>upd('startTime',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" /></td>
                    <td className="px-1 py-2"><input type="datetime-local" value={row.endTime} onChange={e=>upd('endTime',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" /></td>
                    <td className="px-1 py-2"><input type="date" value={row.processDate} onChange={e=>upd('processDate',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300" /></td>
                    <td className="px-1 py-2"><input value={row.loadingBy} onChange={e=>upd('loadingBy',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Name" /></td>
                    <td className="px-1 py-2"><input value={row.atmosphere} onChange={e=>upd('atmosphere',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-20 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Vacuum" /></td>
                    <td className="px-1 py-2"><input value={row.uom} onChange={e=>upd('uom',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-16 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="KGS" /></td>
                    <td className="px-1 py-2">
                      <select value={row.result} onChange={e=>upd('result',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                        <option value="">—</option>
                        <option value="OK">OK</option>
                        <option value="NOT OK">NOT OK</option>
                      </select>
                    </td>
                    <td className="px-1 py-2"><input value={row.signedBy} onChange={e=>upd('signedBy',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-20 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Name" /></td>
                    <td className="px-1 py-2">
                      <button type="button" onClick={() => setHeatRows(p=>p.filter((_,j)=>j!==i))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
