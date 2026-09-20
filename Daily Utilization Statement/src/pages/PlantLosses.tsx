import React from 'react';
import { FURNACES } from '../data/furnaces';
import { useUtilisation } from '../contexts/UtilisationContext';
import { PrintButton } from '../components/PrintButton';
import { PlantLossesSheet } from '../components/sheets/PlantLossesSheet';

export function PlantLosses() {
  const { monthLabel, daysInMonth, workingDays, setWorkingDays, availableHoursPerFurnace } =
  useUtilisation();

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Monthly result sheet
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Plant losses · {monthLabel}</h2>
        </div>
        <PrintButton label="Print plant losses" />
      </div>

      <section className="no-print flex flex-wrap items-end gap-6 rounded-sheet border border-line bg-white p-4">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Working days in month
          </span>
          <input
            type="number"
            min={1}
            max={daysInMonth}
            step={1}
            value={workingDays}
            onChange={(event) =>
            setWorkingDays(
              Math.max(1, Math.min(daysInMonth, Number(event.target.value) || 1))
            )
            }
            className="mt-1.5 block h-9 w-28 rounded border border-line bg-white px-2 text-center font-mono text-sm tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
          
        </label>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Available time per furnace
          </p>
          <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-ink">
            {workingDays} × 24 = {availableHoursPerFurnace}
            <span className="ml-1 text-[11px] font-medium text-ink-soft">hrs</span>
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Total available ({FURNACES.length} furnaces)
          </p>
          <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-ink">
            {availableHoursPerFurnace * FURNACES.length}
            <span className="ml-1 text-[11px] font-medium text-ink-soft">hrs</span>
          </p>
        </div>

        <p className="max-w-sm text-xs text-ink-muted">
          25 days → 600 hrs, 26 days → 624 hrs. Loss time comes from the daily entries; used time and
          % are calculated against this base.
        </p>
      </section>

      <PlantLossesSheet />
    </div>);

}