import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ZapIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ChainStrip } from '../components/ChainStrip';
import { StatusPill } from '../components/StatusPill';
import { CycleLink } from '../components/CycleLink';
import { SheetActions } from '../components/SheetActions';
import { PrintSheetHeader, PrintSheetFooter } from '../components/PrintSheet';
import { exportDailyPlanning } from '../utils/exportExcel';
import { cycles } from '../data/cycles';
import { cycleSlug, energyFor, hhmm, loadTotals, temperingFor } from '../utils/traceability';
import { useRowPad } from '../contexts/DensityContext';
import type { Furnace, HeatCycle } from '../types/production';

const FURNACES: Furnace[] = ['VPT-01', 'VPT-02'];

function LoadSummary({ cycle }: {cycle: HeatCycle;}) {
  const names = Array.from(new Set(cycle.items.map((i) => i.customer)));
  const shown = names.slice(0, 4);
  const rest = names.length - shown.length;
  const totals = loadTotals(cycle);
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium leading-snug text-ink-800">
        {shown.join(' · ')}
        {rest > 0 ? <span className="text-ink-400 print:hidden"> +{rest} more</span> : null}
        {rest > 0 ? <span className="hidden print:inline"> · {names.slice(4).join(' · ')}</span> : null}
      </p>
      <p className="mt-1 font-mono text-[11px] text-ink-400">
        {cycle.items.length} JOB CARDS · {totals.qty} NOS · {totals.wt} KG
      </p>
    </div>);

}

function FurnaceBlock({ furnace }: {furnace: Furnace;}) {
  const rowPad = useRowPad();
  const rows = cycles.filter((c) => c.furnace === furnace);
  const planned = rows.reduce((n, c) => n + loadTotals(c).wt, 0);

  return (
    <section
      className="overflow-hidden rounded-lg border border-ink-200 bg-white print:break-inside-avoid print:rounded-none print:border-ink-900"
      aria-labelledby={`f-${furnace}`}>
      
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-ink-50 px-4 py-3 print:border-ink-900 print:py-1.5">
        <div className="flex items-baseline gap-3">
          <h2 id={`f-${furnace}`} className="font-mono text-lg font-bold tracking-tight text-ink-900 print:text-base">
            {furnace}
          </h2>
          <span className="text-xs text-ink-500">{rows.length} cycles planned</span>
        </div>
        <span className="tabular font-mono text-xs text-ink-500">{Math.round(planned * 10) / 10} KG total charge</span>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[1080px] border-collapse text-left print:min-w-0 print:text-[9px]">
          <thead>
            <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wider text-ink-400 print:border-ink-900 print:text-[8px] print:text-ink-900">
              <th scope="col" className="w-12 px-4 py-2 font-semibold print:px-1 print:py-1">Sr</th>
              <th scope="col" className="w-44 px-4 py-2 font-semibold print:px-1 print:py-1">HT Cycle No</th>
              <th scope="col" className="px-4 py-2 font-semibold print:px-1 print:py-1">Load / customers</th>
              <th scope="col" className="w-28 px-4 py-2 font-semibold print:px-1 print:py-1">Process</th>
              <th scope="col" className="w-40 px-4 py-2 font-semibold print:px-1 print:py-1">Parameters</th>
              <th scope="col" className="w-24 px-4 py-2 font-semibold print:px-1 print:py-1">Time</th>
              <th scope="col" className="w-60 px-4 py-2 font-semibold print:hidden">Linked downstream</th>
              <th scope="col" className="w-10 px-4 py-2 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const temper = temperingFor(c.htCycleNo);
              const energy = energyFor(c.htCycleNo);
              return (
                <React.Fragment key={c.htCycleNo}>
                  <tr className="border-b border-ink-100 align-top print:border-ink-400">
                    <td className={`px-4 ${rowPad} font-mono text-sm text-ink-400 print:px-1 print:py-1 print:text-[9px] print:text-ink-900`}>
                      {c.srNo}
                    </td>
                    <td className={`px-4 ${rowPad} print:px-1 print:py-1`}>
                      <CycleLink htCycleNo={c.htCycleNo} />
                      <p className="mt-1 font-mono text-[11px] text-ink-400 print:text-[8px] print:text-ink-700">
                        {c.furnaceCycleNo}
                      </p>
                      <div className="mt-1.5 print:hidden">
                        <StatusPill status={c.status} />
                      </div>
                    </td>
                    <td className={`px-4 ${rowPad} print:px-1 print:py-1`}>
                      <LoadSummary cycle={c} />
                    </td>
                    <td className={`px-4 ${rowPad} font-mono text-[12px] font-medium text-ink-800 print:px-1 print:py-1 print:text-[9px]`}>
                      {c.process}
                    </td>
                    <td className={`px-4 ${rowPad} font-mono text-[12px] text-ink-700 print:px-1 print:py-1 print:text-[9px]`}>
                      <p>{c.temperature}</p>
                      <p className="text-ink-500 print:text-ink-900">{c.quench}</p>
                    </td>
                    <td className={`tabular px-4 ${rowPad} font-mono text-[13px] text-ink-800 print:px-1 print:py-1 print:text-[9px]`}>
                      <p>{hhmm(c.startTime)}</p>
                      <p className="text-ink-400 print:text-ink-900">{hhmm(c.endTime)}</p>
                    </td>
                    <td className={`px-4 ${rowPad} print:hidden`}>
                      <div className="flex flex-wrap gap-1">
                        {temper.length > 0 ?
                        temper.map((s) =>
                        <Link
                          key={s.id}
                          to="/tempering"
                          className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-sky-800 ring-1 ring-inset ring-sky-200 transition-colors duration-150 ease-out hover:bg-sky-100">
                          
                              {s.furnace}#{s.srNo}
                            </Link>
                        ) :

                        <span className="text-[11px] text-ink-400">No tempering slot yet</span>
                        }
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-ink-500">
                        <ZapIcon className="h-3 w-3 text-ink-400" aria-hidden="true" />
                        {energy && energy.consumption > 0 ? `${energy.consumption} KW` : 'Meter open'}
                      </p>
                    </td>
                    <td className={`px-4 ${rowPad} print:hidden`}>
                      <Link
                        to={`/run-sheets/${cycleSlug(c.htCycleNo)}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-400 transition-colors duration-150 ease-out hover:bg-ink-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        aria-label={`Open run sheet ${c.htCycleNo}`}>
                        
                        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                  <tr className="border-b border-ink-100 print:border-ink-400">
                    <td
                      colSpan={8}
                      className="bg-amber-50 px-4 py-1 text-center font-mono text-[11px] font-semibold tracking-wide text-amber-800 print:px-1 print:text-[8px] print:text-ink-900">
                      
                      {c.hold}
                    </td>
                  </tr>
                </React.Fragment>);

            })}
          </tbody>
        </table>
      </div>
    </section>);

}

export function DailyPlanning() {
  return (
    <>
      <div className="print:hidden">
        <PageHeader
          docNo="QF/PD/03 · Rev 00 · Page 1 of 2"
          title="Daily Production Planning"
          description="Process and parameters are recorded in separate columns, exactly as on the paper form. Each load carries an HT Cycle No that the run sheet, tempering plan and energy log all point back to."
          actions={<SheetActions onExport={exportDailyPlanning} />} />
        
        <ChainStrip active="plan" />
      </div>

      <PrintSheetHeader title="Daily Production Planning" />

      <div className="space-y-6 print:space-y-2">
        {FURNACES.map((f) =>
        <FurnaceBlock key={f} furnace={f} />
        )}
      </div>

      <PrintSheetFooter page="Page 1 of 2" />
    </>);

}