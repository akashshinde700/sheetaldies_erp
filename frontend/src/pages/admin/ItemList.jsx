import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import api from '../../utils/api';

const emptyForm = () => ({
  partNo: '',
  description: '',
  unit: 'NOS',
  hsnCode: '',
  drawingNo: '',
  material: '',
  weightKg: '',
});

export default function ItemList() {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/items', {
        params: debouncedSearch ? { search: debouncedSearch } : {},
      });
      setItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.partNo.trim()) {
      alert('Part number is required');
      return;
    }

    const payload = {
      ...formData,
      weightKg: formData.weightKg === '' || formData.weightKg == null ? undefined : formData.weightKg,
    };

    try {
      if (editingId) {
        await api.put(`/items/${editingId}`, payload);
        alert('Item updated successfully');
      } else {
        await api.post('/items', payload);
        alert('Item created successfully');
      }
      setFormData(emptyForm());
      setEditingId(null);
      setShowForm(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      partNo: item.partNo || '',
      description: item.description || '',
      unit: item.unit || 'NOS',
      hsnCode: item.hsnCode || '',
      drawingNo: item.drawingNo || '',
      material: item.material || '',
      weightKg: item.weightKg != null ? String(item.weightKg) : '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/items/${id}`);
      alert('Item deleted');
      fetchItems();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Items</h1>
          <p className="page-subtitle">Parts, units, and HSN</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            if (editingId) {
              setEditingId(null);
              setFormData(emptyForm());
            }
          }}
          className="btn-primary shrink-0 inline-flex items-center gap-2"
        >
          <Plus size={20} /> Add item
        </button>
      </div>

      {showForm && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 font-headline mb-4">{editingId ? 'Edit item' : 'New item'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Part no *" value={formData.partNo} onChange={(e) => setFormData({ ...formData, partNo: e.target.value })} className="form-input" required />
            <input type="text" placeholder="Unit (default NOS)" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="form-input" />
            <input type="text" placeholder="Drawing no." value={formData.drawingNo} onChange={(e) => setFormData({ ...formData, drawingNo: e.target.value })} className="form-input" />
            <input type="text" placeholder="Material" value={formData.material} onChange={(e) => setFormData({ ...formData, material: e.target.value })} className="form-input" />
            <input type="text" placeholder="Weight (kg)" value={formData.weightKg} onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })} className="form-input" />
            <input type="text" placeholder="HSN code" value={formData.hsnCode} onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })} className="form-input" />
            <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="form-input col-span-1 md:col-span-2 min-h-[88px]" rows={3} />
            <div className="col-span-1 md:col-span-2 flex flex-wrap gap-2">
              <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormData(emptyForm()); }} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input type="text" placeholder="Search items…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 form-input border-0 bg-transparent shadow-none focus:ring-0" />
        </div>
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No items found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="th text-left sticky left-0 z-[1] bg-slate-50/95 backdrop-blur-sm shadow-[4px_0_12px_-8px_rgba(15,23,42,0.25)]">Part no</th>
                  <th className="th text-left">Drawing</th>
                  <th className="th text-left">Material</th>
                  <th className="th text-left">Wt (kg)</th>
                  <th className="th text-left">Unit</th>
                  <th className="th text-left">HSN</th>
                  <th className="th text-left">Description</th>
                  <th className="th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="tr group">
                    <td className="td font-semibold text-slate-800 sticky left-0 z-[1] bg-white group-hover:bg-slate-50/80 shadow-[4px_0_12px_-8px_rgba(15,23,42,0.12)]">{item.partNo}</td>
                    <td className="td font-mono text-xs text-slate-600">{item.drawingNo || '—'}</td>
                    <td className="td text-slate-600">{item.material || '—'}</td>
                    <td className="td text-slate-600">{item.weightKg != null ? item.weightKg : '—'}</td>
                    <td className="td">{item.unit || '—'}</td>
                    <td className="td font-mono text-slate-600">{item.hsnCode || '—'}</td>
                    <td className="td text-slate-600 max-w-[200px] truncate" title={item.description}>{item.description || '—'}</td>
                    <td className="td">
                      <div className="flex justify-center gap-1">
                        <button type="button" onClick={() => handleEdit(item)} className="p-2 rounded-lg text-sky-800 hover:bg-sky-50" aria-label="Edit"><Edit2 size={18} /></button>
                        <button type="button" onClick={() => handleDelete(item.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Delete"><Trash2 size={18} /></button>
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
