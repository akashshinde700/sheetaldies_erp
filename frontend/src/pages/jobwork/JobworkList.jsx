import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/export';

const STATUS_STYLE = {
  DRAFT:     'bg-slate-100 text-slate-600',
  SENT:      'bg-amber-100 text-amber-700',
  RECEIVED:  'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const STATUS_OPTS = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
const PAGE_LIMIT = 20;

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1,2,3,4,5,6,7,8,9].map(i => (
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

export default function JobworkList() {
  const [challans, setChallans] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [status,   setStatus]   = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    api.get('/jobwork', { params: { status, page, limit: PAGE_LIMIT } })
      .then(r => { setChallans(r.data.data || []); setTotal(r.data.meta?.total || 0); })
      .catch(() => setError('Failed to load challans.'))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { setPage(1); }, [status]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const exportChallans = () => {
    if (!challans.length) { toast.error('No challans to export.'); return; }
    const rows = challans.map(ch => ({
      'Challan No': ch.challanNo,
      'Challan Date': ch.challanDate ? new Date(ch.challanDate).toLocaleDateString('en-IN') : '',
      'From Party': ch.fromParty?.name || '',
      'To Party': ch.toParty?.name || '',
      'Job Card': ch.jobCard?.jobCardNo || ch.jobCard || '',
      'Item Count': ch.items?.length || 0,
      'Total Value': ch.totalValue,
      'Status': ch.status,
    }));
    exportToExcel(rows, `Jobwork-Challans`);
    toast.success('Jobwork challans exported to Excel.');
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Jobwork Challans</h2>
          <p className="text-xs text-slate-400 mt-0.5">{total > 0 ? `${total} total` : 'Heat treatment job work'} · Rule 45(1) CGST</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/jobwork/register" className="btn-outline">
            <span className="material-symbols-outlined text-sm">table_view</span> Inward/Outward Register
          </Link>
          <button onClick={exportChallans} className="btn-outline">
            <span className="material-symbols-outlined text-sm">file_download</span> Export Excel
          </button>
          <Link to="/jobwork/new" className="btn-primary">
            <span className="material-symbols-outlined text-sm">add</span> New Challan
          </Link>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUS_OPTS].map(f => (
          <button key={f} onClick={() => setStatus(f)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 ${
              status === f
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}>
            {f || 'All'}
          </button>
        ))}
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
                {['Challan No', 'Date', 'From', 'To Party', 'Job Card', 'Items', 'Total', 'Status', 'Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({length: 5}).map((_, i) => <SkeletonRow key={i} />)
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl text-amber-300">engineering</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {status ? `No ${status.toLowerCase()} challans.` : 'No challans yet.'}
                    </p>
                    {!status && (
                      <Link to="/jobwork/new" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                        <span className="material-symbols-outlined text-sm">add</span> Create first challan
                      </Link>
                    )}
                  </td>
                </tr>
              ) : challans.map(ch => (
                <tr key={ch.id} className="tr">
                  <td className="td">
                    <span className="text-xs font-bold text-indigo-600 font-mono">{ch.challanNo}</span>
                  </td>
                  <td className="td text-slate-500">{new Date(ch.challanDate).toLocaleDateString('en-IN')}</td>
                  <td className="td text-slate-500 truncate max-w-[120px]">{ch.fromParty?.name || '—'}</td>
                  <td className="td font-medium text-slate-700 truncate max-w-[140px]">{ch.toParty?.name}</td>
                  <td className="td">
                    {ch.jobCard ? (
                      <span className="text-xs text-indigo-600 font-mono">{ch.jobCard.jobCardNo || ch.jobCard}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="td">
                    <span className="bg-slate-100 text-slate-600 rounded-lg px-2 py-0.5 text-[11px] font-bold">
                      {ch.items?.length || 0}
                    </span>
                  </td>
                  <td className="td font-bold text-slate-800">₹ {parseFloat(ch.totalValue).toLocaleString('en-IN')}</td>
                  <td className="td">
                    <span className={`badge ${STATUS_STYLE[ch.status] || 'bg-slate-100 text-slate-600'}`}>
                      {ch.status}
                    </span>
                  </td>
                  <td className="td">
                    <Link to={`/jobwork/${ch.id}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">View</Link>
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
