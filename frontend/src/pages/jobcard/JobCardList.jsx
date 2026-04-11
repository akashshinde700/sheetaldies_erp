import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';
import ListSearchInput from '../../components/ListSearchInput';

const PAGE_LIMIT = 10;
const STATUS_OPTS = ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION', 'COMPLETED', 'ON_HOLD'];
const STATUS_TRANSITIONS = {
  CREATED: ['IN_PROGRESS'],
  IN_PROGRESS: ['SENT_FOR_JOBWORK'],
  SENT_FOR_JOBWORK: ['INSPECTION'],
  INSPECTION: ['COMPLETED', 'SENT_FOR_JOBWORK'],
  ON_HOLD: ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK'],
  COMPLETED: [],
};

const SkeletonRow = ({ cols = 7 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className={`h-3 bg-slate-100 rounded ${i === 0 ? 'w-24' : i === 1 ? 'w-36' : 'w-16'}`} />
      </td>
    ))}
  </tr>
);

const Pagination = ({ page, totalPages, total, limit, setPage }) => (
  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
    <span className="text-xs text-slate-400">
      {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of <span className="font-semibold">{total}</span>
    </span>
    <div className="flex items-center gap-1.5">
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors">
        <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
      </button>
      <span className="text-xs font-semibold text-slate-500 px-2">{page} / {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors">
        Next <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  </div>
);

export default function JobCardList() {
  const [cards,   setCards]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [statusSavingId, setStatusSavingId] = useState(null);

  const fetchCards = useCallback(() => {
    setLoading(true); setError(null);
    api.get('/jobcards', {
      params: {
        search: search.trim() || undefined,
        status,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit: PAGE_LIMIT,
      },
    })
      .then(r => { setCards(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => setError('Failed to load job cards.'))
      .finally(() => setLoading(false));
  }, [search, status, fromDate, toDate, page]);

  useEffect(() => { setPage(1); }, [search, status, fromDate, toDate]);
  useEffect(() => { fetchCards(); }, [fetchCards]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const getAllowedStatusOptions = (currentStatus) => {
    const next = STATUS_TRANSITIONS[currentStatus] || [];
    return [currentStatus, ...next];
  };

  const updateStatus = async (card, nextStatus) => {
    if (nextStatus === card.status) return;
    setStatusSavingId(card.id);
    try {
      await api.patch(`/jobcards/${card.id}/status`, { status: nextStatus });
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: nextStatus } : c)));
      toast.success(`Status: ${nextStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not update status.';
      toast.error(msg);
    } finally {
      setStatusSavingId(null);
    }
  };

  const exportJobCards = async () => {
    try {
      const exportLimit = 100;
      const allRows = [];
      let exportPage = 1;
      let totalPages = 1;

      do {
        const response = await api.get('/jobcards', {
          params: {
            search: search.trim() || undefined,
            status: status || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            page: exportPage,
            limit: exportLimit,
          },
        });
        const pageRows = response.data.data || [];
        allRows.push(...pageRows);
        totalPages = response.data.pagination?.pages || 1;
        exportPage += 1;
      } while (exportPage <= totalPages);

      const sheetRows = allRows.map((card) => ({
        'Job Card No': card.jobCardNo || '',
        'Part No': card.part?.partNo || '',
        Description: card.part?.description || '',
        'Drawing No': card.drawingNo || '',
        Machine: card.machine?.code || card.machine?.name || '',
        Quantity: card.quantity ?? '',
        Status: card.status || '',
        'Operator': card.operatorName || '',
        Customer: card.customer?.name || '',
        'Created Date': card.createdAt ? new Date(card.createdAt).toLocaleDateString('en-IN') : '',
      }));

      if (!sheetRows.length) {
        toast.error('No job cards to export.');
        return;
      }

      exportToExcel(sheetRows, `JobCards-Export`);
      toast.success('Job cards exported to Excel.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export job cards.');
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Job Cards</h2>
          <p className="text-xs text-slate-400 mt-0.5">{total > 0 ? `${total} total records` : 'Production tracking'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportJobCards} className="btn-outline">
            <span className="material-symbols-outlined text-sm">file_download</span> Export Excel
          </button>
          <Link to="/jobcards/new" className="btn-primary">
            <span className="material-symbols-outlined text-sm">add</span> New Job Card
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] items-end">
        <ListSearchInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search part, job card no..."
        />
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="form-input text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
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
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="form-input text-xs w-auto min-w-[180px]">
            <option value="">All</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        {(search || status || fromDate || toDate) && (
          <button onClick={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium">
            <span className="material-symbols-outlined text-sm">close</span> Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
          <button onClick={fetchCards} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Job Card No', 'Part No / Desc', 'Drawing No', 'Machine', 'Qty', 'Status (update)', 'Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl text-indigo-300">description</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {search || status ? 'No job cards match your filters.' : 'No job cards yet.'}
                    </p>
                    {!search && !status && (
                      <Link to="/jobcards/new" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                        <span className="material-symbols-outlined text-sm">add</span> Create first job card
                      </Link>
                    )}
                  </td>
                </tr>
              ) : cards.map(card => (
                <tr key={card.id} className="tr group">
                  <td className="td">
                    <Link to={`/jobcards/${card.id}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline font-mono">
                      {card.jobCardNo}
                    </Link>
                  </td>
                  <td className="td">
                    <p className="text-xs font-semibold text-slate-700">{card.part?.partNo}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">{card.part?.description}</p>
                  </td>
                  <td className="td text-slate-600 font-mono text-xs">{card.drawingNo || '—'}</td>
                  <td className="td text-slate-600 text-xs font-medium">{card.machine?.code || '—'}</td>
                  <td className="td font-semibold text-slate-700">{card.quantity}</td>
                  <td className="td min-w-[11rem]">
                    <label className="sr-only">Status for job card {card.jobCardNo}</label>
                    <select
                      aria-label={`Update status for ${card.jobCardNo}`}
                      value={card.status}
                      disabled={statusSavingId === card.id}
                      onChange={(e) => updateStatus(card, e.target.value)}
                      className="form-input text-xs py-1.5 pr-8 font-semibold max-w-[11.5rem] cursor-pointer disabled:opacity-50"
                    >
                      {getAllowedStatusOptions(card.status).map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight hidden sm:block">
                      Rules: e.g. COMPLETED needs inspection PASS
                    </p>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Link to={`/jobcards/${card.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">Edit</Link>
                      <span className="text-slate-200">·</span>
                      <Link to={`/jobcards/${card.id}/inspection`}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline">Inspect</Link>
                      <span className="text-slate-200">·</span>
                      <Link to={`/jobcards/${card.id}/print`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all"
                        title="Print Job Card"
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
