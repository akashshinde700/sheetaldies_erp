import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/export';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';

const STATUS_OPTS = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
const PAGE_LIMIT = 10;

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1,2,3,4,5,6,7,8,9].map(i => (
      <td key={i} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded w-full" /></td>
    ))}
  </tr>
);

const Pagination = ({ page, totalPages, total, limit, setPage }) => (
  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
    <span className="text-xs text-slate-400">
      {(page-1)*limit+1}–{Math.min(page*limit, total)} of <span className="font-semibold">{total}</span>
    </span>
    <div className="flex items-center gap-1.5">
      <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors">
        <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
      </button>
      <span className="text-xs font-semibold text-slate-500 px-2">{page} / {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors">
        Next <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  </div>
);

export default function JobworkList() {
  const [challans, setChallans] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [statusSavingId, setStatusSavingId] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    api.get('/jobwork', {
      params: {
        search: search.trim() || undefined,
        status: status || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit: PAGE_LIMIT,
      },
    })
      .then(r => { setChallans(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => setError('Failed to load challans.'))
      .finally(() => setLoading(false));
  }, [search, status, fromDate, toDate, page]);

  useEffect(() => { setPage(1); }, [search, status, fromDate, toDate]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const updateChallanStatus = async (ch, nextStatus) => {
    if (nextStatus === ch.status) return;
    setStatusSavingId(ch.id);
    try {
      await api.patch(`/jobwork/${ch.id}/status`, { status: nextStatus });
      setChallans((prev) => prev.map((c) => (c.id === ch.id ? { ...c, status: nextStatus } : c)));
      toast.success(`Status: ${nextStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status.');
    } finally {
      setStatusSavingId(null);
    }
  };

  const exportChallans = async () => {
    try {
      const baseParams = {
        search: search.trim() || undefined,
        status: status || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };
      const exportLimit = 100;
      const allChallans = [];
      let exportPage = 1;
      let totalPages = 1;

      do {
        const response = await api.get('/jobwork', {
          params: { ...baseParams, page: exportPage, limit: exportLimit },
        });
        const pageRows = response.data.data || [];
        allChallans.push(...pageRows);
        totalPages = response.data.pagination?.pages || 1;
        exportPage += 1;
      } while (exportPage <= totalPages);

      const rows = allChallans.map(ch => ({
        'Challan No': ch.challanNo,
        'Challan Date': formatDate(ch.challanDate),
        'From Party': ch.fromParty?.name || '',
        'To Party': ch.toParty?.name || '',
        'Job Card': ch.jobCard?.jobCardNo || ch.jobCard || '',
        'Item Count': ch.items?.length || 0,
        'Total Value': ch.totalValue,
        'Status': ch.status,
      }));
      if (!rows.length) {
        toast.error('No challans to export.');
        return;
      }
      exportToExcel(rows, `Jobwork-Challans`);
      toast.success('Jobwork challans exported to Excel.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export challans.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header: title block + action row (stacks on narrow screens) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Jobwork Challans</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {total > 0 ? `${total} total` : 'Heat treatment job work'} · Rule 45(1) CGST
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportChallans} className="btn-outline whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden>file_download</span>
            Export Excel
          </button>
          <Link to="/jobwork/new" className="btn-primary whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden>add</span>
            New Challan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] items-end">
          <ListSearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search challan, party, job card..."
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
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-input text-xs w-auto min-w-[180px]"
            >
              <option value="">All</option>
              {STATUS_OPTS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          {(search || status || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-sm">close</span> Clear
            </button>
          )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
          <button onClick={fetchData} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80">
                {['Challan No', 'Date', 'From', 'To Party', 'Job Card', 'Items', 'Total', 'Status', 'Action'].map((h, i) => (
                  <th key={h} className={`th ${i === 0 ? 'sticky left-0 z-[1] bg-white shadow-[4px_0_12px_-8px_rgba(15,23,42,0.2)]' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 5}).map((_, i) => <SkeletonRow key={i} />)
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl text-amber-300">engineering</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {status ? `No ${status.toLowerCase()} challans.` : 'No challans yet.'}
                    </p>
                    {!status && (
                      <Link to="/jobwork/new" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                        <span className="material-symbols-outlined text-sm">add</span> Create first challan
                      </Link>
                    )}
                  </td>
                </tr>
              ) : challans.map(ch => (
                <tr key={ch.id} className="tr group">
                  <td className="td sticky left-0 z-[1] bg-white group-hover:bg-slate-50/90 shadow-[4px_0_12px_-8px_rgba(15,23,42,0.12)]">
                    <span className="text-xs font-bold text-indigo-600 font-mono">{ch.challanNo}</span>
                  </td>
                  <td className="td text-slate-500">{formatDate(ch.challanDate)}</td>
                  <td className="td text-slate-500 truncate max-w-[120px]">{ch.fromParty?.name || '—'}</td>
                  <td className="td font-medium text-slate-700 truncate max-w-[140px]">{ch.toParty?.name}</td>
                  <td className="td">
                    {ch.jobCard ? (
                      <span className="text-xs text-indigo-600 font-mono">{ch.jobCard.jobCardNo || ch.jobCard}</span>
                    ) : (
                      <span className="text-slate-300 cursor-help" title="No job card linked — open challan to attach one">
                        —
                      </span>
                    )}
                  </td>
                  <td className="td">
                    <span className="bg-slate-100 text-slate-600 rounded-lg px-2 py-0.5 text-[11px] font-bold">
                      {ch.items?.length || 0}
                    </span>
                  </td>
                  <td className="td font-bold text-slate-800">{formatCurrency(ch.totalValue)}</td>
                  <td className="td min-w-[9.5rem]">
                    <label className="sr-only">Status for {ch.challanNo}</label>
                    <select
                      aria-label={`Update status for ${ch.challanNo}`}
                      value={ch.status}
                      disabled={statusSavingId === ch.id}
                      onChange={(e) => updateChallanStatus(ch, e.target.value)}
                      className="form-input text-xs py-1.5 pr-7 font-semibold max-w-[10rem] cursor-pointer disabled:opacity-50"
                    >
                      {STATUS_OPTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Link to={`/jobwork/${ch.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">View</Link>
                      <Link to={`/jobwork/${ch.id}/print`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all"
                        title="Print Challan"
                      >
                        <span className="material-symbols-outlined text-[18px]">print</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_LIMIT} setPage={setPage} />
        )}
      </div>
    </div>
  );
}
