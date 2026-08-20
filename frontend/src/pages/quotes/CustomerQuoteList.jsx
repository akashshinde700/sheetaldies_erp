import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';
import { formatDate } from '../../utils/formatters';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

const PAGE_LIMIT = 15;
const STATUS_COLORS = {
  DRAFT:    'bg-slate-100 text-slate-700',
  SENT:     'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  EXPIRED:  'bg-orange-100 text-orange-700',
};
const STATUSES = ['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED'];

export default function CustomerQuoteList() {
  const [quotes,  setQuotes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { isAdmin } = useAuth();

  // Only DRAFT quotes are deletable by anyone; an admin can also remove one
  // that already went out, for the case where it was raised by mistake.
  const handleDelete = (q) => {
    const isDraft = q.status === 'DRAFT';
    setConfirmDialog({
      title: isDraft ? 'Delete draft quote?' : `Delete ${q.status} quote?`,
      message: isDraft
        ? `Permanently delete ${q.quoteNo}?`
        : `${q.quoteNo} is ${q.status} — the customer has already been shown this quote. `
          + 'Deleting it removes the record of what was offered. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/customer-quotes/${q.id}`);
          toast.success(`Quote ${q.quoteNo} deleted.`);
          setQuotes(p => p.filter(x => x.id !== q.id));
          setTotal(t => Math.max(0, t - 1));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete quote.');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/customer-quotes', { params: { search: search.trim() || undefined, status: status || undefined, page, limit: PAGE_LIMIT } })
      .then(r => { setQuotes(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => toast.error('Failed to load quotes.'))
      .finally(() => setLoading(false));
  }, [search, status, page]);

  useEffect(() => { setPage(1); }, [search, status]);
  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="space-y-5 animate-slide-up">
      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Customer Quotations</h2>
          <p className="text-xs text-slate-400 mt-0.5">{total > 0 ? `${total} total` : 'Price quotes issued to customers'}</p>
        </div>
        <Link to="/customer-quotes/new" className="btn-primary">
          <span className="material-symbols-outlined text-sm">add</span> New Quote
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <ListSearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quote no, customer..." />
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="form-input text-xs min-w-[140px]">
            <option value="">All</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {(search || status) && (
          <button onClick={() => { setSearch(''); setStatus(''); }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500">
            <span className="material-symbols-outlined text-sm">close</span> Clear
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-sky-50/30 border-b border-slate-100">
                {['Quote No','Customer','Date','Valid Until','Status','Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({length: 6}).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : quotes.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-2xl text-sky-300">request_quote</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">No quotations yet.</p>
                  <Link to="/customer-quotes/new" className="inline-flex items-center gap-1 text-xs text-sky-600 font-semibold hover:underline">
                    <span className="material-symbols-outlined text-sm">add</span> Create first quote
                  </Link>
                </td></tr>
              ) : quotes.map(q => (
                <tr key={q.id} className="tr group">
                  <td className="td">
                    <Link to={`/customer-quotes/${q.id}`} className="text-xs font-bold text-sky-600 hover:underline font-mono">{q.quoteNo}</Link>
                  </td>
                  <td className="td text-xs font-medium text-slate-700">{q.customer?.name || '—'}</td>
                  <td className="td text-xs text-slate-500">{formatDate(q.quoteDate)}</td>
                  <td className="td text-xs text-slate-500">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                  <td className="td">
                    <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${STATUS_COLORS[q.status] || 'bg-slate-100 text-slate-700'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1">
                      <Link to={`/customer-quotes/${q.id}`}
                        title="View"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-all">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </Link>
                      {q.status === 'DRAFT' && (
                        <Link to={`/customer-quotes/${q.id}/edit`}
                          title="Edit"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                      )}
                      <Link to={`/customer-quotes/${q.id}/print`} target="_blank"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-all"
                        title="Print">
                        <span className="material-symbols-outlined text-[18px]">print</span>
                      </Link>
                      {(q.status === 'DRAFT' || isAdmin) && (
                        <button type="button" onClick={() => handleDelete(q)}
                          title={q.status === 'DRAFT' ? 'Delete quote' : `Delete ${q.status} quote (admin only)`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && total > PAGE_LIMIT && (
          <PageNav page={page} totalPages={totalPages} total={total} limit={PAGE_LIMIT} setPage={setPage} />
        )}
      </div>
    </div>
  );
}
