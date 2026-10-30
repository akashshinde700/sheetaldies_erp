import React, { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ChainStrip } from '../components/ChainStrip';
import { CycleLink } from '../components/CycleLink';
import { SheetActions } from '../components/SheetActions';
import { PrintSheetHeader } from '../components/PrintSheet';
import { EnergyPrintTable } from '../components/EnergyPrintTable';
import { energyEntries, energyMonths } from '../data/energy';
import { exportEnergyLog } from '../utils/exportExcel';
import { fmtNum } from '../utils/traceability';
import { useRowPad } from '../contexts/DensityContext';
import type { Furnace } from '../types/production';

const FURNACES: Furnace[] = ['VPT-01', 'VPT-02'];

export function EnergyLog() {
  const [month, setMonth] = useState(energyMonths[0]);
  const rowPad = useRowPad();

  const rows = useMemo(() => energyEntries.filter((e) => e.month === month), [month]);
  const total = rows.reduce((n, e) => n + e.consumption, 0);
  const weighed = rows.filter((e) => e.consumption > 0 && e.cycleWeight);
  const kwPerKg = weighed.length ?
  (weighed.reduce((n, e) => n + e.consumption, 0) / weighed.reduce((n, e) => n + (e.cycleWeight || 0), 0)).toFixed(2) :
  '—';

  return (
    <>
      <div className="hidden print:block print-landscape">
        <PrintSheetHeader title={`Energy Consumption — ${month}`} />
        <EnergyPrintTable month={month} />
        <div className="mt-1 flex items-center justify-between border border-ink-900 px-2 py-1 font-mono text-[8px] uppercase">
          <span>Energy consumption register</span>
          <span>Total : {fmtNum(total)} KW</span>
          <span>Checked By :- ____________</span>
        </div>
      </div>

      <div className="print:hidden">
        <PageHeader
          docNo="Energy consumption register"
          title="Energy Consumption"
          description="Meter readings are recorded per furnace cycle. Where the run sheet is closed, the reading resolves to its HT Cycle No — so kW can be traced back to a customer's job card."
          actions={
          <>
              <div className="flex rounded-md border border-ink-200 bg-white p-0.5" role="group" aria-label="Month">
                {energyMonths.map((m) =>
              <button
                key={m}
                type="button"
                onClick={() => setMonth(m)}
                aria-pressed={month === m}
                className={`rounded px-3 py-1.5 font-mono text-xs font-medium transition-colors duration-150 ease-out ${
                month === m ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'}`
                }>
                
                    {m}
                  </button>
              )}
              </div>
              <SheetActions onExport={() => exportEnergyLog(month)} />
            </>
          } />
        
        <ChainStrip active="energy" />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-400">Recorded consumption</p>
          <p className="tabular mt-1 font-mono text-2xl font-semibold text-ink-900">{fmtNum(total)} <span className="text-sm font-medium text-ink-400">KW</span></p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-400">Avg. per kg charged</p>
          <p className="tabular mt-1 font-mono text-2xl font-semibold text-ink-900">{kwPerKg} <span className="text-sm font-medium text-ink-400">KW/KG</span></p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-400">Traced to HT Cycle No</p>
          <p className="tabular mt-1 font-mono text-2xl font-semibold text-ink-900">
            {rows.filter((e) => e.htCycleNo).length}
            <span className="text-sm font-medium text-ink-400"> / {rows.length}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {FURNACES.map((furnace) => {
            const list = rows.filter((e) => e.furnace === furnace);
            return (
              <section
                key={furnace}
                className="overflow-hidden rounded-lg border border-ink-200 bg-white"
                aria-labelledby={`e-${furnace}`}>
                
              <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-4 py-2.5">
                <h2 id={`e-${furnace}`} className="font-mono text-base font-bold text-ink-900">
                  {furnace}
                </h2>
                <span className="tabular font-mono text-xs text-ink-500">
                  {fmtNum(list.reduce((n, e) => n + e.consumption, 0))} KW
                </span>
              </div>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wider text-ink-400">
                      <th scope="col" className="px-3 py-2 font-semibold">Sr</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Furnace cycle no</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Wt</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Start</th>
                      <th scope="col" className="px-3 py-2 font-semibold">End</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">KW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e) =>
                      <tr key={e.furnaceCycleNo} className="border-b border-ink-100 align-top last:border-b-0">
                        <td className={`px-3 ${rowPad} font-mono text-[12px] text-ink-400`}>{e.srNo}</td>
                        <td className={`px-3 ${rowPad}`}>
                          <p className="font-mono text-[12px] text-ink-800">{e.furnaceCycleNo}</p>
                          {e.htCycleNo ?
                          <div className="mt-0.5">
                              <CycleLink htCycleNo={e.htCycleNo} subtle />
                            </div> :
                          null}
                        </td>
                        <td className={`tabular px-3 ${rowPad} font-mono text-[12px] text-ink-700`}>
                          {e.cycleWeight ?? 'DESING'}
                        </td>
                        <td className={`tabular px-3 ${rowPad} font-mono text-[12px] text-ink-500`}>
                          {e.startMeter ? fmtNum(e.startMeter) : '—'}
                        </td>
                        <td className={`tabular px-3 ${rowPad} font-mono text-[12px] text-ink-500`}>
                          {e.endMeter ? fmtNum(e.endMeter) : '—'}
                        </td>
                        <td className={`tabular px-3 ${rowPad} text-right font-mono text-[12px] font-semibold text-ink-900`}>
                          {e.consumption > 0 ? e.consumption : <span className="font-normal text-ink-400">open</span>}
                        </td>
                      </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </section>);

          })}
        </div>
      </div>
    </>);

}