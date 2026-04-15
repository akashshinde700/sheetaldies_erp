import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import { formatDate, formatCurrency } from '../../utils/formatters';

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
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Quote No','Customer','Date','Valid Until','Amount','Status','Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({length: 7}).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : quotes.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-2xl text-indigo-300">request_quote</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">No quotations yet.</p>
                  <Link to="/customer-quotes/new" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                    <span className="material-symbols-outlined text-sm">add</span> Create first quote
                  </Link>
                </td></tr>
              ) : quotes.map(q => (
                <tr key={q.id} className="tr group">
                  <td className="td">
                    <Link to={`/customer-quotes/${q.id}`} className="text-xs font-bold text-indigo-600 hover:underline font-mono">{q.quoteNo}</Link>
                  </td>
                  <td className="td text-xs font-medium text-slate-700">{q.customer?.name || '—'}</td>
                  <td className="td text-xs text-slate-500">{formatDate(q.quoteDate)}</td>
                  <td className="td text-xs text-slate-500">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                  <td className="td text-xs font-semibold text-slate-800">₹{formatCurrency(q.totalAmount)}</td>
                  <td className="td">
                    <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${STATUS_COLORS[q.status] || 'bg-slate-100 text-slate-700'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Link to={`/customer-quotes/${q.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">View</Link>
                      {q.status === 'DRAFT' && (
                        <>
                          <span className="text-slate-200">·</span>
                          <Link to={`/customer-quotes/${q.id}/edit`} className="text-xs font-semibold text-violet-600 hover:underline">Edit</Link>
                        </>
                      )}
                      <span className="text-slate-200">·</span>
                      <Link to={`/customer-quotes/${q.id}/print`} target="_blank"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        title="Print">
                        <span className="material-symbols-outlined text-[18px]">print</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && total > PAGE_LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-400">{(page-1)*PAGE_LIMIT+1}–{Math.min(page*PAGE_LIMIT, total)} of {total}</span>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50">
                <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
              </button>
              <span className="text-xs font-semibold text-slate-500 px-2">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50">
                Next <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
