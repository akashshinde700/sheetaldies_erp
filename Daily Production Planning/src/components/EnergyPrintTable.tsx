import React from 'react';
import { energyEntries } from '../data/energy';
import { fmtNum } from '../utils/traceability';
import type { EnergyEntry, Furnace } from '../types/production';

const FURNACES: Furnace[] = ['VPT-01', 'VPT-02'];

function FurnaceTable({ furnace, rows }: {furnace: Furnace;rows: EnergyEntry[];}) {
  const total = rows.reduce((n, e) => n + e.consumption, 0);
  return (
    <div className="flex-1">
      <p className="border border-ink-900 py-0.5 text-center font-mono text-[11px] font-bold">{furnace}</p>
      <table className="w-full border-collapse text-[7.5px]">
        <thead>
          <tr>
            <th scope="col" className="w-5 px-0.5 py-0.5 text-center font-bold uppercase">Sr</th>
            <th scope="col" className="px-0.5 py-0.5 text-center font-bold uppercase">Furnace cycle no</th>
            <th scope="col" className="px-0.5 py-0.5 text-center font-bold uppercase">HT cycle no</th>
            <th scope="col" className="px-0.5 py-0.5 text-center font-bold uppercase">Cycle wt</th>
            <th scope="col" className="px-0.5 py-0.5 text-center font-bold uppercase">Start meter</th>
            <th scope="col" className="px-0.5 py-0.5 text-center font-bold uppercase">End meter</th>
            <th scope="col" className="px-0.5 py-0.5 text-center font-bold uppercase">Total (KW)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) =>
          <tr key={e.furnaceCycleNo}>
              <td className="px-0.5 py-0.5 text-center font-mono">{e.srNo}</td>
              <td className="px-0.5 py-0.5 font-mono">{e.furnaceCycleNo}</td>
              <td className="px-0.5 py-0.5 font-mono">{e.htCycleNo ?? '—'}</td>
              <td className="tabular px-0.5 py-0.5 text-right font-mono">{e.cycleWeight ?? 'DESING'}</td>
              <td className="tabular px-0.5 py-0.5 text-right font-mono">
                {e.startMeter ? fmtNum(e.startMeter) : ''}
              </td>
              <td className="tabular px-0.5 py-0.5 text-right font-mono">{e.endMeter ? fmtNum(e.endMeter) : ''}</td>
              <td className="tabular px-0.5 py-0.5 text-right font-mono font-bold">
                {e.consumption > 0 ? e.consumption : ''}
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={6} className="px-1 py-0.5 text-right font-bold uppercase">
              Total
            </td>
            <td className="tabular px-0.5 py-0.5 text-right font-mono font-bold">{fmtNum(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>);

}

/** Print-only recreation of the energy consumption register — both furnaces side by side. */
export function EnergyPrintTable({ month }: {month: string;}) {
  const rows = energyEntries.filter((e) => e.month === month);
  return (
    <div className="flex gap-2">
      {FURNACES.map((f) =>
      <FurnaceTable key={f} furnace={f} rows={rows.filter((e) => e.furnace === f)} />
      )}
    </div>);

}