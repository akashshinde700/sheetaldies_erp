import React from 'react';
import { LOSS_CATEGORIES, LOSS_CODES, SHIFTS } from '../../data/furnaces';
import { useUtilisation } from '../../contexts/UtilisationContext';
import type { Furnace, ShiftId } from '../../types/utilisation';
import { MinuteInput } from '../MinuteInput';
import { SheetPaper } from '../SheetPaper';
import { daySummary, getShiftLosses, sheetDate, sumLosses } from '../../utils/utilisation';

const B = 'border border-black';
/** Each furnace group is 7 loss columns + the balance column from the paper form. */
const GROUP_WIDTH = LOSS_CODES.length + 1;

interface DailyUtilisationSheetProps {
  furnaces: Furnace[];
  title: string;
}

export function DailyUtilisationSheet({ furnaces, title }: DailyUtilisationSheetProps) {
  const { entries, availability, remarks, selectedDay, month, setCell, setAvailable, setRemark } =
  useUtilisation();

  const summaries = furnaces.map((furnace) => daySummary(entries, furnace, selectedDay, availability));
  const columnCount = 1 + furnaces.length * GROUP_WIDTH + 1;

  return (
    <SheetPaper orientation="landscape">
      <div className="border-2 border-black font-sans">
        <div className="flex items-stretch border-b-2 border-black">
          <div className="flex w-24 items-center justify-center border-r border-black p-2">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center bg-[#8c1d4a] font-serif text-lg font-bold italic text-white"
              style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}>
              
              SVT
            </span>
          </div>
          <h2 className="flex flex-1 items-center justify-center px-4 py-3 text-center text-xl font-bold tracking-wide">
            SHITAL VACUUM TREAT PVT LTD.
          </h2>
          <div className="flex w-60 items-center gap-2 border-l border-black px-4">
            <span className="text-sm font-bold">DATE :-</span>
            <span className="font-mono text-base font-medium text-accent">
              {sheetDate(selectedDay, month)}
            </span>
          </div>
        </div>

        <p className="border-b border-black py-1 text-center text-sm font-bold underline">{title}</p>

        <table className="w-full table-fixed border-collapse text-center text-[11px]">
          <caption className="sr-only">
            {title} for {sheetDate(selectedDay, month)}
          </caption>
          <colgroup>
            <col className="w-[92px]" />
            {furnaces.map((furnace) =>
            <React.Fragment key={furnace.id}>
                {LOSS_CODES.map((code) =>
              <col key={`${furnace.id}-${code}`} />
              )}
                <col className="w-[62px]" />
              </React.Fragment>
            )}
            <col className="w-[58px]" />
          </colgroup>

          <tbody>
            <tr>
              <th scope="col" className={`${B} px-1 py-1 text-left font-bold`}>
                SHIFT
              </th>
              {furnaces.map((furnace) =>
              <React.Fragment key={furnace.id}>
                  <th
                  scope="col"
                  colSpan={LOSS_CODES.length}
                  className={`${B} px-1 py-1 text-center text-[12px] font-bold`}>
                  
                    {furnace.shortName}
                  </th>
                  <th scope="col" className={`${B} px-0.5 text-[9px] font-semibold leading-tight`}>
                    BAL.
                  </th>
                </React.Fragment>
              )}
              <th scope="col" rowSpan={5} className={`${B} px-1 text-center font-bold`}>
                SIGN
              </th>
            </tr>

            {SHIFTS.map((shift) =>
            <tr key={`available-${shift.id}`}>
                <th scope="row" className={`${B} px-1 py-1 text-left font-bold italic`}>
                  {shift.label}
                </th>
                {furnaces.map((furnace, index) => {
                const available = summaries[index].availableByShift[shift.id as ShiftId];
                const loss = summaries[index].byShift[shift.id as ShiftId];
                const balance = available - loss;
                return (
                  <React.Fragment key={furnace.id}>
                      <td colSpan={LOSS_CODES.length} className={`${B} px-2 py-0.5`}>
                        <input
                        type="number"
                        min={0}
                        max={720}
                        step={10}
                        aria-label={`${furnace.shortName} ${shift.label} available minutes`}
                        value={available}
                        onChange={(event) =>
                        setAvailable(
                          furnace.id,
                          selectedDay,
                          shift.id as ShiftId,
                          Math.max(0, Math.min(720, Number(event.target.value) || 0))
                        )
                        }
                        className="h-7 w-full border-0 bg-transparent text-center font-mono text-[13px] font-medium tabular-nums text-accent focus:bg-surface-accent focus:outline-none print:focus:bg-transparent" />
                      
                      </td>
                      <td
                      className={`${B} px-0.5 py-1 font-mono text-[13px] font-semibold tabular-nums ${
                      balance < 0 ? 'text-danger' : 'text-accent'}`
                      }>
                      
                        {balance}
                      </td>
                    </React.Fragment>);

              })}
              </tr>
            )}

            <tr>
              <th scope="row" className={`${B} px-1 py-1`}>
                <span className="sr-only">Day total</span>
              </th>
              {furnaces.map((furnace, index) =>
              <React.Fragment key={furnace.id}>
                  <td
                  colSpan={LOSS_CODES.length}
                  className={`${B} px-2 py-1 text-center font-mono text-[13px] font-semibold tabular-nums`}>
                  
                    {summaries[index].availableMinutes}
                  </td>
                  <td
                  className={`${B} px-0.5 py-1 font-mono text-[13px] font-bold tabular-nums text-accent`}>
                  
                    {summaries[index].usedMinutes}
                  </td>
                </React.Fragment>
              )}
            </tr>

            {SHIFTS.map((shift) =>
            <React.Fragment key={`losses-${shift.id}`}>
                <tr>
                  <th scope="row" rowSpan={2} className={`${B} px-1 py-1 text-left font-bold italic`}>
                    {shift.label}
                  </th>
                  {furnaces.map((furnace) =>
                <React.Fragment key={furnace.id}>
                      {LOSS_CATEGORIES.map((category) =>
                  <th
                    key={`${furnace.id}-${category.code}`}
                    scope="col"
                    title={category.label}
                    className={`${B} bg-[#f2f3e8] px-0 py-0.5 font-mono text-[11px] font-semibold`}>
                    
                          {category.code}
                        </th>
                  )}
                      <th
                    scope="col"
                    className={`${B} bg-[#f2f3e8] px-0.5 py-0.5 text-[9px] font-semibold`}>
                    
                        TOTAL
                      </th>
                    </React.Fragment>
                )}
                  <td rowSpan={2} className={B} />
                </tr>
                <tr>
                  {furnaces.map((furnace, index) => {
                  const values = getShiftLosses(entries, furnace.id, selectedDay, shift.id);
                  const loss = sumLosses(values);
                  const over = loss > summaries[index].availableByShift[shift.id as ShiftId];
                  return (
                    <React.Fragment key={furnace.id}>
                        {LOSS_CODES.map((code) =>
                      <td key={`${furnace.id}-${code}`} className={`${B} px-0.5 py-0.5`}>
                            <MinuteInput
                          variant="sheet"
                          value={values[code]}
                          max={720}
                          invalid={over}
                          label={`${furnace.shortName} ${shift.label} ${code} minutes`}
                          onChange={(minutes) =>
                          setCell(furnace.id, selectedDay, shift.id as ShiftId, code, minutes)
                          } />
                        
                          </td>
                      )}
                        <td
                        className={`${B} px-0.5 py-1 font-mono text-[13px] font-semibold tabular-nums ${
                        over ? 'text-danger' : 'text-accent'}`
                        }>
                        
                          {loss || ''}
                        </td>
                      </React.Fragment>);

                })}
                </tr>
              </React.Fragment>
            )}

            {SHIFTS.map((shift) =>
            <tr key={`remark-${shift.id}`}>
                <th scope="row" className={`${B} px-1 py-2 text-left font-bold italic leading-tight`}>
                  REMARK
                  <br />
                  {shift.label}
                </th>
                <td colSpan={furnaces.length * GROUP_WIDTH} className={`${B} px-2`}>
                  <textarea
                  rows={2}
                  aria-label={`Remark ${shift.label}`}
                  value={remarks[selectedDay]?.[shift.id as ShiftId] ?? ''}
                  onChange={(event) => setRemark(selectedDay, shift.id as ShiftId, event.target.value)}
                  className="w-full resize-none border-0 bg-transparent py-1 text-left font-mono text-[12px] text-accent focus:bg-surface-accent focus:outline-none print:focus:bg-transparent" />
                
                </td>
                <td className={B} />
              </tr>
            )}

            <tr>
              <td colSpan={columnCount} className={`${B} px-2 py-1.5 text-left`}>
                <span className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-medium">
                  {LOSS_CATEGORIES.map((category) =>
                  <span key={category.code}>
                      {category.code}) {category.label}
                    </span>
                  )}
                  <span className="font-semibold">BAL. = available − losses (480 − 50 = 430)</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SheetPaper>);

}