import React from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ChainStrip } from '../components/ChainStrip';
import { CycleLink } from '../components/CycleLink';
import { SheetActions } from '../components/SheetActions';
import { PrintSheetFooter, PrintSheetHeader } from '../components/PrintSheet';
import { TemperingPrintTable } from '../components/TemperingPrintTable';
import { temperingFurnaces, temperingSlots } from '../data/tempering';
import { exportTemperingPlan } from '../utils/exportExcel';
import { getCycle, hhmm } from '../utils/traceability';

export function TemperingPlan() {
  const unlinked = temperingSlots.filter((s) => s.htCycleNos.length === 0).length;

  return (
    <>
      <div className="hidden print:block print-landscape">
        <PrintSheetHeader title="Tempering Furnace Planing" />
        <TemperingPrintTable />
        <PrintSheetFooter page="Page 2 of 2" signatures={false} />
      </div>

      <div className="print:hidden">
      <PageHeader
          docNo="QF/PD/03 · Rev 00 · Page 2 of 2"
          title="Tempering Furnace Planning"
          description="Every tempering slot names the HT Cycle No it is tempering, so a batch label like “SHIRODKAR + D2” resolves to a real hardening load."
          actions={<SheetActions onExport={exportTemperingPlan} />} />
        
      <ChainStrip active="temper" />

      {unlinked > 0 ?
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-[13px] text-amber-900">
            <span className="font-semibold">{unlinked} slots have no HT Cycle No.</span> These are carry-forward loads
            from the previous day — link them so the tempering record is traceable.
          </p>
        </div> :
        null}

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {temperingFurnaces.map((furnace) => {
            const slots = temperingSlots.filter((s) => s.furnace === furnace);
            return (
              <section
                key={furnace}
                className="flex flex-col overflow-hidden rounded-lg border border-ink-200 bg-white"
                aria-labelledby={`t-${furnace}`}>
                
              <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-4 py-2.5">
                <h2 id={`t-${furnace}`} className="font-mono text-base font-bold text-ink-900">
                  {furnace}
                </h2>
                <span className="text-[11px] uppercase tracking-wider text-ink-400">{slots.length} slots</span>
              </div>
              <ul className="flex-1 divide-y divide-ink-100">
                {slots.map((slot) =>
                  <li key={slot.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-snug text-ink-900">{slot.process}</p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-500">{slot.batch}</p>
                      </div>
                      <p className="tabular shrink-0 text-right font-mono text-[12px] text-ink-700">
                        {hhmm(slot.startTime)}
                        <span className="block text-ink-400">{hhmm(slot.endTime)}</span>
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {slot.htCycleNos.length > 0 ?
                      slot.htCycleNos.map((no) => {
                        const c = getCycle(no);
                        return (
                          <span key={no} className="inline-flex items-center gap-1.5">
                              <CycleLink htCycleNo={no} />
                              {c ? <span className="font-mono text-[10px] text-ink-400">{c.furnace}</span> : null}
                            </span>);

                      }) :

                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                          Cycle no. not linked
                        </span>
                      }
                    </div>
                  </li>
                  )}
              </ul>
            </section>);

          })}
        </div>
      </div>
    </>);

}