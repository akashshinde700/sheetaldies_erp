import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2Icon, CircleDashedIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ChainStrip } from '../components/ChainStrip';
import { StatusPill } from '../components/StatusPill';
import { cycles } from '../data/cycles';
import { cycleSlug, energyFor, hhmm, loadTotals, temperingFor } from '../utils/traceability';
import { useRowPad } from '../contexts/DensityContext';

export function RunSheetList() {
  const rowPad = useRowPad();

  return (
    <>
      <PageHeader
        docNo="QF/PD/02 · Rev 01"
        title="VHT Run Sheets"
        description="One run sheet per HT Cycle No. Open a sheet to see its load, cycle parameters, tempering slots and meter reading in one place." />
      
      <ChainStrip active="run" />

      <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50 text-[11px] uppercase tracking-wider text-ink-400">
                <th scope="col" className="px-4 py-2.5 font-semibold">HT Cycle No</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Furnace</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Charge</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Cycle window</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Tempering</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Energy</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Verified</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => {
                const totals = loadTotals(c);
                const energy = energyFor(c.htCycleNo);
                const temper = temperingFor(c.htCycleNo);
                return (
                  <tr key={c.htCycleNo} className="border-b border-ink-100 last:border-b-0">
                    <td className={`px-4 ${rowPad}`}>
                      <Link
                        to={`/run-sheets/${cycleSlug(c.htCycleNo)}`}
                        className="font-mono text-[13px] font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 transition-colors duration-150 ease-out hover:decoration-brand-500">
                        
                        {c.htCycleNo}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-400">{c.furnaceCycleNo}</p>
                    </td>
                    <td className={`px-4 ${rowPad} font-mono text-[13px] text-ink-800`}>{c.furnace}</td>
                    <td className={`tabular px-4 ${rowPad} font-mono text-[12px] text-ink-700`}>
                      {totals.qty} nos
                      <span className="block text-ink-400">{totals.wt} kg</span>
                    </td>
                    <td className={`tabular px-4 ${rowPad} font-mono text-[12px] text-ink-700`}>
                      {hhmm(c.startTime)} – {hhmm(c.endTime)}
                    </td>
                    <td className={`px-4 ${rowPad} font-mono text-[12px] text-ink-700`}>
                      {temper.length > 0 ? temper.map((s) => `${s.furnace}#${s.srNo}`).join(', ') : '—'}
                    </td>
                    <td className={`tabular px-4 ${rowPad} font-mono text-[12px] text-ink-700`}>
                      {energy && energy.consumption > 0 ? `${energy.consumption} KW` : '—'}
                    </td>
                    <td className={`px-4 ${rowPad}`}>
                      <StatusPill status={c.status} />
                    </td>
                    <td className={`px-4 ${rowPad}`}>
                      {c.runSheet.verified ?
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
                          <CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden="true" /> Signed
                        </span> :

                      <span className="inline-flex items-center gap-1 text-[12px] text-ink-400">
                          <CircleDashedIcon className="h-3.5 w-3.5" aria-hidden="true" /> Pending
                        </span>
                      }
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </div>
    </>);

}