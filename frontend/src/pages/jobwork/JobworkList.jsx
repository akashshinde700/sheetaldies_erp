import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Download, Eye, Printer, Loader2, X, AlertCircle, Wrench, PlusCircle,
} from 'lucide-react';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/export';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';
import { statusColor } from '../../utils/statusColors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_OPTS = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
const PAGE_LIMIT = 10;

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-3.5 w-16" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-28" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td hidden md:table-cell"><Skeleton className="h-3.5 w-8" /></td>
    <td className="td hidden md:table-cell"><Skeleton className="h-3.5 w-16 ml-auto" /></td>
    <td className="td"><Skeleton className="h-7 w-28 rounded-lg" /></td>
    <td className="td"><Skeleton className="h-3.5 w-14 ml-auto" /></td>
  </tr>
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

  const fetchData = useCallback((signal) => {
    setLoading(true); setError(null);
    api.get('/jobwork', {
      signal,
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
      .catch(err => { if (err?.name !== 'CanceledError') setError('Failed to load challans.'); })
      .finally(() => setLoading(false));
  }, [search, status, fromDate, toDate, page]);

  useEffect(() => { setPage(1); }, [search, status, fromDate, toDate]);
  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

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
  const hasFilters = Boolean(search || status || fromDate || toDate);

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Jobwork + Job Cards</h1>
          <p className="page-subtitle">
            {total > 0 ? `${total} total` : 'Heat treatment job work'} · Rule 45(1) CGST
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={exportChallans}>
            <Download /> Export Excel
          </Button>
          <Button asChild>
            <Link to="/jobwork/inward-entry">
              <Plus /> New Inward
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search challan, party, job card..."
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="jw-from-date">From</FilterLabel>
              <input id="jw-from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="form-input text-xs sm:w-36" />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="jw-to-date">To</FilterLabel>
              <input id="jw-to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="form-input text-xs sm:w-36" />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="jw-status-filter">Status</FilterLabel>
              {/* Native select kept: "All" option uses value='' which Radix Select does not allow */}
              <select id="jw-status-filter" value={status} onChange={(e) => setStatus(e.target.value)}
                className="form-input text-xs sm:w-44">
                <option value="">All</option>
                {STATUS_OPTS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => fetchData()} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr>
                <th className="th sticky left-0 z-[1] bg-white shadow-[4px_0_12px_-8px_rgba(15,23,42,0.2)]">Challan No</th>
                <th className="th">Date</th>
                <th className="th">From</th>
                <th className="th hidden sm:table-cell">To Party</th>
                <th className="th hidden sm:table-cell">Job Card</th>
                <th className="th hidden md:table-cell">Items</th>
                <th className="th hidden md:table-cell text-right">Total</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-amber-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {status ? `No ${status.toLowerCase()} challans.` : 'No challans yet.'}
                      </p>
                      {!status && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/jobwork/inward-entry">
                            <Plus /> Create first challan
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : challans.map(ch => (
                <tr key={ch.id} className="tr group">
                  <td className="td sticky left-0 z-[1] bg-white group-hover:bg-slate-50/90 shadow-[4px_0_12px_-8px_rgba(15,23,42,0.12)]">
                    <Link to={`/jobwork/${ch.id}`}
                      className="text-xs font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono">
                      {ch.challanNo}
                    </Link>
                  </td>
                  <td className="td text-slate-500 whitespace-nowrap">{formatDate(ch.challanDate)}</td>
                  <td className="td text-slate-500 truncate max-w-[120px]">{ch.fromParty?.name || '—'}</td>
                  <td className="td font-medium text-slate-700 truncate max-w-[140px] hidden sm:table-cell">{ch.toParty?.name}</td>
                  <td className="td hidden sm:table-cell">
                    {/* jobCards comes from the challan's items — the direct
                        jobCard relation is almost always null, so this column
                        used to read "—" even for inwards that had a card. */}
                    {(ch.jobCards?.length || ch.jobCard) ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {(ch.jobCards?.length ? ch.jobCards : [ch.jobCard]).map(jc => (
                            <Link key={jc.id || jc.jobCardNo} to={`/jobcards/${jc.id}`}
                              className="text-xs text-sky-700 font-mono font-bold hover:underline">
                              {jc.jobCardNo || jc}
                            </Link>
                          ))}
                        </div>
                        {ch.jobCardStatus === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase tracking-wide"
                            title="Some items still have no job card">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Partial {ch.jobCardItemCount}/{ch.itemCount}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            All {ch.itemCount} items
                          </span>
                        )}
                      </div>
                    ) : (
                      <Link to={`/jobcards/new?ref=${encodeURIComponent(ch.inwardNo || ch.challanNo)}`}
                        title="No job card yet — click to create one from this inward"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-sky-600">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Create
                      </Link>
                    )}
                  </td>
                  <td className="td hidden md:table-cell">
                    <Badge variant="neutral" className="px-2 py-0.5 text-[11px] tabular-nums">
                      {ch.items?.length || 0}
                    </Badge>
                  </td>
                  <td className="td font-bold text-slate-800 hidden md:table-cell text-right tabular-nums whitespace-nowrap">{formatCurrency(ch.totalValue)}</td>
                  <td className="td min-w-[9.5rem]">
                    <div className="relative">
                      <select
                        aria-label={`Update status for ${ch.challanNo}`}
                        aria-busy={statusSavingId === ch.id}
                        value={ch.status}
                        disabled={statusSavingId === ch.id}
                        onChange={(e) => updateChallanStatus(ch, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1.5 pr-7 rounded-lg border-0 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 ${statusColor(ch.status)}`}
                      >
                        {STATUS_OPTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {statusSavingId === ch.id && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 animate-spin pointer-events-none" />
                      )}
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/jobwork/${ch.id}`} title="View" aria-label={`View challan ${ch.challanNo}`}>
                          <Eye />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/jobwork/${ch.id}/print`} title="Print Challan" aria-label={`Print challan ${ch.challanNo}`}>
                          <Printer />
                        </Link>
                      </Button>
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
    </div>
  );
}
