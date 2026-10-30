import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { DAILY_FURNACES, DAILY_SHEET_GROUPS } from '../data/furnaces';
import { useUtilisation } from '../contexts/UtilisationContext';
import { DayStrip } from '../components/DayStrip';
import { PrintButton } from '../components/PrintButton';
import { UtilisationMeter } from '../components/UtilisationMeter';
import { DailyUtilisationSheet } from '../components/sheets/DailyUtilisationSheet';
import { daySummary, fmt } from '../utils/utilisation';

export function DailyStatement() {
  const { entries, availability, selectedDay, monthLabel } = useUtilisation();

  const summaries = useMemo(
    () =>
    DAILY_FURNACES.map((furnace) => ({
      furnace,
      summary: daySummary(entries, furnace, selectedDay, availability)
    })),
    [entries, availability, selectedDay]
  );

  const totals = summaries.reduce(
    (acc, item) => ({
      available: acc.available + item.summary.availableMinutes,
      loss: acc.loss + item.summary.lossMinutes,
      used: acc.used + item.summary.usedMinutes
    }),
    { available: 0, loss: 0, used: 0 }
  );
  const plantPercent = totals.available ? totals.used / totals.available * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Daily entry form
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            {String(selectedDay).padStart(2, '0')} {monthLabel}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton label="Print daily statements" />
          <Link
            to="/monthly"
            className="inline-flex items-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-sm font-medium text-accent transition-colors duration-150 ease-out hover:border-accent">
            
            Month roll-up
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="no-print">
        <DayStrip />
      </div>

      {DAILY_SHEET_GROUPS.map((group) =>
      <DailyUtilisationSheet key={group.id} furnaces={group.furnaces} title={group.title} />
      )}

      <section className="no-print rounded-sheet border border-line bg-white p-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <div className="border-b border-line pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
            <UtilisationMeter percent={plantPercent} label="Plant used today" size="lg" />
            <dl className="mt-4 grid grid-cols-3 gap-3">
              {[
              { label: 'Available', value: totals.available, tone: 'text-ink' },
              { label: 'Loss', value: totals.loss, tone: 'text-danger' },
              { label: 'Used', value: totals.used, tone: 'text-ok' }].
              map((item) =>
              <div key={item.label}>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{item.label}</dt>
                  <dd className={`font-mono text-base font-semibold tabular-nums ${item.tone}`}>
                    {item.value}
                    <span className="ml-1 text-[10px] font-medium text-ink-soft">min</span>
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-ink-muted">
              {fmt(totals.loss / 60, 2)} hrs lost today across {DAILY_FURNACES.length} furnaces.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {summaries.map(({ furnace, summary }) =>
            <div key={furnace.id} className="rounded border border-line bg-surface-sunken p-3">
                <p className="truncate text-xs font-semibold text-ink">{furnace.name}</p>
                <p className="text-[11px] text-ink-muted">
                  {summary.lossMinutes} min lost of {summary.availableMinutes} min
                </p>
                <div className="mt-3">
                  <UtilisationMeter percent={summary.percentUsed} size="sm" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>);

}