import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Printer, Trash2, X, Flame } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import KpiCard from '../../components/KpiCard';
import PageNav from '../../components/PageNav';
import { formatDate } from '../../utils/formatters';
import SearchSelect from '../../components/SearchSelect';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// planned = info, in-progress = warning, complete = success, cancelled = neutral
const STATUS_VARIANT = {
  PLANNED:     'info',
  IN_PROGRESS: 'warning',
  TEMPERING:   'info',
  COMPLETED:   'success',
  CANCELLED:   'neutral',
};

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td hidden sm:table-cell"><Skeleton className="h-3.5 w-8 ml-auto" /></td>
    <td className="td hidden md:table-cell"><Skeleton className="h-3.5 w-14 ml-auto" /></td>
    <td className="td"><Skeleton className="h-5 w-20 rounded-full" /></td>
    <td className="td"><Skeleton className="h-3.5 w-20 ml-auto" /></td>
  </tr>
);

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

  const hasFilters = Boolean(furnaceId || status);

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">VHT Run Sheet</h1>
          <p className="page-subtitle">
            Actual furnace execution record (batch jobs, cycle parameters, graph, signatures).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild>
            <Link to="/manufacturing/runsheet/new">
              <Plus /> New Run Sheet
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
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

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 sm:w-52">
              <FilterLabel>Furnace</FilterLabel>
              <SearchSelect
                value={String(furnaceId || '')}
                onChange={v => { setPage(1); setFurnaceId(v); }}
                options={[{ value: '', label: 'All' }, ...(machines || []).map(m => ({ value: m.id, label: m.name || m.code }))]}
                placeholder="All"
                className="text-xs w-full"
              />
            </div>
            <div className="space-y-1">
              <FilterLabel htmlFor="runsheet-status-filter">Status</FilterLabel>
              <select
                id="runsheet-status-filter"
                value={status}
                onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                className="form-input text-xs sm:w-44"
              >
                <option value="">All</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setPage(1); setFurnaceId(''); setStatus(''); }}
                className="text-slate-500 hover:text-rose-600"
              >
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
                <th className="th">No.</th>
                <th className="th">Date</th>
                <th className="th hidden sm:table-cell">Furnace</th>
                <th className="th hidden sm:table-cell text-right">Jobs</th>
                <th className="th hidden md:table-cell text-right">Total Wt (kg)</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Flame className="h-5 w-5 text-amber-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {hasFilters ? 'No run sheets match your filters.' : 'No run sheets yet.'}
                      </p>
                      {!hasFilters && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/manufacturing/runsheet/new">
                            <Plus /> Create first run sheet
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="tr">
                  <td className="td">
                    <Link
                      to={`/manufacturing/runsheet/${r.id}`}
                      className="font-bold text-sky-800 hover:text-sky-950 hover:underline font-mono"
                    >
                      {r.runsheetNumber}
                    </Link>
                  </td>
                  <td className="td text-slate-500 whitespace-nowrap">{formatDate(r.runDate)}</td>
                  <td className="td text-slate-700 font-medium hidden sm:table-cell">{r.furnace?.name || r.furnace?.code || '—'}</td>
                  <td className="td text-slate-600 hidden sm:table-cell text-right tabular-nums">{r.items?.length || 0}</td>
                  <td className="td font-semibold text-slate-700 hidden md:table-cell text-right tabular-nums">{totalWt(r.items).toFixed(2)}</td>
                  <td className="td">
                    <Badge variant={STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700">
                        <Link
                          to={`/manufacturing/runsheet/${r.id}/print`}
                          target="_blank"
                          rel="noreferrer"
                          title="Print"
                          aria-label={`Print run sheet ${r.runsheetNumber}`}
                        >
                          <Printer />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon-sm" asChild
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Link
                          to={`/manufacturing/runsheet/${r.id}`}
                          title="Edit"
                          aria-label={`Edit run sheet ${r.runsheetNumber}`}
                        >
                          <Pencil />
                        </Link>
                      </Button>
                      {isManager && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setConfirmDelete(r)}
                          title="Delete"
                          aria-label={`Delete run sheet ${r.runsheetNumber}`}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
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
          <PageNav page={page} totalPages={totalPages} total={total} limit={limit} setPage={setPage} />
        )}
      </div>

      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-rose-600" />
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
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1 border border-slate-200">
                  Cancel
                </Button>
                <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting} loading={deleting} className="flex-1">
                  {!deleting && <Trash2 />} {deleting ? 'Deleting…' : 'Delete'}
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
