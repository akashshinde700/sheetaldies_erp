import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon, CalendarDaysIcon, CheckCircle2Icon, FlameIcon, PrinterIcon, ZapIcon } from 'lucide-react';
import { StatusPill } from '../components/StatusPill';
import { RunSheetPrint } from '../components/RunSheetPrint';
import { cycleFromSlug, energyFor, fmtNum, hhmm, loadTotals, temperingFor } from '../utils/traceability';

function Meta({ label, value }: {label: string;value: string;}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[13px] text-ink-900">{value}</p>
    </div>);

}

function RailCard({
  title,
  icon: Icon,
  children




}: {title: string;icon: React.ComponentType<{className?: string;}>;children: React.ReactNode;}) {
  return (
    <section className="rounded-lg border border-ink-200 bg-white">
      <h2 className="flex items-center gap-2 border-b border-ink-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <Icon className="h-3.5 w-3.5 text-ink-400" />
        {title}
      </h2>
      <div className="px-4 py-3">{children}</div>
    </section>);

}

export function RunSheetDetail() {
  const { cycleId = '' } = useParams();
  const cycle = cycleFromSlug(cycleId);

  if (!cycle) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-ink-200 bg-white px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-ink-900">Run sheet not found</h1>
        <p className="mt-1.5 text-sm text-ink-500">No cycle is registered against this HT Cycle No.</p>
        <Link
          to="/run-sheets"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink-900 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-ink-800">
          
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> All run sheets
        </Link>
      </div>);

  }

  const totals = loadTotals(cycle);
  const temper = temperingFor(cycle.htCycleNo);
  const energy = energyFor(cycle.htCycleNo);
  const rs = cycle.runSheet;

  return (
    <>
      <div className="hidden print:block print-landscape">
        <RunSheetPrint cycle={cycle} />
      </div>

      <div className="print:hidden">
      <Link
          to="/run-sheets"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors duration-150 ease-out hover:text-ink-900">
          
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> All run sheets
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-400">QF/PD/02 · Rev 01</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight text-ink-900">
            VHT Run Sheet
            <span className="rounded bg-brand-600 px-2 py-1 font-mono text-base font-semibold text-white">
              {cycle.htCycleNo}
            </span>
            <StatusPill status={cycle.status} />
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Issued from Daily Production Planning ·{' '}
            <Link to="/" className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500">
              {cycle.furnace} Sr. No {cycle.srNo}
            </Link>
          </p>
        </div>
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink-900 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            
          <PrinterIcon className="h-4 w-4" aria-hidden="true" /> Print run sheet
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-ink-200 bg-white px-4 py-4 sm:grid-cols-4 xl:grid-cols-8">
        <Meta label="Date" value={cycle.date} />
        <Meta label="Furnace" value={cycle.furnace} />
        <Meta label="Furnace cycle no" value={cycle.furnaceCycleNo} />
        <Meta label="Cycle start" value={hhmm(rs.cycleStartTime)} />
        <Meta label="Cycle end" value={hhmm(rs.cycleEndTime)} />
        <Meta label="Total time" value={rs.totalTime} />
        <Meta label="M.R start / end" value={`${rs.mrStart} / ${rs.mrEnd}`} />
        <Meta label="Loading operator" value={rs.loadingOperator} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-lg border border-ink-200 bg-white">
            <h2 className="border-b border-ink-200 bg-ink-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Charge details — {cycle.items.length} job cards
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wider text-ink-400">
                    <th scope="col" className="w-10 px-3 py-2 font-semibold">Sr</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Customer</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Job card no</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Description</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Mtrl</th>
                    <th scope="col" className="px-3 py-2 font-semibold">HRC req</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Wt (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {cycle.items.map((item, i) =>
                    <tr key={`${item.customer}-${item.jobCard}`} className="border-b border-ink-100">
                      <td className="px-3 py-2 font-mono text-[12px] text-ink-400">{i + 1}</td>
                      <td className="px-3 py-2 text-[13px] font-medium text-ink-900">{item.customer}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-ink-700">{item.jobCard}</td>
                      <td className="px-3 py-2 text-[12px] text-ink-500">{item.description}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-ink-700">{item.mtrl}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-ink-700">{item.hrc}</td>
                      <td className="tabular px-3 py-2 text-right font-mono text-[12px] text-ink-800">{item.qty}</td>
                      <td className="tabular px-3 py-2 text-right font-mono text-[12px] text-ink-800">{item.wt}</td>
                    </tr>
                    )}
                  <tr className="bg-ink-50">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500" colSpan={5}>
                      Total charge
                    </td>
                    <td className="tabular px-3 py-2 text-right font-mono text-[13px] font-semibold text-ink-900">
                      {totals.qty}
                    </td>
                    <td className="tabular px-3 py-2 text-right font-mono text-[13px] font-semibold text-ink-900">
                      {totals.wt}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-ink-200 bg-white px-4 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Check points</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-ink-400">Gas pressure</dt>
                <dd className="mt-0.5 font-mono text-[13px] text-ink-900">{rs.gasPressure}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-ink-400">Water circulation</dt>
                <dd className="mt-0.5 font-mono text-[13px] text-ink-900">{rs.waterCirculation}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-ink-400">Power failure</dt>
                <dd className="mt-0.5 font-mono text-[13px] text-ink-900">
                  {rs.powerFailureFrom} → {rs.powerFailureTo}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-ink-400">Supervisor</dt>
                <dd className="mt-0.5 font-mono text-[13px] text-ink-900">{rs.supervisor}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-ink-100 pt-3 text-[12px] text-ink-500">
              <span className="font-medium text-ink-700">Remark: </span>
              {rs.remark}
            </p>
            <p
                className={`mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium ${
                rs.verified ? 'text-emerald-700' : 'text-amber-700'}`
                }>
                
              <CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {rs.verified ?
                'Parameters verified & signed within 24 hrs' :
                'Awaiting supervisor verification (within 24 hrs)'}
            </p>
          </section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <RailCard title="Cycle parameters" icon={FlameIcon}>
            <dl className="space-y-2">
              {[
                ['Type of hardening', rs.hardeningType],
                ['Temperature / soak', cycle.temperature],
                ['Quenching pressure', rs.quenchPressure],
                ['Fan speed', rs.fanSpeed],
                ['Hold', cycle.hold]].
                map(([k, v]) =>
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[12px] text-ink-500">{k}</dt>
                  <dd className="text-right font-mono text-[12px] font-medium text-ink-900">{v}</dd>
                </div>
                )}
            </dl>
          </RailCard>

          <RailCard title="Tempering slots on this cycle" icon={CalendarDaysIcon}>
            {temper.length > 0 ?
              <ul className="space-y-2.5">
                {temper.map((s) =>
                <li key={s.id} className="rounded-md border border-ink-100 bg-ink-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[12px] font-semibold text-ink-900">
                        {s.furnace} · slot {s.srNo}
                      </span>
                      <span className="tabular font-mono text-[11px] text-ink-500">
                        {hhmm(s.startTime)}–{hhmm(s.endTime)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-ink-600">{s.process}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-400">{s.batch}</p>
                  </li>
                )}
                <li>
                  <Link
                    to="/tempering"
                    className="text-[12px] font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500">
                    
                    Open tempering plan
                  </Link>
                </li>
              </ul> :

              <p className="text-[12px] text-ink-500">No tempering slot has claimed this cycle yet.</p>
              }
          </RailCard>

          <RailCard title="Energy record" icon={ZapIcon}>
            {energy ?
              <>
                <p className="tabular font-mono text-2xl font-semibold text-ink-900">
                  {energy.consumption > 0 ? fmtNum(energy.consumption) : '—'}
                  <span className="ml-1 text-sm font-medium text-ink-400">KW</span>
                </p>
                <dl className="mt-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[12px] text-ink-500">Furnace cycle no</dt>
                    <dd className="font-mono text-[12px] text-ink-900">{energy.furnaceCycleNo}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[12px] text-ink-500">Start meter</dt>
                    <dd className="tabular font-mono text-[12px] text-ink-900">
                      {energy.startMeter ? fmtNum(energy.startMeter) : '—'}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[12px] text-ink-500">End meter</dt>
                    <dd className="tabular font-mono text-[12px] text-ink-900">
                      {energy.endMeter ? fmtNum(energy.endMeter) : '—'}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[12px] text-ink-500">Cycle weight</dt>
                    <dd className="tabular font-mono text-[12px] text-ink-900">{energy.cycleWeight ?? '—'} kg</dd>
                  </div>
                  {energy.consumption > 0 && energy.cycleWeight ?
                  <div className="flex items-baseline justify-between gap-3 border-t border-ink-100 pt-2">
                      <dt className="text-[12px] font-medium text-ink-700">KW per kg</dt>
                      <dd className="tabular font-mono text-[12px] font-semibold text-ink-900">
                        {(energy.consumption / energy.cycleWeight).toFixed(2)}
                      </dd>
                    </div> :
                  null}
                </dl>
                <Link
                  to="/energy"
                  className="mt-3 inline-block text-[12px] font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500">
                  
                  Open energy log
                </Link>
              </> :

              <p className="text-[12px] text-ink-500">No meter reading logged against this cycle.</p>
              }
          </RailCard>
        </div>
      </div>
      </div>
    </>);

}