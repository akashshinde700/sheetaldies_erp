import React, { useMemo } from 'react';
import SearchSelect from '../../../components/SearchSelect';
import HeatCycleStepGraph from '../../../components/HeatCycleStepGraph';
import { tempRowsToSegments } from '../../../data/heatTreatmentCycles';

export default function TemperatureCurve({ tempRows, setTempRows, form, masterGraphs = [], selectGraph, selectedGraphId, noDefaultTemplate }) {
  // Rebuild {tempC, holdMin} segments from the flat {time, temp} rows so the
  // live graph renders identically to the VHT Run Sheet / certificate print
  // (same blue Excel-style step curve, real elapsed-minute X-axis).
  const segments = useMemo(() => tempRowsToSegments(tempRows), [tempRows]);

  return (
    <div className="card p-5">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-500 text-[15px]">show_chart</span>
          </div>
          <div>
            <p className="section-title">Temperature Cycle Data</p>
            <p className="text-[10px] text-slate-400">Edit values to update the heat treatment curve</p>
          </div>
        </div>
        <div className="text-right flex flex-col gap-1 items-end">
          <div className="flex flex-wrap gap-1 justify-end">
            <SearchSelect
              value={selectedGraphId || ''}
              onChange={selectGraph}
              options={masterGraphs.map(g => ({ value: g.id, label: g.isDefault ? `${g.name} ★` : g.name }))}
              placeholder="— Select Graph —"
              useFixed
              dense
              className="w-44"
            />
            <button type="button" onClick={() => setTempRows(p => [...p, { time: '', temp: '' }])}
              className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Add Point
            </button>
          </div>
          <p className="text-[9px] text-slate-500 italic">Current cycle: {form.operatorMode || 'Auto-loaded'}</p>
        </div>
      </div>

      {noDefaultTemplate && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
          No default Temperature Cycle Graph configured. Pick one from <strong>Select Graph</strong> above, or manage graphs under Admin → Temp Cycle Graphs.
        </div>
      )}

      {/* Editable Temperature Table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-slate-200">
              <th className="px-3 py-2.5 text-[10px] font-bold text-slate-600 uppercase w-8 text-left">#</th>
              <th className="px-3 py-2.5 text-[10px] font-bold text-slate-600 uppercase text-center">Time (min)</th>
              <th className="px-3 py-2.5 text-[10px] font-bold text-orange-600 uppercase text-center">Temperature (°C)</th>
              <th className="px-3 py-2.5 text-[10px] font-bold text-slate-600 uppercase w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tempRows.map((row, i) => (
              <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                <td className="px-3 py-2 text-slate-400 font-mono text-center">{i + 1}</td>
                <td className="px-2 py-2 text-center">
                  <input type="number" value={row.time}
                    onChange={e => { const a = [...tempRows]; a[i].time = e.target.value; setTempRows(a); }}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 text-center focus:outline-none focus:border-sky-300 focus:ring-1 focus:ring-sky-200 font-mono" 
                    placeholder="0" />
                </td>
                <td className="px-2 py-2 text-center">
                  <input type="number" value={row.temp}
                    onChange={e => { const a = [...tempRows]; a[i].temp = e.target.value; setTempRows(a); }}
                    className="border border-orange-300 rounded-lg px-2 py-1.5 text-xs w-20 text-center bg-orange-50 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 font-mono font-bold" 
                    placeholder="50" />
                </td>
                <td className="px-2 py-2 text-center">
                  {tempRows.length > 1 && (
                    <button type="button" onClick={() => setTempRows(p => p.filter((_, j) => j !== i))}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setTempRows(p => [...p, { time: '', temp: '' }])}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 py-2 rounded-lg transition-colors border border-dashed border-sky-200">
          <span className="material-symbols-outlined text-sm">add</span> Add Point
        </button>
      </div>

      {/* Temperature Graph Visualization - Live Update (matches print graph) */}
      {segments.length > 0 && (
        <div className="p-3 bg-gradient-to-b from-slate-50 to-orange-50/30 rounded-lg border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">↗</span>
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Heat Treatment Curve (Real-time)</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200" style={{ height: 260 }}>
            <HeatCycleStepGraph segments={segments} stroke="#000" viewW={900} />
          </div>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-3">
        <p className="text-[10px] text-blue-700 leading-relaxed">
          <strong>💡 Tip:</strong> Edit any <strong>Time (min)</strong> or <strong>Temperature (°C)</strong> value above. The heat treatment curve updates <strong>in real-time</strong> as you type. Select a predefined heat treatment cycle from the selection above to auto-populate standard values.
        </p>
      </div>
    </div>
  );
}
