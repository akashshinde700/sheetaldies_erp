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
      'DRAFT': 'bg-gray-100 text-gray-800',
      'READY': 'bg-blue-100 text-blue-800',
      'DISPATCHED': 'bg-green-100 text-green-800',
      'DELIVERED': 'bg-purple-100 text-purple-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Dispatch Challans</h1>
          <Link
            to="/dispatch/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={20} /> New Challan
          </Link>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="READY">Ready</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center gap-2">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search challan no or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredChallans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No challans found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-3 text-left font-semibold">Challan No</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Items</th>
                  <th className="px-4 py-3 text-left font-semibold">Dispatch Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChallans.map((challan) => (
                  <tr key={challan.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{challan.challanNo}</td>
                    <td className="px-4 py-3">{challan.customerName || '-'}</td>
                    <td className="px-4 py-3 text-sm">{challan.itemCount || 0} items</td>
                    <td className="px-4 py-3">
                      {challan.dispatchDate ? new Date(challan.dispatchDate).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(challan.status)}`}>
                        {challan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      <Link
                        to={`/dispatch/${challan.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                      >
                        <Eye size={18} />
                      </Link>
                      <Link
                        to={`/dispatch/${challan.id}/edit`}
                        className="p-2 text-yellow-600 hover:bg-yellow-100 rounded"
                      >
                        <Edit2 size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(challan.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
