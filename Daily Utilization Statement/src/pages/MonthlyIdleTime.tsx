import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FURNACES } from '../data/furnaces';
import { useUtilisation } from '../contexts/UtilisationContext';
import { PrintButton } from '../components/PrintButton';
import { UtilisationMeter } from '../components/UtilisationMeter';
import { IdleTimeSheet } from '../components/sheets/IdleTimeSheet';
import { fmt, monthSummary } from '../utils/utilisation';

export function MonthlyIdleTime() {
  const { entries, daysInMonth, monthLabel, availableHoursPerFurnace, setSelectedDay } =
  useUtilisation();
  const [furnaceId, setFurnaceId] = useState(FURNACES[0].id);
  const navigate = useNavigate();

  const furnace = FURNACES.find((item) => item.id === furnaceId) ?? FURNACES[0];
  const summary = useMemo(
    () => monthSummary(entries, furnace, daysInMonth, availableHoursPerFurnace),
    [entries, furnace, daysInMonth, availableHoursPerFurnace]
  );

  const openDay = (day: number) => {
    setSelectedDay(day);
    navigate('/');
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Hardening idle time register
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">{monthLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="tablist" aria-label="Furnace">
            {FURNACES.map((item) =>
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === furnaceId}
              onClick={() => setFurnaceId(item.id)}
              className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out ${
              item.id === furnaceId ?
              'border-accent bg-surface-accent text-accent' :
              'border-line bg-white text-ink-muted hover:border-line-strong hover:text-ink'}`
              }>
              
                {item.shortName}
              </button>
            )}
          </div>
          <PrintButton label="Print idle time sheet" />
        </div>
      </div>

      <section className="no-print grid gap-4 rounded-sheet border border-line bg-white p-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="sm:border-r sm:border-line sm:pr-4">
          <UtilisationMeter percent={summary.percentUsed} label="Month used" size="md" />
          <p className="mt-2 text-xs text-ink-muted">{furnace.name}</p>
        </div>
        <dl className="grid grid-cols-3 gap-4">
          {[
          { label: 'Available', value: fmt(summary.availableHours, 0), tone: 'text-ink' },
          { label: 'Loss', value: fmt(summary.lossHours, 2), tone: 'text-danger' },
          { label: 'Used', value: fmt(summary.usedHours, 2), tone: 'text-ok' }].
          map((item) =>
          <div key={item.label}>
              <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{item.label}</dt>
              <dd className={`font-mono text-base font-semibold tabular-nums ${item.tone}`}>
                {item.value}
                <span className="ml-1 text-[10px] font-medium text-ink-soft">hrs</span>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <IdleTimeSheet furnace={furnace} onSelectDay={openDay} />
    </div>);

}