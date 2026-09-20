import React from 'react';
import { energyFor, fmtNum, hhmm, loadTotals, temperingFor } from '../utils/traceability';
import type { HeatCycle } from '../types/production';

function Field({ label, value, className = '' }: {label: string;value: string;className?: string;}) {
  return (
    <div className={`flex items-baseline gap-1 border border-ink-900 px-1 py-1 ${className}`}>
      <span className="shrink-0 text-[7px] font-bold uppercase">{label}</span>
      <span className="min-w-0 truncate font-mono text-[9px]">{value}</span>
    </div>);

}

/** Print-only recreation of the QF/PD/02 VHT Run Sheet. */
export function RunSheetPrint({ cycle }: {cycle: HeatCycle;}) {
  const rs = cycle.runSheet;
  const totals = loadTotals(cycle);
  const temper = temperingFor(cycle.htCycleNo);
  const energy = energyFor(cycle.htCycleNo);

  return (
    <div>
      <div className="flex items-stretch border border-ink-900">
        <span className="flex w-12 items-center justify-center border-r border-ink-900 font-mono text-xs font-bold">
          SVT
        </span>
        <p className="flex flex-1 items-center justify-center text-sm font-bold uppercase tracking-wide">
          VHT Run Sheet
        </p>
        <p className="flex w-48 items-center justify-center border-l border-ink-900 text-center text-[10px] font-bold uppercase leading-tight">
          Shital Vacuum Treat Pvt. Ltd.
        </p>
      </div>

      <div className="mt-1 grid grid-cols-4">
        <Field label="HT Cycle No :-" value={cycle.htCycleNo} />
        <Field label="Date :-" value={cycle.date} />
        <Field label="Furnace :-" value={cycle.furnace} />
        <Field label="Loading Operator :-" value={rs.loadingOperator} />
        <Field label="Cycle Start Time :-" value={hhmm(rs.cycleStartTime)} />
        <Field label="Cycle End Time :-" value={hhmm(rs.cycleEndTime)} />
        <Field label="Total Time :-" value={rs.totalTime} />
        <Field label="Furnace Cycle No :-" value={cycle.furnaceCycleNo} />
        <Field label="M.R Start :-" value={rs.mrStart} />
        <Field label="M.R End :-" value={rs.mrEnd} />
        <Field label="Total M.R :-" value={rs.totalMr} />
        <Field label="Supervisor :-" value={rs.supervisor} />
      </div>

      <div className="mt-1 flex gap-1">
        <table className="flex-1 border-collapse text-[8px]">
          <thead>
            <tr>
              <th scope="col" className="w-5 px-1 py-0.5 text-center font-bold uppercase">Sr</th>
              <th scope="col" className="px-1 py-0.5 text-left font-bold uppercase">Customers</th>
              <th scope="col" className="px-1 py-0.5 text-left font-bold uppercase">Job card no</th>
              <th scope="col" className="px-1 py-0.5 text-left font-bold uppercase">Job description</th>
              <th scope="col" className="w-8 px-1 py-0.5 text-center font-bold uppercase">Mtrl</th>
              <th scope="col" className="w-10 px-1 py-0.5 text-center font-bold uppercase">HRC req</th>
              <th scope="col" className="w-7 px-1 py-0.5 text-center font-bold uppercase">Qty</th>
              <th scope="col" className="w-10 px-1 py-0.5 text-center font-bold uppercase">W.T</th>
              <th scope="col" className="w-12 px-1 py-0.5 text-center font-bold uppercase">Fixtures</th>
              <th scope="col" className="w-12 px-1 py-0.5 text-center font-bold uppercase">T.C position</th>
            </tr>
          </thead>
          <tbody>
            {cycle.items.map((item, i) =>
            <tr key={`${item.customer}-${item.jobCard}`}>
                <td className="px-1 py-0.5 text-center font-mono">{i + 1}</td>
                <td className="px-1 py-0.5 font-medium uppercase">{item.customer}</td>
                <td className="px-1 py-0.5 font-mono">{item.jobCard}</td>
                <td className="px-1 py-0.5 uppercase">{item.description}</td>
                <td className="px-1 py-0.5 text-center font-mono">{item.mtrl}</td>
                <td className="px-1 py-0.5 text-center font-mono">{item.hrc}</td>
                <td className="tabular px-1 py-0.5 text-right font-mono">{item.qty}</td>
                <td className="tabular px-1 py-0.5 text-right font-mono">{item.wt}</td>
                <td className="px-1 py-0.5" />
                <td className="px-1 py-0.5" />
              </tr>
            )}
            <tr>
              <td colSpan={6} className="px-1 py-0.5 text-right font-bold uppercase">
                Total
              </td>
              <td className="tabular px-1 py-0.5 text-right font-mono font-bold">{totals.qty}</td>
              <td className="tabular px-1 py-0.5 text-right font-mono font-bold">{totals.wt}</td>
              <td className="px-1 py-0.5" />
              <td className="px-1 py-0.5" />
            </tr>
          </tbody>
        </table>

        <div className="w-52 shrink-0">
          <p className="border border-ink-900 py-0.5 text-center text-[8px] font-bold uppercase">Cycle parameters</p>
          <table className="w-full border-collapse text-[8px]">
            <tbody>
              {[
              ['Type of hardening', rs.hardeningType],
              ['Temperature / soak', cycle.temperature],
              ['Quenching pressure', rs.quenchPressure],
              ['Fan speed', rs.fanSpeed],
              ['Hold', cycle.hold]].
              map(([k, v]) =>
              <tr key={k}>
                  <th scope="row" className="px-1 py-0.5 text-left font-semibold uppercase">
                    {k}
                  </th>
                  <td className="px-1 py-0.5 font-mono">{v}</td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="mt-1 border border-ink-900 py-0.5 text-center text-[8px] font-bold uppercase">
            Linked records
          </p>
          <table className="w-full border-collapse text-[8px]">
            <tbody>
              <tr>
                <th scope="row" className="px-1 py-0.5 text-left font-semibold uppercase">
                  Tempering slots
                </th>
                <td className="px-1 py-0.5 font-mono">
                  {temper.length > 0 ? temper.map((s) => `${s.furnace}#${s.srNo}`).join(', ') : '—'}
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-1 py-0.5 text-left font-semibold uppercase">
                  Energy (KW)
                </th>
                <td className="tabular px-1 py-0.5 font-mono">
                  {energy && energy.consumption > 0 ? fmtNum(energy.consumption) : '—'}
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-1 py-0.5 text-left font-semibold uppercase">
                  Meter start / end
                </th>
                <td className="tabular px-1 py-0.5 font-mono">
                  {rs.mrStart} / {rs.mrEnd}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-1 border border-ink-900 px-1 py-0.5 text-[8px] font-bold uppercase">Check points :-</p>
      <div className="grid grid-cols-4">
        <Field label="1) Gas pressure :-" value={rs.gasPressure} />
        <Field label="Water circulation :-" value={rs.waterCirculation} />
        <Field label="2) Power failure from :-" value={rs.powerFailureFrom} />
        <Field label="To :-" value={rs.powerFailureTo} />
      </div>
      <p className="border border-ink-900 px-1 py-1 text-[7px] uppercase">
        3) After processing within 24 hrs. supervisor shall verify process parameter (graph) &amp; sign below.
      </p>
      <Field label="Remark :-" value={rs.remark} />
      <div className="grid grid-cols-2">
        <Field label="Operators sign :-" value="" />
        <Field label="Prod. supervisor sign :-" value={rs.verified ? rs.supervisor : ''} />
      </div>
      <div className="mt-1 flex items-center justify-between border border-ink-900 px-2 py-1 font-mono text-[8px] uppercase">
        <span>QF/PD/02</span>
        <span>Rev. No :- 01</span>
        <span>Effective date : 1/1/2021</span>
        <span>Page 1 of 2</span>
      </div>
    </div>);

}