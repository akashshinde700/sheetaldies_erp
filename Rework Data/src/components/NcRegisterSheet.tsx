import React from 'react';
import { SvtLogo } from './SvtLogo';
import type { NcRegisterSheet as NcRegisterSheetData } from '../types/forms';

interface NcRegisterSheetProps {
  sheet: NcRegisterSheetData;
}

const HEADERS = [
'Sr No',
'Date',
'Customer Name',
'Test Report',
'Process',
'Stage',
'N.C Qty',
'N.C Details',
'Disposition',
'Root Cause Analysis',
'Corrective Action',
'Re-Verification',
'Sign'];


const WIDTHS = [
'3%',
'6%',
'10%',
'8%',
'8%',
'8%',
'4%',
'14%',
'11%',
'10%',
'11%',
'9%',
'4%'];


export function NcRegisterSheet({ sheet }: NcRegisterSheetProps) {
  const blanks = Array.from({ length: sheet.blankRows });

  return (
    <section className="form-sheet" aria-label="Inhouse non conformance register">
      <table className="w-full table-fixed border-collapse text-[9px] leading-tight">
        <caption className="sr-only">{sheet.title}</caption>
        <colgroup>
          {WIDTHS.map((w, i) =>
          <col key={i} style={{ width: w }} />
          )}
        </colgroup>

        <thead>
          <tr>
            <th className="cell align-middle" colSpan={2}>
              <div className="flex items-center justify-center py-1">
                <SvtLogo className="h-9 w-9" />
              </div>
            </th>
            <th className="cell align-middle" colSpan={8}>
              <div className="py-2 text-[15px] font-bold tracking-wide">
                {sheet.title}
              </div>
            </th>
            <th className="cell align-middle" colSpan={3}>
              <div className="py-2 text-[11px] font-bold text-[#b81b5c]">
                {sheet.companyName}
              </div>
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
              <td className="cell text-left">{row.testReport}</td>
              <td className="cell text-left">{row.process}</td>
              <td className="cell text-left">{row.stage}</td>
              <td className="cell">{row.ncQty}</td>
              <td className="cell text-left">{row.ncDetails}</td>
              <td className="cell text-left">{row.disposition}</td>
              <td className="cell text-left">{row.rootCauseAnalysis}</td>
              <td className="cell text-left">{row.correctiveAction}</td>
              <td className="cell text-left">{row.reVerification}</td>
              <td className="cell">{row.sign}</td>
            </tr>
          )}

          {blanks.map((_, i) =>
          <tr key={`blank-${i}`}>
              {WIDTHS.map((__, c) =>
            <td key={c} className="cell h-[26px]">
                  &nbsp;
                </td>
            )}
            </tr>
          )}
        </tbody>

        <tfoot>
          <tr>
            <td className="cell text-left font-semibold" colSpan={4}>
              <span className="pl-1">{sheet.meta.docNo}</span>
            </td>
            <td className="cell font-semibold" colSpan={3}>
              REV. NO:- {sheet.meta.revNo}
            </td>
            <td className="cell font-semibold" colSpan={3}>
              REV. DATE:- {sheet.meta.revDate}
            </td>
            <td className="cell font-semibold" colSpan={3}>
              PAGE- {sheet.meta.pageNo}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>);

}