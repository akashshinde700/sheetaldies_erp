import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, FileText } from 'lucide-react';
import api from '../../utils/api';

function formatCurrency2(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

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
    <div className="page-stack">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Vendors, amounts, and PO status</p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary shrink-0">
          <Plus size={20} /> New PO
        </button>
      </div>

      {showForm && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 font-headline mb-4">{editingId ? 'Edit PO' : 'New Purchase Order'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Vendor</label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="form-input"
                  required
                >
                  <option value="">Select vendor *</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Expected delivery</label>
                <input type="date" value={formData.expectedDelivery} onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })} className="form-input" />
              </div>
            </div>
            <div>
              <label className="form-label">Remarks</label>
              <textarea
                placeholder="Remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="form-input min-h-[88px]"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Line items</h3>
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <input placeholder="Item ID" value={item.itemId} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].itemId = e.target.value; setFormData({ ...formData, items: newItems }); }} className="form-input sm:col-span-4" />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].quantity = e.target.value; setFormData({ ...formData, items: newItems }); }} className="form-input sm:col-span-3" />
                  <input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].unitPrice = e.target.value; setFormData({ ...formData, items: newItems }); }} className="form-input sm:col-span-3" />
                  <button type="button" onClick={() => { const newItems = formData.items.filter((_, i) => i !== idx); setFormData({ ...formData, items: newItems }); }} className="btn-danger text-sm py-2 sm:col-span-2">Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { itemId: '', quantity: '', unitPrice: '', description: '' }] })} className="btn-outline text-sm">+ Add item</button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search POs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyUp={fetchPOs}
            className="flex-1 form-input border-0 bg-transparent shadow-none focus:ring-0"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200/80">
                <th className="th text-left">PO No</th>
                <th className="th text-left">Vendor</th>
                <th className="th text-right">Amount</th>
                <th className="th text-left">Expected</th>
                <th className="th text-left">Status</th>
                <th className="th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(po => (
                <tr key={po.id} className="tr">
                  <td className="td font-semibold text-slate-800">{po.poNumber}</td>
                  <td className="td">{po.vendor?.name}</td>
                  <td className="td text-right tabular-nums">₹{formatCurrency2(po.totalAmount)}</td>
                  <td className="td">{new Date(po.expectedDelivery).toLocaleDateString()}</td>
                  <td className="td"><span className={`badge ${po.status === 'DRAFT' ? 'bg-sky-100 text-sky-900' : 'bg-emerald-100 text-emerald-800'}`}>{po.status}</span></td>
                  <td className="td">
                    <div className="flex gap-2 justify-center">
                      <button type="button" onClick={() => { setEditingId(po.id); setFormData(po); setShowForm(true); }} className="p-2 rounded-lg text-sky-800 hover:bg-sky-50" aria-label="Edit"><Edit2 size={16} /></button>
                      <button type="button" onClick={() => handleDelete(po.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Delete"><Trash2 size={16} /></button>
                    </div>
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
