import React from 'react';
import { temperingFurnaces, temperingSlots } from '../data/tempering';
import { hhmm } from '../utils/traceability';

const MAX_SLOTS = Math.max(...temperingFurnaces.map((f) => temperingSlots.filter((s) => s.furnace === f).length));

/** Print-only recreation of the paper page 2 layout: every furnace as its own column group. */
export function TemperingPrintTable() {
  const rows = Array.from({ length: MAX_SLOTS }, (_, i) => i + 1);

  return (
    <table className="w-full border-collapse text-[8px]">
      <thead>
        <tr>
          <th scope="col" className="w-6 px-1 py-1 text-center font-bold uppercase">S.No</th>
          {temperingFurnaces.map((f) =>
          <th key={f} scope="col" colSpan={3} className="px-1 py-1 text-center font-mono text-[11px] font-bold">
              {f}
            </th>
          )}
        </tr>
        <tr>
          <th scope="col" className="px-1 py-0.5" />
          {temperingFurnaces.map((f) =>
          <React.Fragment key={f}>
              <th scope="col" className="px-1 py-0.5 text-center font-bold uppercase">Process</th>
              <th scope="col" className="w-10 px-1 py-0.5 text-center font-bold uppercase">Start</th>
              <th scope="col" className="w-10 px-1 py-0.5 text-center font-bold uppercase">End</th>
            </React.Fragment>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((srNo) =>
        <React.Fragment key={srNo}>
            <tr>
              <td rowSpan={2} className="px-1 py-1 text-center font-mono text-[10px] font-bold">
                {srNo}
              </td>
              {temperingFurnaces.map((f) => {
              const slot = temperingSlots.find((s) => s.furnace === f && s.srNo === srNo);
              return (
                <React.Fragment key={f}>
                    <td className="px-1 py-1 align-top leading-tight">
                      {slot ?
                    <>
                          <span className="block font-medium uppercase">{slot.process}</span>
                          <span className="mt-0.5 block font-mono text-[7px]">
                            {slot.htCycleNos.length > 0 ? slot.htCycleNos.join(' / ') : 'HT CYCLE NO :- ______'}
                          </span>
                        </> :
                    null}
                    </td>
                    <td className="tabular px-1 py-1 text-center font-mono">{slot ? hhmm(slot.startTime) : ''}</td>
                    <td className="tabular px-1 py-1 text-center font-mono">{slot ? hhmm(slot.endTime) : ''}</td>
                  </React.Fragment>);

            })}
            </tr>
            <tr>
              {temperingFurnaces.map((f) => {
              const slot = temperingSlots.find((s) => s.furnace === f && s.srNo === srNo);
              return (
                <td key={f} colSpan={3} className="px-1 py-0.5 text-center font-semibold uppercase">
                    {slot ? slot.batch : ''}
                  </td>);

            })}
            </tr>
          </React.Fragment>
        )}
      </tbody>
    </table>);

}