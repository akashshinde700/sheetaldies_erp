import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';

export default function DispatchChallanList() {
  const [challans, setChallans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'all' });

  useEffect(() => {
    fetchChallans();
  }, [filters, searchTerm]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dispatch-challans', {
        params: {
          ...(filters.status !== 'all' ? { status: filters.status } : {}),
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        }
      });
      setChallans(response.data.data || []);
    } catch (error) {
      console.error('Error fetching challans:', error);
      toast.error('Failed to load dispatch challans.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      await api.delete(`/dispatch-challans/${id}`);
      toast.success('Dispatch challan deleted.');
      fetchChallans();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete dispatch challan.');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-800',
      SENT: 'bg-sky-100 text-sky-900',
      RECEIVED: 'bg-emerald-100 text-emerald-900',
      COMPLETED: 'bg-violet-100 text-violet-900',
      CANCELLED: 'bg-rose-100 text-rose-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
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
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="th text-left">Challan</th>
                  <th className="th text-left">From / To</th>
                  <th className="th text-left">Items</th>
                  <th className="th text-left">Dispatch</th>
                  <th className="th text-left">Status</th>
                  <th className="th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {challans.map((challan) => (
                  <tr key={challan.id} className="tr">
                    <td className="td font-semibold text-slate-800">{challan.challanNo}</td>
                    <td className="td">
                      {(challan.fromParty?.name || '—')} {'->'} {(challan.toParty?.name || '—')}
                    </td>
                    <td className="td text-slate-600">{challan.itemCount || 0} items</td>
                    <td className="td text-slate-600">
                      {formatDate(challan.challanDate)}
                    </td>
                    <td className="td">
                      <span className={`badge ${getStatusColor(challan.status)}`}>{challan.status}</span>
                    </td>
                    <td className="td">
                      <div className="flex justify-center gap-1">
                        <Link to={`/dispatch/${challan.id}`} className="p-2 rounded-lg text-sky-800 hover:bg-sky-50" aria-label="View">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </Link>
                        <Link to={`/dispatch/${challan.id}`} className="p-2 rounded-lg text-amber-700 hover:bg-amber-50" aria-label="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                        <button type="button" onClick={() => handleDelete(challan.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
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
    </div>
  );
}
