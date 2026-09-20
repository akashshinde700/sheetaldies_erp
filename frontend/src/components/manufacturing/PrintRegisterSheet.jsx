// Shared masthead/footer for the Daily Production Planning print pack —
// ported as-is from the client-supplied prototype's PrintSheet.tsx (same
// SVT box, same "Shital Vacuum Treat Pvt. Ltd." title bar, same QF/PD/03
// doc-control footer with Prepared By / Approved By strip).

export function PrintSheetHeader({ title, date }) {
  return (
    <div className="hidden print:mb-2 print:block">
      <div className="flex items-stretch border border-slate-900">
        <span className="flex w-16 items-center justify-center border-r border-slate-900 p-1">
          <img src="/logo.png" alt="SVT" className="h-10 w-auto object-contain" />
        </span>
        <div className="flex-1">
          <p className="border-b border-slate-900 py-1 text-center text-sm font-bold uppercase tracking-wide">
            Shital Vacuum Treat Pvt. Ltd.
          </p>
          <p className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide">Title :- {title}</p>
        </div>
        <span className="flex w-28 items-center justify-center border-l border-slate-900 font-mono text-xs font-bold">{date}</span>
      </div>
    </div>
  );
}

export function PrintSheetFooter({ page, signatures = true }) {
  return (
    <div className="hidden print:mt-2 print:block">
      <div className="flex items-center justify-between border border-slate-900 px-2 py-1 font-mono text-[9px] uppercase">
        <span>QF/PD/03</span>
        <span>Revision : 00</span>
        <span>Effective Date : 01/04/2019</span>
        <span>{page}</span>
      </div>
      {signatures && (
        <div className="mt-1 flex border border-slate-900 text-[9px]">
          <div className="flex-1 border-r border-slate-900 px-2 py-2">Prepared By :- &nbsp;&nbsp; Signature :-</div>
          <div className="flex-1 px-2 py-2">Approved By :- &nbsp;&nbsp; Signature :-</div>
        </div>
      )}
    </div>
  );
}
