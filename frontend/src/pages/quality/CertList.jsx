import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/export';

const STATUS_STYLE = {
  DRAFT:    'bg-slate-100 text-slate-600',
  ISSUED:   'bg-indigo-100 text-indigo-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
};

const PAGE_LIMIT = 20;

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1,2,3,4,5,6,7,8].map(i => (
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

export default function CertList() {
  const [certs,   setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    api.get('/quality/certificates', { params: { page, limit: PAGE_LIMIT } })
      .then(r => { setCerts(r.data.data || []); setTotal(r.data.meta?.total || 0); })
      .catch(() => setError('Failed to load certificates.'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCertificates = () => {
    if (!certs.length) { toast.error('No certificates to export.'); return; }
    const rows = certs.map(c => ({
      'Certificate No': c.certNo,
      'Issue Date': c.issueDate ? new Date(c.issueDate).toLocaleDateString('en-IN') : '',
      'Job Card': c.jobCard?.jobCardNo || c.jobCard || '',
      'Customer': c.customer?.name || '',
      'Hardness': c.hardnessMin && c.hardnessMax ? `${c.hardnessMin}-${c.hardnessMax} ${c.hardnessUnit || ''}` : '',
      'Packed Qty': c.packedQty ?? '',
      'Status': c.status,
    }));
    exportToExcel(rows, `Quality-Certificates`);
    toast.success('Certificates exported to Excel.');
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Test Certificates</h2>
          <p className="text-xs text-slate-400 mt-0.5">{total > 0 ? `${total} total` : 'Quality assurance records'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCertificates} className="btn-outline">
            <span className="material-symbols-outlined text-sm">file_download</span> Export Excel
          </button>
          <Link to="/quality/certificates/new" className="btn-primary">
            <span className="material-symbols-outlined text-sm">add</span> New Certificate
          </Link>
        </div>
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
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['Cert No', 'Job Card', 'Customer', 'Hardness', 'Packed Qty', 'Issue Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
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
                    <Link to="/quality/certificates/new"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                      <span className="material-symbols-outlined text-sm">add</span> Create first certificate
                    </Link>
                  </td>
                </tr>
              ) : certs.map(c => (
                <tr key={c.id} className="tr">
                  <td className="td">
                    <Link to={`/quality/certificates/${c.id}`}
                      className="text-xs font-bold text-indigo-600 hover:underline font-mono">{c.certNo}</Link>
                  </td>
                  <td className="td">
                    {c.jobCard ? (
                      <span className="text-xs text-indigo-600 font-mono">{c.jobCard.jobCardNo}</span>
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
                  <td className="td text-slate-600">{c.packedQty ?? '—'}</td>
                  <td className="td text-slate-500">{new Date(c.issueDate).toLocaleDateString('en-IN')}</td>
                  <td className="td">
                    <span className={`badge ${STATUS_STYLE[c.status] || STATUS_STYLE.DRAFT}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="td">
                    <Link to={`/quality/certificates/${c.id}`}
                      className="text-xs font-semibold text-indigo-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_LIMIT} setPage={setPage} />
        )}
      </div>
    </div>
  );
}
