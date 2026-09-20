import React from 'react';
import { SvtLogo } from './SvtLogo';
import type { ReworkSheet } from '../types/forms';

interface ReworkDataSheetProps {
  sheet: ReworkSheet;
}

const HEADERS = [
'SR.NO',
'DATE',
'CUSTOMER NAME',
'DESCRIPTION',
'QTY',
'WEIGHT',
'JOB CARD NO / HARDNESS (REQD.)',
'CYCLE NO',
'REASON',
'REWORK CYCLE NO',
'AFTER PROCESS RESULTS',
'REMARK'];


const WIDTHS = [
'3%',
'6%',
'11%',
'17%',
'3.5%',
'4.5%',
'9%',
'9%',
'13%',
'9%',
'8%',
'7%'];


export function ReworkDataSheet({ sheet }: ReworkDataSheetProps) {
  const blanks = Array.from({ length: sheet.blankRows });

  return (
    <section className="form-sheet" aria-label="Rework and rejection data">
      <table className="w-full table-fixed border-collapse text-[9px] leading-tight">
        <caption className="sr-only">
          Rework and rejection data for {sheet.month}
        </caption>
        <colgroup>
          {WIDTHS.map((w, i) =>
          <col key={i} style={{ width: w }} />
          )}
        </colgroup>

        <thead>
          {/* Company / title / doc control block */}
          <tr>
            <th className="cell align-middle" colSpan={2}>
              <div className="flex items-center justify-center py-1">
                <SvtLogo className="h-9 w-9" />
              </div>
            </th>
            <th className="cell align-middle" colSpan={7}>
              <div className="py-1.5">
                <div className="text-[15px] font-bold tracking-wide">
                  {sheet.companyName}
                </div>
                <div className="mt-1 text-[10px] font-semibold">
                  {sheet.title}
                </div>
              </div>
            </th>
            <th className="p-0 align-top" colSpan={3}>
              <table className="w-full table-fixed border-collapse text-[8px]">
                <tbody>
                  <tr>
                    <td className="cell text-left font-semibold">DOC NO.</td>
                    <td className="cell text-left">{sheet.meta.docNo}</td>
                  </tr>
                  <tr>
                    <td className="cell text-left font-semibold">REV NO.</td>
                    <td className="cell text-left">{sheet.meta.revNo}</td>
                  </tr>
                  <tr>
                    <td className="cell text-left font-semibold">REV DATE</td>
                    <td className="cell text-left">{sheet.meta.revDate}</td>
                  </tr>
                  <tr>
                    <td className="cell text-left font-semibold">PAGE NO.</td>
                    <td className="cell text-left">{sheet.meta.pageNo}</td>
                  </tr>
                </tbody>
              </table>
            </th>
          </tr>

          <tr>
            <th className="cell py-1 text-[10px] font-bold" colSpan={12}>
              {sheet.subTitle} {sheet.month}
            </th>
          </tr>

          <tr>
            {HEADERS.map((h) =>
            <th key={h} className="cell py-1.5 align-middle font-bold">
                {h}
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {sheet.rows.map((row) =>
          <tr key={row.srNo}>
              <td className="cell">{row.srNo}</td>
              <td className="cell">{row.date}</td>
              <td className="cell text-left">{row.customerName}</td>
              <td className="cell text-left">{row.description}</td>
              <td className="cell">{row.qty}</td>
              <td className="cell">{row.weight}</td>
              <td className="cell">
                <div>{row.jobCardNo}</div>
                <div>{row.hardnessRequired}</div>
              </td>
              <td className="cell">{row.cycleNo}</td>
              <td className="cell text-left">{row.reason}</td>
              <td className="cell">{row.reworkCycleNo}</td>
              <td className="cell">{row.afterProcessResults}</td>
              <td className="cell">{row.remark}</td>
            </tr>
          )}

          {blanks.map((_, i) =>
          <tr key={`blank-${i}`}>
              {WIDTHS.map((__, c) =>
            <td key={c} className="cell h-[18px]">
                  &nbsp;
                </td>
            )}
            </tr>
          )}

          {/* Totals + declaration */}
          <tr>
            <td className="cell text-left font-semibold" colSpan={4}>
              Total Rework Qty &amp; Weight :-
            </td>
            <td className="cell">{sheet.totalReworkQty}</td>
            <td className="cell">{sheet.totalReworkWeight}</td>
            <td className="cell" rowSpan={4} colSpan={6}>
              <div className="px-2 py-2 text-left text-[9px] font-bold">
                {sheet.declaration}
              </div>
            </td>
          </tr>
          <tr>
            <td className="cell text-left font-semibold" colSpan={4}>
              Total Processed weight :-
            </td>
            <td className="cell" colSpan={2}>
              {sheet.totalProcessedWeight}
            </td>
          </tr>
          <tr>
            <td className="cell font-semibold" colSpan={4}>
              Monthly Rework %
            </td>
            <td className="cell font-semibold">Target</td>
            <td className="cell font-semibold">Act</td>
          </tr>
          <tr>
            <td className="cell" colSpan={4}>
              {sheet.monthlyReworkPercent}
            </td>
            <td className="cell">{sheet.target}</td>
            <td className="cell">&nbsp;</td>
          </tr>

          {/* Causes */}
          {sheet.causes.map((cause, i) =>
          <tr key={`cause-${i}`}>
              {i === 0 &&
            <td className="cell font-bold" rowSpan={4}>
                  CAUSES
                </td>
            }
              <td className="cell w-[6%]">{i + 1}</td>
              <td className="cell h-[18px] text-left" colSpan={10}>
                {cause || '\u00a0'}
              </td>
            </tr>
          )}

          {/* Corrective actions */}
          {sheet.correctiveActions.map((action, i) =>
          <tr key={`action-${i}`}>
              {i === 0 &&
            <td className="cell text-[8px] font-bold leading-tight" rowSpan={4}>
                  CORRECTIVE ACTIONS
                </td>
            }
              <td className="cell">{i + 1}</td>
              <td className="cell h-[18px] text-left" colSpan={10}>
                {action || '\u00a0'}
              </td>
            </tr>
          )}
        </tbody>

        <tfoot>
          <tr>
            <td className="cell h-[54px] align-bottom text-left" colSpan={6}>
              <span className="pl-2 text-[10px] font-semibold italic">
                Prepared By (Q.A) :-
              </span>
            </td>
            <td className="cell h-[54px] align-bottom text-left" colSpan={6}>
              <span className="pl-2 text-[10px] font-semibold">
                Approved By (M.R) :-
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>);

}