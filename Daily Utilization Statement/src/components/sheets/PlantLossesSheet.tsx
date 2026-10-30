import React from 'react';
import { LOSS_CATEGORIES, LOSS_CODES } from '../../data/furnaces';
import { useUtilisation } from '../../contexts/UtilisationContext';
import type { MonthSummary } from '../../types/utilisation';
import { SheetPaper } from '../SheetPaper';
import { fmt, plantSummary } from '../../utils/utilisation';

const B = 'border border-black';

function FurnaceBlock({ summary }: {summary: MonthSummary;}) {
  return (
    <table className="w-full table-fixed border-collapse text-center">
      <caption className="sr-only">{summary.furnace.sheetName} monthly losses</caption>
      <colgroup>
        {LOSS_CODES.map((code) =>
        <col key={code} />
        )}
      </colgroup>
      <tbody>
        <tr>
          <th
            scope="colgroup"
            colSpan={LOSS_CODES.length}
            className={`${B} py-1 text-[13px] font-bold tracking-wide text-[#4b2e83]`}>
            
            {summary.furnace.sheetName}
          </th>
        </tr>
        <tr>
          {LOSS_CODES.map((code) =>
          <th key={code} scope="col" className={`${B} bg-[#eceedd] py-0.5 font-mono text-[12px] font-bold text-[#4b2e83]`}>
              {code}
            </th>
          )}
        </tr>
        <tr>
          {LOSS_CATEGORIES.map((category) =>
          <th
            key={category.code}
            scope="col"
            className={`${B} px-0.5 py-1.5 align-middle text-[10.5px] font-semibold leading-tight`}>
            
              {category.sheetLabel}
            </th>
          )}
        </tr>
        <tr>
          {LOSS_CODES.map((code) =>
          <td key={code} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-accent`}>
              {fmt(summary.hoursByCode[code], 2)}
            </td>
          )}
        </tr>
        <tr>
          <th scope="col" colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>
            AVAILABLE TIME
          </th>
          <th scope="col" colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>
            LOSS TIME
          </th>
          <th scope="col" colSpan={2} className={`${B} py-0.5 text-[11px] font-bold`}>
            USED TIME
          </th>
          <th scope="col" className={`${B} py-0.5 text-[11px] font-bold`}>
            % OF TIME USED
          </th>
        </tr>
        <tr>
          <td colSpan={2} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-accent`}>
            {fmt(summary.availableHours, 0)}
          </td>
          <td colSpan={2} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-accent`}>
            {fmt(summary.lossHours, 2)}
          </td>
          <td colSpan={2} className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-accent`}>
            {fmt(summary.usedHours, 1)}
          </td>
          <td className={`${B} py-1 font-mono text-[12.5px] tabular-nums text-accent`}>
            {fmt(summary.percentUsed, 1)}
          </td>
        </tr>
      </tbody>
    </table>);

}

export function PlantLossesSheet() {
  const { entries, daysInMonth, monthLabel, workingDays, availableHoursPerFurnace } =
  useUtilisation();
  const plant = plantSummary(entries, daysInMonth, availableHoursPerFurnace);

  return (
    <SheetPaper orientation="portrait">
      <div className="border-2 border-black">
        <h2 className="border-b-2 border-black py-2 text-center text-xl font-bold tracking-wide">
          PLANT LOSSES FOR THE MONTH OF {monthLabel}
        </h2>

        {plant.furnaces.map((summary, index) =>
        <div key={summary.furnace.id}>
            {index > 0 ? <div className="h-3 border-y border-black bg-[#9cc3e5]" /> : null}
            <FurnaceBlock summary={summary} />
          </div>
        )}

        <div className="h-3 border-y border-black bg-[#9cc3e5]" />

        <table className="w-full table-fixed border-collapse text-center">
          <caption className="sr-only">Plant totals for {monthLabel}</caption>
          <tbody>
            <tr>
              <th scope="col" className={`${B} py-1 text-[11.5px] font-bold text-[#4b2e83]`}>
                TOTAL AVAILABLE TIME
              </th>
              <th scope="col" className={`${B} py-1 text-[11.5px] font-bold text-[#4b2e83]`}>
                TOTAL LOSS TIME
              </th>
              <th scope="col" className={`${B} py-1 text-[11.5px] font-bold text-[#4b2e83]`}>
                TOTAL USED TIME
              </th>
              <th scope="col" className={`${B} py-1 text-[11.5px] font-bold text-[#4b2e83]`}>
                % OF Time Used
              </th>
            </tr>
            <tr>
              <td className={`${B} py-1.5 font-mono text-[14px] font-semibold tabular-nums text-accent`}>
                {fmt(plant.availableHours, 0)}
              </td>
              <td className={`${B} py-1.5 font-mono text-[14px] font-semibold tabular-nums text-accent`}>
                {fmt(plant.lossHours, 2)}
              </td>
              <td className={`${B} py-1.5 font-mono text-[14px] font-semibold tabular-nums text-accent`}>
                {fmt(plant.usedHours, 2)}
              </td>
              <td className={`${B} py-1.5 font-mono text-[14px] font-semibold tabular-nums text-accent`}>
                {fmt(plant.percentUsed, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10px] font-medium text-black">
        All figures in hours · available time = {workingDays} days × 24 hrs ={' '}
        {availableHoursPerFurnace} hrs per furnace
      </p>
    </SheetPaper>);

}