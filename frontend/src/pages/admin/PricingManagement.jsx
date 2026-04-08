import { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const EMPTY = {
  code: '',
  name: '',
  description: '',
  hsnSacCode: '',
  pricePerKg: '',
  pricePerPc: '',
  minCharge: '',
  gstRate: '18.00',
};

export default function PricingManagement() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/pricing')
      .then((r) => setProcesses(r.data.data || r.data || []))
      .catch(() => toast.error('Failed to load process types.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = processes.filter((p) => {
    const term = search.toLowerCase();
    return !term || p.name?.toLowerCase().includes(term) || p.code?.toLowerCase().includes(term);
  });

  const set = (k, v) => setFormData((prev) => ({ ...prev, [k]: v }));

  const openNew = () => {
    setFormData({ ...EMPTY });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      hsnSacCode: item.hsnSacCode || '',
      pricePerKg: item.pricePerKg ?? '',
      pricePerPc: item.pricePerPc ?? '',
      minCharge: item.minCharge ?? '',
      gstRate: item.gstRate ?? '18.00',
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({ ...EMPTY });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast.error('Code and Name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        hsnSacCode: formData.hsnSacCode || null,
        pricePerKg: formData.pricePerKg !== '' ? parseFloat(formData.pricePerKg) : null,
        pricePerPc: formData.pricePerPc !== '' ? parseFloat(formData.pricePerPc) : null,
        minCharge: formData.minCharge !== '' ? parseFloat(formData.minCharge) : null,
        gstRate: formData.gstRate !== '' ? parseFloat(formData.gstRate) : 18.0,
      };

      if (editId) {
        await api.put(`/pricing/${editId}`, payload);
        toast.success('Process type updated.');
      } else {
        await api.post('/pricing', { code: formData.code, ...payload });
        toast.success('Process type created.');
      }
      cancelForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving process type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete process "${item.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/pricing/${item.id}`);
      toast.success(`"${item.name}" deleted.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/pricing/${item.id}`, { ...item, isActive: !item.isActive });
      toast.success(`${item.name} ${item.isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch {
      toast.error('Error toggling status.');
    }
  };

  const fmt = (v) => {
    if (v === null || v === undefined || v === '') return '-';
    return `Rs. ${parseFloat(v).toFixed(2)}`;
  };

  return (
    <div className="space-y-5 max-w-6xl animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Pricing Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage process types, HSN/SAC codes, and pricing rates</p>
        </div>
        <button onClick={() => (showForm ? cancelForm() : openNew())} className="btn-primary">
          <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'Add Process'}
        </button>
      </div>

      {showForm && (
        <div className="card border-2 border-indigo-200 p-5">
          <h3 className="text-sm font-extrabold text-slate-700 mb-4">{editId ? 'Edit Process Type' : 'Create New Process Type'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Code *</label>
              <input
                value={formData.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                required
                disabled={!!editId}
                className={`form-input ${editId ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                placeholder="e.g. HT"
              />
            </div>
            <div>
              <label className="form-label">Name *</label>
              <input value={formData.name} onChange={(e) => set('name', e.target.value)} required className="form-input" />
            </div>
            <div>
              <label className="form-label">HSN/SAC Code</label>
              <input value={formData.hsnSacCode} onChange={(e) => set('hsnSacCode', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">GST Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.gstRate}
                onChange={(e) => set('gstRate', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="sm:col-span-2 md:col-span-4">
              <label className="form-label">Description</label>
              <input value={formData.description} onChange={(e) => set('description', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Price per KG</label>
              <input type="number" step="0.01" min="0" value={formData.pricePerKg} onChange={(e) => set('pricePerKg', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Price per PC</label>
              <input type="number" step="0.01" min="0" value={formData.pricePerPc} onChange={(e) => set('pricePerPc', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Minimum Charge</label>
              <input type="number" step="0.01" min="0" value={formData.minCharge} onChange={(e) => set('minCharge', e.target.value)} className="form-input" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={cancelForm} className="btn-outline">
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by process code or name..."
            className="form-input"
          />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No process types found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">HSN/SAC</th>
                  <th className="text-left px-4 py-3">Per KG</th>
                  <th className="text-left px-4 py-3">Per PC</th>
                  <th className="text-left px-4 py-3">Min Charge</th>
                  <th className="text-left px-4 py-3">GST</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-semibold">{p.code}</td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{p.hsnSacCode || '-'}</td>
                    <td className="px-4 py-3">{fmt(p.pricePerKg)}</td>
                    <td className="px-4 py-3">{fmt(p.pricePerPc)}</td>
                    <td className="px-4 py-3">{fmt(p.minCharge)}</td>
                    <td className="px-4 py-3">{p.gstRate ?? 18}%</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(p)} className={`px-2 py-1 rounded text-xs ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="btn-outline">Edit</button>
                        <button onClick={() => handleDelete(p)} className="btn-danger">Delete</button>
                      </div>
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
