import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SearchSelect from '../../../components/SearchSelect';
import HeatCycleStepGraph from '../../../components/HeatCycleStepGraph';
import { tempRowsToSegments } from '../../../data/heatTreatmentCycles';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TemperatureCurve({ tempRows, setTempRows, form, masterGraphs = [], selectGraph, selectedGraphId, noDefaultTemplate }) {
  // Rebuild {tempC, holdMin} segments from the flat {time, temp} rows so the
  // live graph renders identically to the VHT Run Sheet / certificate print
  // (same blue Excel-style step curve, real elapsed-minute X-axis).
  const segments = useMemo(() => tempRowsToSegments(tempRows), [tempRows]);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-3 flex-wrap">
        <div className="space-y-1 min-w-0">
          <CardTitle>Temperature Cycle Data</CardTitle>
          <CardDescription>Edit values to update the heat treatment curve.</CardDescription>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <div className="flex flex-wrap gap-1.5 justify-end">
            <SearchSelect
              value={selectedGraphId || ''}
              onChange={selectGraph}
              options={masterGraphs.map(g => ({ value: g.id, label: g.isDefault ? `${g.name} ★` : g.name }))}
              placeholder="— Select Graph —"
              useFixed
              dense
              className="w-44"
            />
            <Button type="button" variant="secondary" size="sm"
              onClick={() => setTempRows(p => [...p, { time: '', temp: '' }])}>
              <Plus /> Add Point
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 italic">Current cycle: {form.operatorMode || 'Auto-loaded'}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {noDefaultTemplate && (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
            No default Temperature Cycle Graph configured. Pick one from <strong>Select Graph</strong> above, or manage graphs under Admin → Temp Cycle Graphs.
          </div>
        )}

        {/* Editable Temperature Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase w-8 text-left">#</th>
                <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Time (min)</th>
                <th className="px-2 py-2 text-[10px] font-bold text-orange-600 uppercase text-center">Temperature (°C)</th>
                <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tempRows.map((row, i) => (
                <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-2 py-1.5 text-slate-400 font-mono tabular-nums text-center">{i + 1}</td>
                  <td className="px-1 py-1.5 text-center">
                    <Input type="number" inputMode="numeric" value={row.time}
                      onChange={e => { const a = [...tempRows]; a[i].time = e.target.value; setTempRows(a); }}
                      className="h-8 sm:h-8 min-h-0 text-xs w-20 mx-auto text-right tabular-nums font-mono"
                      placeholder="0" />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <Input type="number" inputMode="numeric" value={row.temp}
                      onChange={e => { const a = [...tempRows]; a[i].temp = e.target.value; setTempRows(a); }}
                      className="h-8 sm:h-8 min-h-0 text-xs w-20 mx-auto text-right tabular-nums font-mono font-bold border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200/50"
                      placeholder="50" />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    {tempRows.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => setTempRows(p => p.filter((_, j) => j !== i))}
                        className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                        aria-label={`Remove point ${i + 1}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button type="button" variant="outline" size="sm"
            onClick={() => setTempRows(p => [...p, { time: '', temp: '' }])}
            className="mt-2 w-full border-dashed border-sky-200 text-sky-600 hover:text-sky-700 hover:bg-sky-50">
            <Plus /> Add Point
          </Button>
        </div>

        {/* Temperature Graph Visualization - Live Update (matches print graph) */}
        {segments.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Heat Treatment Curve (Real-time)</p>
            <div className="bg-white rounded-lg border border-slate-200" style={{ height: 260 }}>
              <HeatCycleStepGraph segments={segments} stroke="#000" viewW={900} />
            </div>
          </div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[10px] text-blue-700 leading-relaxed">
            <strong>Tip:</strong> Edit any <strong>Time (min)</strong> or <strong>Temperature (°C)</strong> value above. The heat treatment curve updates <strong>in real-time</strong> as you type. Select a predefined heat treatment cycle from the selection above to auto-populate standard values.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
