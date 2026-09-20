import React from 'react';
import { DAILY_SHEET_GROUPS, FURNACES } from '../data/furnaces';
import { useUtilisation } from '../contexts/UtilisationContext';
import { PrintButton } from '../components/PrintButton';
import { DailyUtilisationSheet } from '../components/sheets/DailyUtilisationSheet';
import { IdleTimeSheet } from '../components/sheets/IdleTimeSheet';
import { PlantLossesSheet } from '../components/sheets/PlantLossesSheet';

export function PrintPack() {
  const { monthLabel, selectedDay } = useUtilisation();
  const pageCount = DAILY_SHEET_GROUPS.length + FURNACES.length + 1;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Print pack · {pageCount} pages
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">{monthLabel} records</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Daily statements for day {selectedDay}, one idle time sheet per furnace, and the plant
            losses summary — in one print job.
          </p>
        </div>
        <PrintButton label="Print all sheets" />
      </div>

      {DAILY_SHEET_GROUPS.map((group) =>
      <DailyUtilisationSheet key={group.id} furnaces={group.furnaces} title={group.title} />
      )}
      {FURNACES.map((furnace) =>
      <IdleTimeSheet key={furnace.id} furnace={furnace} />
      )}
      <PlantLossesSheet />
    </div>);

}