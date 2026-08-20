import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/export';
import KpiCard from '../../components/KpiCard';
import { formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';
import PageNav from '../../components/PageNav';

const STATUS_STYLE = {
  DRAFT:    'bg-slate-100 text-slate-600',
  ISSUED:   'bg-blue-100 text-blue-700',    // in-progress = blue
  APPROVED: 'bg-emerald-100 text-emerald-700', // complete = green
};

const PAGE_LIMIT = 10;

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1,2,3,4,5,6,7,8].map(i => (
      <td key={i} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded w-full" /></td>
    ))}
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

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Test Certificates</h2>
          <p className="text-xs text-slate-400 mt-0.5">{total > 0 ? `${total} total` : 'Quality assurance records'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportCertificates} className="btn-outline">
            <span className="material-symbols-outlined text-sm">file_download</span> Export Excel
          </button>
          <Link to="/quality/certificates/new" className="btn-primary">
            <span className="material-symbols-outlined text-sm">add</span> New Certificate
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] items-end">
          <ListSearchInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search cert, customer, job card..."
          />
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="form-input text-xs"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="form-input text-xs"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="form-input text-xs w-auto min-w-[170px]"
            >
              <option value="all">All</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
          {(search || fromDate || toDate || status !== 'all') ? (
            <button
              type="button"
              onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setStatus('all'); setPage(1); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-sm">close</span> Clear
            </button>
          ) : <div />}
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
          <table className="w-full text-left min-w-[480px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-sky-50/30 border-b border-slate-100">
                <th className="th">Cert No</th>
                <th className="th hidden sm:table-cell">Job Card</th>
                <th className="th">Customer</th>
                <th className="th">Hardness</th>
                <th className="th hidden md:table-cell">Packed Qty</th>
                <th className="th">Issue Date</th>
                <th className="th">Status</th>
                <th className="th">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 5}).map((_, i) => <SkeletonRow key={i} />)
              ) : certs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl text-emerald-300">verified</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">No certificates yet.</p>
                    {search.trim() ? (
                      <Link
                        to={`/quality/certificates/new?jobCardNo=${encodeURIComponent(search.trim())}`}
                        className="inline-flex items-center gap-1.5 text-xs bg-sky-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-sky-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Create certificate for job card {search.trim()}
                      </Link>
                    ) : (
                      <Link to="/quality/certificates/new"
                        className="inline-flex items-center gap-1 text-xs text-sky-600 font-semibold hover:underline">
                        <span className="material-symbols-outlined text-sm">add</span> Create first certificate
                      </Link>
                    )}
                  </td>
                </tr>
              ) : certs.map(c => (
                <tr key={c.id} className="tr">
                  <td className="td">
                    <span className="text-xs font-bold text-slate-700 font-mono">{c.certNo}</span>
                  </td>
                  <td className="td hidden sm:table-cell">
                    {c.jobCard ? (
                      <span className="text-xs text-sky-600 font-mono">{c.jobCard.jobCardNo}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="td font-medium text-slate-700 truncate max-w-[150px]">{c.customer?.name || '—'}</td>
                  <td className="td">
                    {c.hardnessMin ? (
                      <span className="text-xs font-bold text-slate-700">
                        {c.hardnessMin}–{c.hardnessMax}
                        <span className="text-slate-400 font-normal ml-1">{c.hardnessUnit}</span>
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="td text-slate-600 hidden md:table-cell">{c.packedQty ?? '—'}</td>
                  <td className="td text-slate-500">{formatDate(c.issueDate)}</td>
                  <td className="td">
                    <span className={`badge ${STATUS_STYLE[c.status] || STATUS_STYLE.DRAFT}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Link to={`/quality/certificates/${c.id}/edit`}
                        title="Edit"
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </Link>
                      <Link to={`/quality/certificates/${c.id}/print`} target="_blank"
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Print Certificate">
                        <span className="material-symbols-outlined text-[16px]">print</span>
                      </Link>
                      {c.jobCard && (
                        <Link to={`/invoices/new?jobCardId=${c.jobCard.id}`}
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-violet-600 hover:bg-violet-50 transition-colors"
                          title="Send to Invoice">
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        </Link>
                      )}
                      {isManager && (
                        <button type="button" onClick={() => setConfirmDelete(c)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Delete Certificate">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
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
                  <span className="material-symbols-outlined text-rose-600 text-xl">delete</span>
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
                <button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 btn-ghost justify-center">Cancel</button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60">
                  {deleting
                    ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Deleting...</>
                    : <><span className="material-symbols-outlined text-sm">delete</span> Delete</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
