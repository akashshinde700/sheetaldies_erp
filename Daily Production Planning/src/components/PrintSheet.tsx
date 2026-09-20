import React from 'react';
import { PLAN_DATE } from '../data/cycles';

/** Masthead that only appears on the printed sheet, mirroring the paper form. */
export function PrintSheetHeader({ title }: {title: string;}) {
  return (
    <div className="hidden print:mb-2 print:block">
      <div className="flex items-stretch border border-ink-900">
        <span className="flex w-16 items-center justify-center border-r border-ink-900 font-mono text-sm font-bold">
          SVT
        </span>
        <div className="flex-1">
          <p className="border-b border-ink-900 py-1 text-center text-sm font-bold uppercase tracking-wide">
            Shital Vacuum Treat Pvt. Ltd.
          </p>
          <p className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide">Title :- {title}</p>
        </div>
        <span className="flex w-28 items-center justify-center border-l border-ink-900 font-mono text-xs font-bold">
          {PLAN_DATE}
        </span>
      </div>
    </div>);

}

export function PrintSheetFooter({ page, signatures = true }: {page: string;signatures?: boolean;}) {
  return (
    <div className="hidden print:mt-2 print:block">
      <div className="flex items-center justify-between border border-ink-900 px-2 py-1 font-mono text-[9px] uppercase">
        <span>QF/PD/03</span>
        <span>Revision : 00</span>
        <span>Effective Date : 01/04/2019</span>
        <span>{page}</span>
      </div>
      {signatures ?
      <div className="mt-1 flex border border-ink-900 text-[9px]">
          <div className="flex-1 border-r border-ink-900 px-2 py-2">Prepared By :- RTS &nbsp;&nbsp; Signature :-</div>
          <div className="flex-1 px-2 py-2">Approved By :- UDD &nbsp;&nbsp; Signature :-</div>
        </div> :
      null}
    </div>);

}