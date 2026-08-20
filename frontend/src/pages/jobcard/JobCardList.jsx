import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate } from '../../utils/formatters';
import { statusColor } from '../../utils/statusColors';

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

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className={`h-3 bg-slate-100 rounded ${i === 0 ? 'w-24' : i === 1 ? 'w-32' : 'w-16'}`} />
      </td>
    ))}
  </tr>
);

export default function JobCardList() {
  const [cards,   setCards]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [deletingId,     setDeletingId]     = useState(null);
  const [confirm,        setConfirm]        = useState(null);

  const fetchCards = useCallback((signal) => {
    setLoading(true); setError(null);
    api.get('/jobcards', {
      signal,
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
      .catch(err => { if (!api.isCancel?.(err) && err?.name !== 'CanceledError') setError('Failed to load job cards.'); })
      .finally(() => setLoading(false));
  }, [search, status, fromDate, toDate, page]);

  useEffect(() => { setPage(1); }, [search, status, fromDate, toDate]);
  useEffect(() => {
    const controller = new AbortController();
    fetchCards(controller.signal);
    return () => controller.abort();
  }, [fetchCards]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const getAllowedStatusOptions = (currentStatus) => {
    const next = STATUS_TRANSITIONS[currentStatus] || [];
    return [currentStatus, ...next];
  };

  const doUpdateStatus = async (card, nextStatus) => {
    setStatusSavingId(card.id);
    try {
      await api.patch(`/jobcards/${card.id}/status`, { status: nextStatus });
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: nextStatus } : c));
      toast.success(`Status: ${nextStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status.');
    } finally {
      setStatusSavingId(null);
    }
  };

  const updateStatus = (card, nextStatus) => {
    if (nextStatus === card.status) return;
    if (nextStatus === 'COMPLETED') {
      setConfirm({
        title: `Complete Job Card ${card.jobCardNo}?`,
        message: 'This requires an INSPECTION with a PASS or CONDITIONAL result.',
        confirmLabel: 'Mark Completed',
        variant: 'primary',
        icon: 'task_alt',
        onConfirm: async () => { setConfirm(null); await doUpdateStatus(card, nextStatus); },
      });
      return;
    }
    doUpdateStatus(card, nextStatus);
  };

  const handleDelete = (card) => {
    setConfirm({
      title: `Delete Job Card ${card.jobCardNo}?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'delete',
      onConfirm: async () => {
        setConfirm(null);
        setDeletingId(card.id);
        try {
          await api.delete(`/jobcards/${card.id}`);
          toast.success(`Job Card ${card.jobCardNo} deleted`);
          fetchCards();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const isOverdue = (card) => {
    if (!card.dueDate || card.status === 'COMPLETED') return false;
    return new Date(card.dueDate) < new Date();
  };

  const exportJobCards = async () => {
    try {
      const allRows = [];
      let exportPage = 1;
      let pages = 1;
      do {
        const r = await api.get('/jobcards', {
          params: { search: search.trim() || undefined, status: status || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined, page: exportPage, limit: 100 },
        });
        allRows.push(...(r.data.data || []));
        pages = r.data.pagination?.pages || 1;
        exportPage++;
      } while (exportPage <= pages);

      const sheetRows = allRows.map(card => ({
        'Job Card No': card.jobCardNo || '',
        'Customer': card.customer?.name || card.customerNameSnapshot || '',
        'Drawing No': card.drawingNo || '',
        'Quantity': card.quantity ?? '',
        'Status': card.status || '',
        'Created Date': formatDate(card.createdAt),
      }));

      if (!sheetRows.length) { toast.error('No job cards to export.'); return; }
      exportToExcel(sheetRows, 'JobCards-Export');
      toast.success('Exported to Excel.');
    } catch {
      toast.error('Failed to export job cards.');
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Job Cards</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {total > 0
              ? `${total} total · ${cards.filter(c => c.status === 'IN_PROGRESS').length} in progress · ${cards.filter(c => isOverdue(c)).length > 0 ? `${cards.filter(c => isOverdue(c)).length} overdue` : 'none overdue'}`
              : 'Production tracking'}
          </p>
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
        <ListSearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search job card no, customer..." />
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="form-input text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="form-input text-xs" />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="form-input text-xs w-auto min-w-[160px]">
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
          <table className="w-full text-left min-w-[520px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-sky-50/30 border-b border-slate-100">
                <th className="th">Job Card No</th>
                <th className="th hidden sm:table-cell">Customer</th>
                <th className="th hidden sm:table-cell">Drawing No</th>
                <th className="th hidden md:table-cell">Qty</th>
                <th className="th">Status</th>
                <th className="th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl text-sky-300">description</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {search || status ? 'No job cards match your filters.' : 'No job cards yet.'}
                    </p>
                    {!search && !status && (
                      <Link to="/jobcards/new" className="inline-flex items-center gap-1 text-xs text-sky-800 font-semibold hover:underline">
                        <span className="material-symbols-outlined text-sm">add</span> Create first job card
                      </Link>
                    )}
                  </td>
                </tr>
              ) : cards.map(card => (
                <tr key={card.id} className={`tr group ${isOverdue(card) ? 'bg-rose-50/40' : ''}`}>

                  {/* Job Card No */}
                  <td className="td">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link to={`/jobcards/${card.id}`}
                        className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono">
                        {card.jobCardNo}
                      </Link>
                      {isOverdue(card) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[11px]">schedule</span> Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(card.createdAt)}</p>
                  </td>

                  {/* Customer */}
                  <td className="td text-slate-700 text-xs font-medium hidden sm:table-cell">
                    {card.customer?.name || card.customerNameSnapshot || '—'}
                  </td>

                  {/* Drawing No */}
                  <td className="td text-slate-500 font-mono text-xs hidden sm:table-cell">{card.drawingNo || '—'}</td>

                  {/* Qty */}
                  <td className="td font-semibold text-slate-700 hidden md:table-cell">{card.quantity}</td>

                  {/* Status */}
                  <td className="td min-w-[10rem]">
                    <select
                      value={card.status}
                      disabled={statusSavingId === card.id}
                      onChange={e => updateStatus(card, e.target.value)}
                      aria-label={`Change status for job card ${card.jobCardNo}`}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 ${statusColor(card.status)}`}
                    >
                      {getAllowedStatusOptions(card.status).map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/jobcards/${card.id}`} title="Edit" aria-label={`Edit job card ${card.jobCardNo}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-all">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </Link>
                      <Link to={`/jobcards/${card.id}/print`} title="Print" aria-label={`Print job card ${card.jobCardNo}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-700 hover:bg-slate-100 transition-all">
                        <span className="material-symbols-outlined text-[18px]">print</span>
                      </Link>
                      <Link to={`/quality/certificates/new?jobCardId=${card.id}`} title="Send to Certificate" aria-label={`Create certificate for job card ${card.jobCardNo}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                      </Link>
                      <button type="button" onClick={() => handleDelete(card)} disabled={deletingId === card.id} title="Delete" aria-label={`Delete job card ${card.jobCardNo}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50">
                        <span className="material-symbols-outlined text-[18px]">
                          {deletingId === card.id ? 'progress_activity' : 'delete'}
                        </span>
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <PageNav page={page} totalPages={totalPages} total={total} limit={PAGE_LIMIT} setPage={setPage} />
        )}
      </div>

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
