import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';
import ListSearchInput from '../../components/ListSearchInput';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

const CardField = ({ label, value, className = '', valueClass = '' }) => (
  <div
    className={`rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 transition-colors group-hover/card:border-slate-200/90 ${className}`}
  >
    <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700">{label}</p>
    <p className={`mt-1 text-sm font-semibold text-slate-900 leading-snug break-words ${valueClass}`}>{value}</p>
  </div>
);

export default function InwardOutwardRegister() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    api.get('/jobwork/register', { params: { limit: 500 } })
      .then((r) => setRows(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const hasDateFilter = fromDate || toDate;
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs = toDate ? new Date(toDate).getTime() : null;

    return rows.filter((r) => {
      const matchesSearch = !q || (
        r.companyName?.toLowerCase().includes(q) ||
        r.challanNo?.toLowerCase().includes(q) ||
        r.material?.toLowerCase().includes(q) ||
        r.jobcardNo?.toLowerCase().includes(q) ||
        r.invoiceNos?.toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;

      if (!hasDateFilter) return true;

      const rowDate = r.challanDate ? new Date(r.challanDate) : null;
      if (!rowDate || Number.isNaN(rowDate.getTime())) return false;

      const rowTs = new Date(
        rowDate.getFullYear(),
        rowDate.getMonth(),
        rowDate.getDate(),
      ).getTime();

      if (fromTs != null && rowTs < fromTs) return false;
      if (toTs != null && rowTs > toTs) return false;
      return true;
    });
  }, [rows, search, fromDate, toDate]);

  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const visiblePages = useMemo(() => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [page, totalPages]);

  const exportRows = () => {
    const data = filtered.map((r) => ({
      'Sr No': r.srNo,
      'Company Name': r.companyName,
      Material: r.material,
      'Challan No': r.challanNo,
      'Challan Date': r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '',
      'Material In Date': r.materialInDate ? new Date(r.materialInDate).toLocaleDateString('en-IN') : '',
      Qty: r.qty,
      Weight: r.weight,
      'Jobcard No': r.jobcardNo,
      'Jobcard Date': r.jobcardDate ? new Date(r.jobcardDate).toLocaleDateString('en-IN') : '',
      Invoice: r.invoiceNos,
      'Dispatch Qty': r.dispatchQty,
      'Dispatch Date': r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '',
      'Bal Qty': r.balQty,
      Velocity: r.velocity,
      'Del Perf %': r.delPerfPct,
      'Delivery %': r.deliveryPct,
    }));
    exportToExcel(data, 'Inward-Outward-Register');
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Inward / Outward Register</h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl leading-relaxed">
            Company → Challan → Material in → Process → Invoice → Dispatch → Balance & performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/jobwork/new" className="btn-primary whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden>add</span>
            Add Challan
          </Link>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                viewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Card
            </button>
          </div>
          <button type="button" onClick={exportRows} className="btn-outline whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden>file_download</span>
            Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end">
          <ListSearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, challan, material, jobcard, invoice..."
          />
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="form-input text-xs"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="form-input text-xs"
            />
          </div>
          {(search || fromDate || toDate) ? (
            <button
              type="button"
              onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-sm">close</span> Clear
            </button>
          ) : <div />}
      </div>

      <div className="card overflow-hidden">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-indigo-50/40 border-b border-indigo-100">
                  <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest leading-4 w-16">
                    <span className="block">Sr</span>
                    <span className="block">No</span>
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest leading-4">
                    Register details (line 1 + line 2)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">Loading register...</td></tr>
                ) : pagedRows.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No register data.</td></tr>
                ) : pagedRows.map((r, idx) => (
                  <tr key={`${r.challanItemId}-${r.srNo}`} className="align-top even:bg-slate-50/30">
                    <td className="px-2 py-3 align-top">
                      <div className="inline-flex items-center justify-center min-w-8 h-8 rounded-lg bg-slate-700 text-white text-xs font-bold">
                        {r.srNo}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className={`${idx === 0 ? 'border-t-0' : 'border-t-2 border-slate-500'} mb-2`} />
                      <div className="flex items-center justify-end gap-1.5 mb-2">
                        <Link
                          to={`/jobwork/${r.challanId}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-indigo-600 hover:bg-indigo-50"
                          title="View"
                          aria-label="View"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </Link>
                        <Link
                          to={`/jobwork/${r.challanId}/edit`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-700 hover:bg-slate-100"
                          title="Edit / Update"
                          aria-label="Edit or update"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
                        {[
                          ['Company Name', r.companyName || '-'],
                          ['Material', r.material || '-'],
                          ['Challan No', r.challanNo || '-'],
                          ['Challan Date', r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '-'],
                          ['Material In Date', r.materialInDate ? new Date(r.materialInDate).toLocaleDateString('en-IN') : '-'],
                          ['Qty', r.qty ?? 0],
                          ['Weight', r.weight ?? 0],
                          ['Jobcard No', r.jobcardNo || '-'],
                        ].map(([label, value]) => (
                          <div key={`${r.srNo}-${label}`} className="rounded-md bg-white border border-slate-200/90 px-2.5 py-2 shadow-sm">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 border-b border-indigo-100 pb-1.5 mb-1.5">
                              {label}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 leading-snug break-words">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 mt-2">
                        {[
                          ['Jobcard Date', r.jobcardDate ? new Date(r.jobcardDate).toLocaleDateString('en-IN') : '-'],
                          ['Invoice', r.invoiceNos || '-'],
                          ['Dispatch Qty', r.dispatchQty ?? 0],
                          ['Dispatch Date', r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '-'],
                          ['Bal Qty', r.balQty ?? 0],
                          ['Velocity', r.velocity ?? 0],
                          ['Del Perf %', r.delPerfPct ?? 0],
                          ['Delivery %', r.deliveryPct ?? 0],
                        ].map(([label, value]) => (
                          <div key={`${r.srNo}-${label}`} className="rounded-md bg-slate-50 border border-slate-200/90 px-2.5 py-2">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 border-b border-indigo-100/80 pb-1.5 mb-1.5">
                              {label}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 leading-snug break-words tabular-nums">{value}</p>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-3 sm:p-5 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
            {loading ? (
              <div className="px-4 py-12 text-center text-slate-500 text-sm">Loading register…</div>
            ) : pagedRows.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-500 text-sm">No register data.</div>
            ) : pagedRows.map((r) => (
              <article
                key={`${r.challanItemId}-${r.srNo}`}
                className="group/card relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card transition-[box-shadow,border-color] duration-200 hover:border-slate-300/90 hover:shadow-card-hover"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 opacity-90"
                  aria-hidden
                />
                <div className="p-4 sm:p-5 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-extrabold text-white shadow-md tabular-nums">
                        {r.srNo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-800">Company</p>
                        <h3 className="mt-0.5 text-base font-bold leading-snug text-slate-900 sm:text-lg">
                          {r.companyName || '—'}
                        </h3>
                        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-600">
                          <span className="material-symbols-outlined mt-0.5 text-[16px] text-slate-400 shrink-0" aria-hidden>
                            inventory_2
                          </span>
                          <span className="leading-snug">{r.material || '—'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Link
                        to={`/jobwork/${r.challanId}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-indigo-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50"
                        title="View challan"
                        aria-label="View challan"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </Link>
                      <Link
                        to={`/jobwork/${r.challanId}/edit`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                        title="Edit challan"
                        aria-label="Edit challan"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/90 px-2.5 py-1.5 font-mono text-xs font-bold text-indigo-900">
                      <span className="material-symbols-outlined text-[15px] text-indigo-600" aria-hidden>
                        receipt_long
                      </span>
                      {r.challanNo || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-800">
                      <span className="material-symbols-outlined text-[15px] text-slate-500" aria-hidden>
                        badge
                      </span>
                      JC {r.jobcardNo || '—'}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      <span className="material-symbols-outlined text-[14px] text-sky-600" aria-hidden>
                        input
                      </span>
                      Inward &amp; qty
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <CardField label="Challan date" value={fmtDate(r.challanDate)} />
                      <CardField label="Material in date" value={fmtDate(r.materialInDate)} />
                      <CardField label="Qty" value={r.qty ?? 0} valueClass="tabular-nums" />
                      <CardField label="Weight" value={r.weight ?? 0} valueClass="tabular-nums" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      <span className="material-symbols-outlined text-[14px] text-violet-600" aria-hidden>
                        description
                      </span>
                      Jobcard
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <CardField label="Jobcard date" value={fmtDate(r.jobcardDate)} />
                      <CardField
                        label="Invoice"
                        value={r.invoiceNos || '—'}
                        className="sm:col-span-1"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      <span className="material-symbols-outlined text-[14px] text-amber-600" aria-hidden>
                        local_shipping
                      </span>
                      Dispatch
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <CardField label="Dispatch date" value={fmtDate(r.dispatchDate)} />
                      <CardField label="Dispatch qty" value={r.dispatchQty ?? 0} valueClass="tabular-nums" />
                      <CardField label="Bal. qty" value={r.balQty ?? 0} valueClass="tabular-nums" />
                      <CardField label="Velocity" value={r.velocity ?? 0} valueClass="tabular-nums" />
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/90 to-sky-50/40 px-3 py-3 sm:px-4">
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                      Performance
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700/90">Delivery %</p>
                        <p className="text-xl font-extrabold tabular-nums text-emerald-900 sm:text-2xl">{r.deliveryPct ?? 0}%</p>
                      </div>
                      <div className="h-10 w-px bg-emerald-200/80 hidden sm:block" aria-hidden />
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-sky-800/90">Del. perf. %</p>
                        <p className="text-xl font-extrabold tabular-nums text-sky-900 sm:text-2xl">{r.delPerfPct ?? 0}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="card px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}-
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-outline disabled:opacity-50"
            >
              Prev
            </button>
            <div className="flex items-center gap-1">
              {visiblePages[0] > 1 && (
                <>
                  <button type="button" onClick={() => setPage(1)} className="btn-outline px-2 py-1 text-xs">1</button>
                  {visiblePages[0] > 2 && <span className="text-slate-400 text-xs px-1">...</span>}
                </>
              )}
              {visiblePages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    p === page
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              {visiblePages[visiblePages.length - 1] < totalPages && (
                <>
                  {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span className="text-slate-400 text-xs px-1">...</span>}
                  <button type="button" onClick={() => setPage(totalPages)} className="btn-outline px-2 py-1 text-xs">{totalPages}</button>
                </>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-700">Page {page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-outline disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
