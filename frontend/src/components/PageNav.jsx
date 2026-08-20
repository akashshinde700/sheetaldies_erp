/**
 * PageNav — shared page-based pagination footer.
 *
 * Replaces the near-identical inline `Pagination` blocks copy-pasted across
 * Dashboard, JobCardList, InvoiceList, CertList, JobworkList, etc. Uses the
 * unified sky/slate accent to match the rest of the shell.
 *
 * Props:
 *   page       — current 1-based page
 *   totalPages — total number of pages
 *   total      — total number of records (for the "x–y of N" summary)
 *   limit      — page size (for the summary range)
 *   setPage    — (updater) => void, receives either a value or an updater fn
 */
export default function PageNav({ page, totalPages, total, limit, setPage }) {
  const from = total > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
      <span className="text-xs text-slate-500">
        {from}–{to} of <span className="font-semibold text-slate-700">{total}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex items-center gap-1 text-xs px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1"
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
        </button>
        <span className="text-xs font-semibold text-slate-500 px-2">{page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex items-center gap-1 text-xs px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1"
        >
          Next <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
