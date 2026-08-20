import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import KpiCard from '../../components/KpiCard';
import { formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function DispatchChallanList() {
  const [challans, setChallans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'all' });
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchChallans = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dispatch-challans', {
          signal: controller.signal,
          params: {
            ...(filters.status !== 'all' ? { status: filters.status } : {}),
            ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
          }
        });
        setChallans(response.data.data || []);
      } catch (error) {
        if (error?.name !== 'CanceledError') toast.error('Failed to load dispatch challans.');
      } finally {
        setLoading(false);
      }
    };
    fetchChallans();
    return () => controller.abort();
  }, [filters, searchTerm]);

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'Delete dispatch challan?',
      message: 'This will permanently delete this dispatch challan.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/dispatch-challans/${id}`);
          toast.success('Dispatch challan deleted.');
          setChallans(prev => prev.filter(c => c.id !== id));
        } catch (error) {
          toast.error(error?.response?.data?.message || 'Failed to delete dispatch challan.');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT:     'bg-slate-100 text-slate-700',
      SENT:      'bg-blue-100 text-blue-800',
      RECEIVED:  'bg-amber-100 text-amber-800',
      COMPLETED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-rose-100 text-rose-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="page-stack w-full space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Dispatch Challans</h1>
          <p className="page-subtitle">Outward delivery documents</p>
        </div>
        <Link to="/dispatch/new" className="btn-primary shrink-0 inline-flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span> New Challan
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Dispatch challans"
          value={challans.length}
          sub="Loaded records"
          icon="local_shipping"
          iconBg="bg-amber-100 text-amber-700"
        />
        <KpiCard
          label="Completed"
          value={challans.filter(c => c.status === 'COMPLETED').length}
          sub="Finished deliveries"
          icon="task_alt"
          iconBg="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Sent"
          value={challans.filter(c => c.status === 'SENT').length}
          sub="Outbound challans"
          icon="schedule"
          iconBg="bg-blue-100 text-blue-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
            <ListSearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Challan no or customer..."
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="dispatch-status-filter">Status</label>
            <select
              id="dispatch-status-filter"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="form-input text-xs w-auto min-w-[180px]"
            >
              <option value="all">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="RECEIVED">Received</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          {(searchTerm || filters.status !== 'all') ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilters({ status: 'all' });
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-sm">close</span> Clear
            </button>
          ) : <div />}
      </div>

      <div className="card overflow-hidden">

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
        ) : challans.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No challans found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[420px]">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="th text-left">Challan</th>
                  <th className="th text-left">From / To</th>
                  <th className="th text-left hidden sm:table-cell">Items</th>
                  <th className="th text-left hidden sm:table-cell">Dispatch</th>
                  <th className="th text-left">Status</th>
                  <th className="th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {challans.map((challan) => (
                  <tr key={challan.id} className="tr">
                    <td className="td font-semibold text-slate-800">{challan.challanNo}</td>
                    <td className="td text-xs">
                      <div className="font-semibold text-slate-800 truncate max-w-[120px]">{challan.fromParty?.name || '—'}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">↓ to: {challan.toParty?.name || '—'}</div>
                    </td>
                    <td className="td text-slate-600 hidden sm:table-cell">{challan.itemCount || 0} items</td>
                    <td className="td text-slate-500">
                      {formatDate(challan.challanDate)}
                    </td>
                    <td className="td">
                      <span className={`badge ${getStatusColor(challan.status)}`}>{challan.status}</span>
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1.5">
                        <Link to={`/dispatch/${challan.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100">
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          View
                        </Link>
                        <Link to={`/dispatch/${challan.id}/print`} target="_blank"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100">
                          <span className="material-symbols-outlined text-[14px]">print</span>
                          Print
                        </Link>
                        <button type="button" onClick={() => handleDelete(challan.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
