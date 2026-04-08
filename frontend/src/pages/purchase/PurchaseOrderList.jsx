import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, FileText } from 'lucide-react';
import api from '../../utils/api';

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    vendorId: '',
    expectedDelivery: '',
    remarks: '',
    items: [{ itemId: '', quantity: '', unitPrice: '', description: '' }],
  });

  useEffect(() => {
    fetchPOs();
    fetchVendors();
  }, []);

  const fetchPOs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchase?search=' + searchTerm);
      setOrders(response.data.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load POs');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await api.get('/parties?type=VENDOR');
      setVendors(response.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendorId || formData.items.some(i => !i.itemId || !i.quantity)) {
      alert('Fill all required fields');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/purchase/${editingId}`, formData);
        alert('PO updated');
      } else {
        await api.post('/purchase', formData);
        alert('PO created');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ vendorId: '', expectedDelivery: '', remarks: '', items: [{ itemId: '', quantity: '', unitPrice: '', description: '' }] });
      fetchPOs();
    } catch (error) {
      alert('Failed to save PO');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this PO?')) return;
    try {
      await api.delete(`/purchase/${id}`);
      alert('PO deleted');
      fetchPOs();
    } catch (error) {
      alert('Failed to delete');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={20} /> New PO
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit PO' : 'New Purchase Order'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="px-4 py-2 border rounded"
                  required
                >
                  <option value="">Select Vendor *</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <input type="date" value={formData.expectedDelivery} onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })} className="px-4 py-2 border rounded" />
              </div>
              <textarea
                placeholder="Remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-4 py-2 border rounded"
              />
              <div className="space-y-2">
                <h3 className="font-bold">Items</h3>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <input placeholder="Item ID" value={item.itemId} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].itemId = e.target.value; setFormData({ ...formData, items: newItems }); }} className="px-2 py-2 border rounded" />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].quantity = e.target.value; setFormData({ ...formData, items: newItems }); }} className="px-2 py-2 border rounded" />
                    <input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].unitPrice = e.target.value; setFormData({ ...formData, items: newItems }); }} className="px-2 py-2 border rounded" />
                    <button type="button" onClick={() => { const newItems = formData.items.filter((_, i) => i !== idx); setFormData({ ...formData, items: newItems }); }} className="px-2 py-2 bg-red-500 text-white rounded">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { itemId: '', quantity: '', unitPrice: '', description: '' }] })} className="px-4 py-2 bg-green-500 text-white rounded">+ Add Item</button>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-400 text-white rounded">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center gap-2">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search POs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyUp={fetchPOs}
              className="flex-1 px-3 py-2 border rounded"
            />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">PO No</th>
                <th className="px-4 py-2 text-left">Vendor</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-left">Expected Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(po => (
                <tr key={po.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold">{po.poNumber}</td>
                  <td className="px-4 py-2">{po.vendor?.name}</td>
                  <td className="px-4 py-2 text-right">₹{po.totalAmount?.toFixed(2)}</td>
                  <td className="px-4 py-2">{new Date(po.expectedDelivery).toLocaleDateString()}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs ${po.status === 'DRAFT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{po.status}</span></td>
                  <td className="px-4 py-2 text-center flex gap-2 justify-center">
                    <button onClick={() => { setEditingId(po.id); setFormData(po); setShowForm(true); }} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(po.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
