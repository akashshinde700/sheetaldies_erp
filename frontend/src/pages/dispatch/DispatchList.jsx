import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function DispatchChallanList() {
  const [challans, setChallans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'all' });

  useEffect(() => {
    fetchChallans();
  }, [filters]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dispatch-challans', {
        params: filters.status !== 'all' ? { status: filters.status } : {}
      });
      setChallans(response.data.data || []);
    } catch (error) {
      console.error('Error fetching challans:', error);
      alert('Failed to load dispatch challans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      await api.delete(`/dispatch-challans/${id}`);
      alert('Dispatch challan deleted');
      fetchChallans();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  const filteredChallans = challans.filter(challan =>
    challan.challanNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    challan.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-800',
      READY: 'bg-sky-100 text-sky-900',
      DISPATCHED: 'bg-emerald-100 text-emerald-900',
      DELIVERED: 'bg-violet-100 text-violet-900',
      CANCELLED: 'bg-rose-100 text-rose-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-6 animate-slide-up w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Dispatch challans</h1>
          <p className="page-subtitle">Outward delivery documents</p>
        </div>
        <Link to="/dispatch/new" className="btn-primary shrink-0 inline-flex items-center justify-center gap-2">
          <Plus size={20} /> New challan
        </Link>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <label className="sr-only" htmlFor="dispatch-status-filter">Status</label>
        <select
          id="dispatch-status-filter"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="form-input w-auto min-w-[12rem]"
        >
          <option value="all">All status</option>
          <option value="DRAFT">Draft</option>
          <option value="READY">Ready</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Challan no or customer…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 form-input border-0 bg-transparent shadow-none focus:ring-0"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
        ) : filteredChallans.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No challans found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="th text-left">Challan</th>
                  <th className="th text-left">Customer</th>
                  <th className="th text-left">Items</th>
                  <th className="th text-left">Dispatch</th>
                  <th className="th text-left">Status</th>
                  <th className="th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChallans.map((challan) => (
                  <tr key={challan.id} className="tr">
                    <td className="td font-semibold text-slate-800">{challan.challanNo}</td>
                    <td className="td">{challan.customerName || '—'}</td>
                    <td className="td text-slate-600">{challan.itemCount || 0} items</td>
                    <td className="td text-slate-600">
                      {challan.dispatchDate ? new Date(challan.dispatchDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="td">
                      <span className={`badge ${getStatusColor(challan.status)}`}>{challan.status}</span>
                    </td>
                    <td className="td">
                      <div className="flex justify-center gap-1">
                        <Link to={`/dispatch/${challan.id}`} className="p-2 rounded-lg text-sky-800 hover:bg-sky-50" aria-label="View">
                          <Eye size={18} />
                        </Link>
                        <Link to={`/dispatch/${challan.id}/edit`} className="p-2 rounded-lg text-amber-700 hover:bg-amber-50" aria-label="Edit">
                          <Edit2 size={18} />
                        </Link>
                        <button type="button" onClick={() => handleDelete(challan.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Delete">
                          <Trash2 size={18} />
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
