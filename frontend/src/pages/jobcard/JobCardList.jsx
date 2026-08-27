import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Download, Pencil, Printer, BadgeCheck, Trash2, X, Eye, ClipboardCheck,
  FileText, Clock, AlertCircle,
} from 'lucide-react';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate } from '../../utils/formatters';
import { statusColor } from '../../utils/statusColors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RowActions, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/row-actions';

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

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-32" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td hidden md:table-cell"><Skeleton className="h-3.5 w-10 ml-auto" /></td>
    <td className="td"><Skeleton className="h-7 w-32 rounded-lg" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
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

  const hasFilters = Boolean(search || status || fromDate || toDate);

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Job Cards</h1>
          <p className="page-subtitle">
            {total > 0
              ? `${total} total · ${cards.filter(c => c.status === 'IN_PROGRESS').length} in progress · ${cards.filter(c => isOverdue(c)).length > 0 ? `${cards.filter(c => isOverdue(c)).length} overdue` : 'none overdue'}`
              : 'Production tracking'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={exportJobCards}>
            <Download /> Export Excel
          </Button>
          <Button asChild>
            <Link to="/jobcards/new">
              <Plus /> New Job Card
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
              <ListSearchInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search job card no, customer..."
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="jc-from-date">From</FilterLabel>
              <input id="jc-from-date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="form-input text-xs sm:w-36" />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="jc-to-date">To</FilterLabel>
              <input id="jc-to-date" type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="form-input text-xs sm:w-36" />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="jc-status-filter">Status</FilterLabel>
              <select id="jc-status-filter" value={status} onChange={e => setStatus(e.target.value)}
                className="form-input text-xs sm:w-44">
                <option value="">All</option>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); }}
                className="text-slate-500 hover:text-rose-600">
                <X /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={fetchCards} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="list-cards w-full text-left min-w-[560px]">
            <thead>
              <tr>
                <th className="th">Job Card No</th>
                <th className="th hidden sm:table-cell">Customer</th>
                <th className="th hidden sm:table-cell">Drawing No</th>
                <th className="th hidden md:table-cell text-right">Qty</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {hasFilters ? 'No job cards match your filters.' : 'No job cards yet.'}
                      </p>
                      {!hasFilters && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/jobcards/new">
                            <Plus /> Create first job card
                          </Link>
                        </Button>
                      )}
                    </div>
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
                        <Badge variant="error" className="px-1.5 py-0.5 text-[10px]">
                          <Clock className="h-3 w-3" /> Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{formatDate(card.createdAt)}</p>
                  </td>

                  {/* Customer */}
                  <td className="td text-slate-700 font-medium hidden sm:table-cell">
                    {card.customer?.name || card.customerNameSnapshot || '—'}
                  </td>

                  {/* Drawing No */}
                  <td className="td text-slate-500 font-mono hidden sm:table-cell">{card.drawingNo || '—'}</td>

                  {/* Qty */}
                  <td className="td font-semibold text-slate-700 hidden md:table-cell text-right tabular-nums">{card.quantity}</td>

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
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/jobcards/${card.id}/edit`} aria-label={`Edit job card ${card.jobCardNo}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <RowActions label={`Actions for job card ${card.jobCardNo}`}>
                        <DropdownMenuItem asChild>
                          <Link to={`/jobcards/${card.id}`}><Eye /> View</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/jobcards/${card.id}/inspection`}><ClipboardCheck /> Inspection</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/jobcards/${card.id}/print`}><Printer /> Print</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/quality/certificates/new?jobCardId=${card.id}`}><BadgeCheck /> Create certificate</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => handleDelete(card)}>
                          <Trash2 /> Delete job card
                        </DropdownMenuItem>
                      </RowActions>
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
