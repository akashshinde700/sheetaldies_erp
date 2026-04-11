import React from 'react';

export default function InspectionResultsTable({ inspResults, setInspResults }) {
  return (
    <div className="card p-5">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
        <p className="section-title">Inspection Results</p>
        <button type="button"
          onClick={() => setInspResults(p => [...p, { inspectionType: '', parameter: '', requiredValue: '', achievedValue: '', result: 'OK', finalInspection: '' }])}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-sm">add</span> Add Row
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
              {['Type', 'Parameter', 'Required', 'Achieved', 'Result', 'Final Inspection By', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50/80">
            {inspResults.map((ir, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-1 py-2">
                  <input value={ir.inspectionType} onChange={e => { const a = [...inspResults]; a[i].inspectionType = e.target.value; setInspResults(a); }}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                </td>
                <td className="px-1 py-2">
                  <input value={ir.parameter} onChange={e => { const a = [...inspResults]; a[i].parameter = e.target.value; setInspResults(a); }}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                </td>
                <td className="px-1 py-2">
                  <input value={ir.requiredValue} onChange={e => { const a = [...inspResults]; a[i].requiredValue = e.target.value; setInspResults(a); }}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                </td>
                <td className="px-1 py-2">
                  <input value={ir.achievedValue} onChange={e => { const a = [...inspResults]; a[i].achievedValue = e.target.value; setInspResults(a); }}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                </td>
                <td className="px-1 py-2">
                  <select value={ir.result} onChange={e => { const a = [...inspResults]; a[i].result = e.target.value; setInspResults(a); }}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300">
                    <option value="OK">OK</option>
                    <option value="NOT OK">NOT OK</option>
                    <option value="NA">NA</option>
                  </select>
                </td>
                <td className="px-1 py-2">
                  <input value={ir.finalInspection} onChange={e => { const a = [...inspResults]; a[i].finalInspection = e.target.value; setInspResults(a); }}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Inspector name" />
                </td>
                <td className="px-1 py-2">
                  {inspResults.length > 1 && (
                    <button type="button" onClick={() => setInspResults(p => p.filter((_, j) => j !== i))}
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
