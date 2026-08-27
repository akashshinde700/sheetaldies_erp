import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Plus, Download, Pencil, Printer, ReceiptText, Trash2, X,
  BadgeCheck, AlertCircle,
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/export';
import { formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// draft = neutral, in-progress = info, complete = success
const STATUS_VARIANT = {
  DRAFT:    'neutral',
  ISSUED:   'info',
  APPROVED: 'success',
};

const PAGE_LIMIT = 10;

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-3.5 w-28" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-5 w-16 rounded-full" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
  </tr>
);

export default function CertList() {
  const { isManager } = useAuth();
  const [certs,   setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [status,  setStatus]  = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { setPage(1); }, [search, status, fromDate, toDate]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    api.get('/quality/certificates', {
      params: {
        page,
        limit: PAGE_LIMIT,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status !== 'all' ? { status } : {}),
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
      },
      signal: controller.signal,
    })
      .then(r => { setCerts(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(err => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError' || err?.name === 'CanceledError') return;
        setError('Failed to load certificates.'); setCerts([]); setTotal(0);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [page, search, status, fromDate, toDate, tick]);

  const fetchData = useCallback(() => setTick(t => t + 1), []);

  const exportCertificates = async () => {
    try {
      const baseParams = {
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status !== 'all' ? { status } : {}),
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
      };
      const exportLimit = 100;
      const allCerts = [];
      let exportPage = 1;
      let totalPages = 1;

      do {
        const response = await api.get('/quality/certificates', {
          params: { ...baseParams, page: exportPage, limit: exportLimit },
        });
        const pageRows = response.data.data || [];
        allCerts.push(...pageRows);
        totalPages = response.data.pagination?.pages || 1;
        exportPage += 1;
      } while (exportPage <= totalPages);

      const rows = allCerts.map(c => ({
        'Certificate No': c.certNo,
        'Issue Date': formatDate(c.issueDate),
        'Job Card': c.jobCard?.jobCardNo || c.jobCard || '',
        'Customer': c.customer?.name || '',
        'Hardness': c.hardnessMin && c.hardnessMax ? `${c.hardnessMin}-${c.hardnessMax} ${c.hardnessUnit || ''}` : '',
        'Packed Qty': c.packedQty ?? '',
        'Status': c.status,
      }));

      if (!rows.length) {
        toast.error('No certificates to export.');
        return;
      }

      exportToExcel(rows, `Quality-Certificates`);
      toast.success('Certificates exported to Excel.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export certificates.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/quality/certificates/${confirmDelete.id}`);
      toast.success('Certificate deleted.');
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting certificate.');
    } finally { setDeleting(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasFilters = Boolean(search || fromDate || toDate || status !== 'all');

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Test Certificates</h1>
          <p className="page-subtitle">{total > 0 ? `${total} total` : 'Quality assurance records'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={exportCertificates}>
            <Download /> Export Excel
          </Button>
          <Button asChild>
            <Link to="/quality/certificates/new">
              <Plus /> New Certificate
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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search cert, customer, job card..."
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="cert-from-date">From</FilterLabel>
              <input
                id="cert-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="form-input text-xs sm:w-36"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="cert-to-date">To</FilterLabel>
              <input
                id="cert-to-date"
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="form-input text-xs sm:w-36"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="cert-status-filter">Status</FilterLabel>
              <select
                id="cert-status-filter"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="form-input text-xs sm:w-40"
              >
                <option value="all">All</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setStatus('all'); setPage(1); }}
                className="text-slate-500 hover:text-rose-600"
              >
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
          <button onClick={fetchData} className="ml-auto text-xs font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left table-fixed min-w-[660px]">
            <thead>
              <tr>
                <th className="th w-[16%]">Cert No</th>
                <th className="th w-[16%] hidden sm:table-cell">Job Card</th>
                <th className="th w-[30%]">Customer</th>
                <th className="th w-[14%]">Issue Date</th>
                <th className="th w-[12%]">Status</th>
                <th className="th w-[12%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 5}).map((_, i) => <SkeletonRow key={i} />)
              ) : certs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <BadgeCheck className="h-5 w-5 text-emerald-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {hasFilters ? 'No certificates match your filters.' : 'No certificates yet.'}
                      </p>
                      {search.trim() ? (
                        <Button size="sm" asChild>
                          <Link to={`/quality/certificates/new?jobCardNo=${encodeURIComponent(search.trim())}`}>
                            <Plus /> Create certificate for job card {search.trim()}
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/quality/certificates/new">
                            <Plus /> Create first certificate
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : certs.map(c => (
                <tr key={c.id} className="tr">
                  <td className="td">
                    <span className="font-bold text-slate-700 font-mono">{c.certNo}</span>
                  </td>
                  <td className="td hidden sm:table-cell">
                    {c.jobCard ? (
                      <span className="text-sky-700 font-mono">{c.jobCard.jobCardNo}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="td font-medium text-slate-700 truncate">{c.customer?.name || '—'}</td>
                  <td className="td text-slate-500 whitespace-nowrap">{formatDate(c.issueDate)}</td>
                  <td className="td">
                    <Badge variant={STATUS_VARIANT[c.status] || 'neutral'}>{c.status}</Badge>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link to={`/quality/certificates/${c.id}/edit`} title="Edit" aria-label={`Edit certificate ${c.certNo}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
                        <Link to={`/quality/certificates/${c.id}/print`} target="_blank" title="Print Certificate" aria-label={`Print certificate ${c.certNo}`}>
                          <Printer />
                        </Link>
                      </Button>
                      {c.jobCard && (
                        <Button variant="ghost" size="icon-sm" asChild
                          className="text-slate-400 hover:text-violet-600 hover:bg-violet-50">
                          <Link to={`/invoices/new?jobCardId=${c.jobCard.id}`} title="Send to Invoice" aria-label={`Create invoice for certificate ${c.certNo}`}>
                            <ReceiptText />
                          </Link>
                        </Button>
                      )}
                      {isManager && (
                        <Button type="button" variant="ghost" size="icon-sm"
                          onClick={() => setConfirmDelete(c)}
                          title="Delete Certificate" aria-label={`Delete certificate ${c.certNo}`}
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
        {!loading && total > 0 && (
          <PageNav page={page} totalPages={totalPages} total={total} limit={PAGE_LIMIT} setPage={setPage} />
        )}
      </div>
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden animate-scale-in">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Delete Certificate?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-5">
                <span className="font-bold font-mono">{confirmDelete.certNo}</span>
                {confirmDelete.customer?.name && <span className="text-slate-500"> — {confirmDelete.customer.name}</span>}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1 border border-slate-200">
                  Cancel
                </Button>
                <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting} loading={deleting} className="flex-1">
                  {!deleting && <Trash2 />} {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
