import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

export default function VHTRunsheetList() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [furnaceId, setFurnaceId] = useState('');
  const [status, setStatus] = useState('');
  const [machines, setMachines] = useState([]);

  const limit = 10;

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (furnaceId) params.furnaceId = furnaceId;
      if (status) params.status = status;
      const res = await api.get('/manufacturing/runsheets', { params });
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/machines').then((r) => setMachines(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchList();
  }, [page, furnaceId, status]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const totalWt = (items) =>
    (items || []).reduce((s, it) => s + (Number(it.weightKg) || 0), 0);

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_auto] items-end">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Furnace</label>
          <select
            value={furnaceId}
            onChange={(e) => { setPage(1); setFurnaceId(e.target.value); }}
            className="form-input text-xs min-w-[180px]"
          >
            <option value="">All</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.code}</option>
            ))}
          </select>
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
            onClick={() => {
              setPage(1);
              setFurnaceId('');
              setStatus('');
            }}
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold">No.</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Furnace</th>
                  <th className="px-4 py-3 font-semibold">Jobs</th>
                  <th className="px-4 py-3 font-semibold text-right">Total wt (kg)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs">{r.runsheetNumber}</td>
                    <td className="px-4 py-3">{formatDate(r.runDate)}</td>
                    <td className="px-4 py-3">{r.furnace?.name || r.furnace?.code || '—'}</td>
                    <td className="px-4 py-3">{r.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totalWt(r.items).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Link
                        to={`/manufacturing/runsheet/${r.id}/print`}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Print
                      </Link>
                      <Link
                        to={`/manufacturing/runsheet/${r.id}`}
                        className="text-slate-700 hover:underline text-xs font-medium"
                      >
                        Edit
                      </Link>
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
              </button>
              <span className="font-semibold text-slate-500 px-1">{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
              >
                Next <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
