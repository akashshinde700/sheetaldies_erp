import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function TemperatureCurve({ tempRows, setTempRows, form, loadTempCycleFromRunsheet }) {
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
            <button
              type="button"
              disabled={!form.jobCardId}
              onClick={async () => {
                const ok = await loadTempCycleFromRunsheet(form.jobCardId);
                if (!ok) toast.error('No VHT Run Sheet with graph found for this job card.');
              }}
              className="flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors border border-amber-200"
              title="Uses the latest VHT Run Sheet that includes this job card and has cycle segments"
            >
              <span className="material-symbols-outlined text-sm">thermostat</span> From VHT run sheet
            </button>
            <button type="button" onClick={() => setTempRows(p => [...p, { time: '', temp: '' }])}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Add Point
            </button>
          </div>
          <p className="text-[9px] text-slate-500 italic">Current cycle: {form.operatorMode || 'Auto-loaded'}</p>
        </div>
      </div>
      
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
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 text-center focus:outline-none focus:border-indigo-300 focus:ring-1 focus:indigo-200 font-mono" 
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
      </div>

      {/* Temperature Graph Visualization - Live Update */}
      {tempRows.length > 0 && (
        <div className="p-3 bg-gradient-to-b from-slate-50 to-orange-50/30 rounded-lg border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">↗</span>
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Heat Treatment Curve (Real-time)</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={tempRows.map((r, i) => ({
              ...r,
              index: i + 1,
              time: r.time || 'T' + (i + 1),
              temp: Number(r.temp) || 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                tick={{ fontSize: 11 }}
                label={{ value: 'Time (Minutes) →', position: 'right', offset: 10, fontSize: 11, fill: '#64748b' }}
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fontSize: 11 }}
                label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                domain={[0, 'dataMax + 100']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#f8fafc', border: '2px solid #fb923c', borderRadius: '6px', fontSize: '12px' }}
                formatter={(value) => [`${value}°C`, 'Temperature']}
                labelFormatter={(label) => `Time: ${label} min`}
                labelStyle={{ color: '#0f172a' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line 
                type="monotone" 
                dataKey="temp" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ fill: '#f97316', r: 4 }}
                activeDot={{ r: 6 }}
                name="Temperature"
              />
            </LineChart>
          </ResponsiveContainer>
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
