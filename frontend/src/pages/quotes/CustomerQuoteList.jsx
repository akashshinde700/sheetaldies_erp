import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, Printer, Trash2, X, FileText } from 'lucide-react';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';
import { formatDate } from '../../utils/formatters';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_LIMIT = 15;
const STATUS_VARIANT = {
  DRAFT:    'neutral',
  SENT:     'info',
  ACCEPTED: 'success',
  REJECTED: 'error',
  EXPIRED:  'warning',
};
const STATUSES = ['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED'];

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-3.5 w-32" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-5 w-16 rounded-full" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
  </tr>
);

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
  const hasFilters = Boolean(search || status);

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Customer Quotations</h1>
          <p className="page-subtitle">{total > 0 ? `${total} total` : 'Price quotes issued to customers'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild>
            <Link to="/customer-quotes/new">
              <Plus /> New Quote
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search quote no, customer..." className="w-full" />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="quote-status-filter">Status</FilterLabel>
              <select id="quote-status-filter" value={status} onChange={e => setStatus(e.target.value)}
                className="form-input text-xs sm:w-40">
                <option value="">All</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setSearch(''); setStatus(''); }}
                className="text-slate-500 hover:text-rose-600">
                <X /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr>
                <th className="th">Quote No</th>
                <th className="th">Customer</th>
                <th className="th">Date</th>
                <th className="th">Valid Until</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {hasFilters ? 'No quotations match your filters.' : 'No quotations yet.'}
                      </p>
                      {!hasFilters && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/customer-quotes/new">
                            <Plus /> Create first quote
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : quotes.map(q => (
                <tr key={q.id} className="tr group">
                  <td className="td">
                    <Link to={`/customer-quotes/${q.id}`}
                      className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono">
                      {q.quoteNo}
                    </Link>
                  </td>
                  <td className="td font-medium text-slate-700">{q.customer?.name || '—'}</td>
                  <td className="td text-slate-500 whitespace-nowrap">{formatDate(q.quoteDate)}</td>
                  <td className="td text-slate-500 whitespace-nowrap">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                  <td className="td">
                    <Badge variant={STATUS_VARIANT[q.status] || 'neutral'} className="px-2 py-0.5 text-[10px]">
                      {q.status}
                    </Badge>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/customer-quotes/${q.id}`} title="View" aria-label={`View quote ${q.quoteNo}`}>
                          <Eye />
                        </Link>
                      </Button>
                      {q.status === 'DRAFT' && (
                        <Button variant="ghost" size="icon-sm" asChild
                          className="text-slate-400 hover:text-violet-600 hover:bg-violet-50">
                          <Link to={`/customer-quotes/${q.id}/edit`} title="Edit" aria-label={`Edit quote ${q.quoteNo}`}>
                            <Pencil />
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/customer-quotes/${q.id}/print`} target="_blank" title="Print" aria-label={`Print quote ${q.quoteNo}`}>
                          <Printer />
                        </Link>
                      </Button>
                      {(q.status === 'DRAFT' || isAdmin) && (
                        <Button type="button" variant="ghost" size="icon-sm"
                          onClick={() => handleDelete(q)}
                          title={q.status === 'DRAFT' ? 'Delete quote' : `Delete ${q.status} quote (admin only)`}
                          aria-label={`Delete quote ${q.quoteNo}`}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 />
                        </Button>
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
