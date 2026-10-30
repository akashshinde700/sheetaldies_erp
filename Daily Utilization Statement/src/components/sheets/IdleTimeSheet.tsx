import React from 'react';
import { LOSS_CATEGORIES, LOSS_CODES } from '../../data/furnaces';
import { useUtilisation } from '../../contexts/UtilisationContext';
import type { Furnace } from '../../types/utilisation';
import { SheetPaper } from '../SheetPaper';
import { fmt, getDayLosses, monthSummary, sumLosses } from '../../utils/utilisation';

const B = 'border border-black';

interface IdleTimeSheetProps {
  furnace: Furnace;
  onSelectDay?: (day: number) => void;
}

export function IdleTimeSheet({ furnace, onSelectDay }: IdleTimeSheetProps) {
  const { entries, daysInMonth, monthLabel } = useUtilisation();
  const summary = monthSummary(entries, furnace, daysInMonth);

  const rows = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const values = getDayLosses(entries, furnace.id, day);
    return { day, values, total: sumLosses(values) };
  });

  const sheetTitle = furnace.sheetName.replace(' FURNACE', '');

  return (
    <SheetPaper orientation="portrait">
      <div className="border-2 border-black">
        <h2 className="border-b-2 border-black px-2 py-2 text-center text-base font-bold italic">
          {sheetTitle} Idle Time for the month of {monthLabel}
        </h2>

        <table className="w-full table-fixed border-collapse text-center">
          <caption className="sr-only">
            {furnace.name} idle time, {monthLabel}, daily figures in minutes
          </caption>
          <colgroup>
            <col className="w-[48px]" />
            {LOSS_CODES.map((code) =>
            <col key={code} />
            )}
            <col className="w-[70px]" />
          </colgroup>

          <thead>
            <tr>
              <th scope="col" rowSpan={2} className={`${B} px-1 py-1 text-[11px] font-bold`}>
                Date
              </th>
              {LOSS_CATEGORIES.map((category) =>
              <th
                key={category.code}
                scope="col"
                className={`${B} px-0.5 py-1 align-middle text-[9.5px] font-semibold leading-tight`}>
                
                  {category.sheetLabel}
                </th>
              )}
              <th scope="col" rowSpan={2} className={`${B} px-1 py-1 text-[11px] font-bold`}>
                Total
              </th>
            </tr>
            <tr>
              {LOSS_CODES.map((code) =>
              <th
                key={code}
                scope="col"
                className={`${B} bg-[#dce6c8] py-0.5 font-mono text-[12px] font-bold`}>
                
                  {code}
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const flagged = row.values.e > 0 || row.values.f > 0 || row.values.g > 0;
              return (
                <tr
                  key={row.day}
                  onClick={onSelectDay ? () => onSelectDay(row.day) : undefined}
                  className={
                  onSelectDay ?
                  'cursor-pointer transition-colors duration-150 ease-out hover:bg-surface-accent print:hover:bg-transparent' :
                  undefined
                  }>
                  
                  <th
                    scope="row"
                    className={`${B} py-0.5 font-mono text-[12px] font-semibold tabular-nums text-danger`}>
                    
                    {row.day}
                  </th>
                  {LOSS_CODES.map((code) =>
                  <td key={code} className={`${B} py-0.5 font-mono text-[12px] tabular-nums`}>
                      {row.values[code] || ''}
                    </td>
                  )}
                  <td
                    className={`${B} py-0.5 font-mono text-[12px] tabular-nums ${
                    flagged ? 'bg-[#ffe27a] font-semibold' : ''}`
                    }>
                    
                    {fmt(row.total, 2)}
                  </td>
                </tr>);

            })}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className={`${B} border-t-2 py-1 text-[9px] font-bold`}>
                Hrs
              </th>
              {LOSS_CODES.map((code) =>
              <td
                key={code}
                className={`${B} border-t-2 py-1 font-mono text-[12px] font-semibold tabular-nums`}>
                
                  {fmt(summary.hoursByCode[code], 2)}
                </td>
              )}
              <td
                className={`${B} border-t-2 py-1 font-mono text-[12px] font-bold tabular-nums text-danger`}>
                
                {fmt(summary.lossHours, 2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-1 text-[9.5px] font-medium text-black">
        Daily figures in minutes · bottom row totals in hours
      </p>
    </SheetPaper>);

}