import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import KpiCard from '../../components/KpiCard';
import { formatDate } from '../../utils/formatters';
import SearchSelect from '../../components/SearchSelect';
import { useAuth } from '../../context/AuthContext';

export default function VHTRunsheetList() {
  const { isManager } = useAuth();
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [furnaceId, setFurnaceId] = useState('');
  const [status, setStatus]     = useState('');
  const [machines, setMachines] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null); // runsheet obj
  const [deleting, setDeleting] = useState(false);

  const limit = 10;

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (furnaceId) params.furnaceId = furnaceId;
      if (status)    params.status    = status;
      const res = await api.get('/manufacturing/runsheets', { params });
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast.error('Failed to load run sheets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/machines').then((r) => setMachines(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchList(); }, [page, furnaceId, status]);

  const completedCount = rows.filter((r) => r.status === 'COMPLETED').length;

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/manufacturing/runsheets/${confirmDelete.id}`);
      toast.success(`Run sheet ${confirmDelete.runsheetNumber} deleted.`);
      setConfirmDelete(null);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete run sheet.');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const totalWt = (items) =>
    (items || []).reduce((s, it) => s + (Number(it.weightKg) || 0), 0);

  const STATUS_STYLE = {
    PLANNED:     'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    COMPLETED:   'bg-emerald-100 text-emerald-700',
    CANCELLED:   'bg-slate-100 text-slate-500',
  };

  return (
    <div className="page-stack w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">VHT Run Sheet</h1>
          <p className="page-subtitle">
            Actual furnace execution record (batch jobs, cycle parameters, graph, signatures).
          </p>
        </div>
        <Link
          to="/manufacturing/runsheet/new"
          className="btn-primary shrink-0 inline-flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> New run sheet
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Run sheets"
          value={rows.length}
          sub="Loaded records"
          icon="analytics"
          iconBg="bg-slate-100 text-slate-700"
        />
        <KpiCard
          label="Furnaces"
          value={machines.length}
          sub="Available machines"
          icon="settings_suggest"
          iconBg="bg-blue-100 text-blue-700"
        />
        <KpiCard
          label="Completed"
          value={completedCount}
          sub="Finished runs"
          icon="task_alt"
          iconBg="bg-emerald-100 text-emerald-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_auto] items-end">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Furnace</label>
          <SearchSelect
            value={String(furnaceId || '')}
            onChange={v => { setPage(1); setFurnaceId(v); }}
            options={[{ value: '', label: 'All' }, ...(machines || []).map(m => ({ value: m.id, label: m.name || m.code }))]}
            placeholder="All"
            className="text-xs min-w-[180px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            className="form-input text-xs min-w-[170px]"
          >
            <option value="">All</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        {(furnaceId || status) ? (
          <button
            type="button"
            onClick={() => { setPage(1); setFurnaceId(''); setStatus(''); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-sm">close</span> Clear
          </button>
        ) : <div />}
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No run sheets yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold">No.</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Furnace</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Jobs</th>
                  <th className="px-4 py-3 font-semibold text-right hidden md:table-cell">Total wt (kg)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs">{r.runsheetNumber}</td>
                    <td className="px-4 py-3">{formatDate(r.runDate)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{r.furnace?.name || r.furnace?.code || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{r.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">{totalWt(r.items).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[r.status] || 'bg-slate-100 text-slate-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/manufacturing/runsheet/${r.id}/print`}
                          target="_blank"
                          rel="noreferrer"
                          title="Print"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">print</span>
                        </Link>
                        <Link
                          to={`/manufacturing/runsheet/${r.id}`}
                          title="Edit"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                        {isManager && (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(r)}
                            title="Delete"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
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
        )}

        {!loading && total > 0 && (
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
            <span>
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of <span className="font-semibold">{total}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
              </button>
              <span className="font-semibold text-slate-500 px-1">{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600"
              >
                Next <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-rose-600 text-xl">delete</span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Delete Run Sheet?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-5">
                <span className="font-bold font-mono">{confirmDelete.runsheetNumber}</span>
                {confirmDelete.furnace?.name && <span className="text-slate-500"> — {confirmDelete.furnace.name}</span>}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 btn-ghost justify-center">Cancel</button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60">
                  {deleting
                    ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Deleting…</>
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
