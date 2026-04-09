import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';

export default function InwardOutwardRegister() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    if (!q) return rows;
    return rows.filter((r) =>
      r.companyName?.toLowerCase().includes(q) ||
      r.challanNo?.toLowerCase().includes(q) ||
      r.material?.toLowerCase().includes(q) ||
      r.jobcardNo?.toLowerCase().includes(q) ||
      r.invoiceNos?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search, viewMode]);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Inward / Outward Register</h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
            Company → Challan → Material in → Process → Invoice → Dispatch → Balance & performance
          </p>
        </div>
        <div className="flex flex-wrap items-stretch sm:items-center gap-2 lg:shrink-0 lg:pt-0.5">
          <Link to="/jobwork/new" className="btn-primary whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden>add</span>
            Add Challan
          </Link>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                viewMode === 'table' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                viewMode === 'card' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Card
            </button>
          </div>
          <button type="button" onClick={exportRows} className="btn-outline whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden>file_download</span>
            Export Excel
          </button>
          <Link to="/jobwork" className="btn-ghost whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden>arrow_back</span>
            Back to job work
          </Link>
        </div>
      </div>

      <div className="card p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, challan, material, jobcard, invoice..."
          className="form-input"
        />
      </div>

      <div className="card overflow-hidden">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase leading-4 w-16">
                    <span className="block">Sr</span>
                    <span className="block">No</span>
                  </th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase leading-4">Register details (line 1 + line 2)</th>
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
                          <div key={`${r.srNo}-${label}`} className="rounded-md bg-white border border-slate-200 px-2 py-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                            <p className="text-xs text-slate-700 break-words mt-0.5">{value}</p>
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
                          <div key={`${r.srNo}-${label}`} className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                            <p className="text-xs text-slate-700 break-words mt-0.5">{value}</p>
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
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">Loading register...</div>
            ) : pagedRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">No register data.</div>
            ) : pagedRows.map((r) => (
              <div key={`${r.challanItemId}-${r.srNo}`} className="rounded-xl border-2 border-slate-300 bg-white p-3">
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">SR {r.srNo}</p>
                    <p className="font-semibold text-slate-800">{r.companyName || '-'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.material || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-indigo-600">{r.challanNo || '-'}</p>
                    <p className="font-mono text-xs text-slate-500 mt-0.5">{r.jobcardNo || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs">
                  <p className="text-slate-500">Challan: <span className="text-slate-700">{r.challanDate ? new Date(r.challanDate).toLocaleDateString('en-IN') : '-'}</span></p>
                  <p className="text-slate-500 text-right">Dispatch: <span className="text-slate-700">{r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '-'}</span></p>
                  <p className="text-slate-500 col-span-2">Invoice: <span className="text-slate-700 break-words">{r.invoiceNos || '-'}</span></p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs tabular-nums">
                  <p className="text-slate-600">Qty/Wt: <span className="font-semibold text-slate-800">{r.qty ?? 0}/{r.weight ?? 0}</span></p>
                  <p className="text-slate-600 text-right">Out/Bal: <span className="font-semibold text-slate-800">{r.dispatchQty ?? 0}/{r.balQty ?? 0}</span></p>
                  <p className="text-slate-500">Velocity: <span className="text-slate-700">{r.velocity ?? 0}</span></p>
                  <p className="text-slate-500 text-right">Del/Perf: <span className="text-slate-700">{r.deliveryPct ?? 0}% / {r.delPerfPct ?? 0}%</span></p>
                </div>
              </div>
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
