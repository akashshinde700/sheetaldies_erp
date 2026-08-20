import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';

const EMPTY_FORM = { name: '', sortOrder: '0' };

export default function HeatTreatSpecList() {
  const [specs, setSpecs]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [showAll, setShowAll]   = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => { fetchSpecs(); }, [showAll]);

  const fetchSpecs = async () => {
    setLoading(true);
    try {
      const r = await api.get('/heat-treat-specs', { params: { all: showAll ? 'true' : undefined } });
      setSpecs(r.data.data || []);
    } catch {
      toast.error('Failed to load heat treatment specs.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setForm({ name: s.name || '', sortOrder: String(s.sortOrder ?? 0) });
    setEditingId(s.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), sortOrder: Number(form.sortOrder) || 0 };
      if (editingId) {
        await api.put(`/heat-treat-specs/${editingId}`, payload);
        toast.success('Spec updated.');
      } else {
        await api.post('/heat-treat-specs', payload);
        toast.success('Spec added.');
      }
      closeForm();
      fetchSpecs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s) => {
    try {
      await api.patch(`/heat-treat-specs/${s.id}/toggle`);
      toast.success(s.isActive ? 'Deactivated.' : 'Activated.');
      fetchSpecs();
    } catch {
      toast.error('Toggle failed.');
    }
  };

  const handleDelete = (s) => {
    setConfirmDialog({
      title: 'Delete spec?',
      message: `Delete "${s.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/heat-treat-specs/${s.id}`);
          toast.success('Deleted.');
          fetchSpecs();
        } catch {
          toast.error('Delete failed.');
        } finally { setConfirmDialog(null); }
      },
    });
  };

  const filtered = specs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Heat Treatment Specs</h1>
          <p className="text-xs text-slate-500">Options shown in the Heat Treatment Specification dropdown</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-base">add</span> Add Spec
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ListSearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search specs..." />
        <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-10">No specs found.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {filtered.map(s => (
            <div key={s.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${!s.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] text-slate-400 w-6 text-right">{s.sortOrder}</span>
                <span className="font-semibold text-slate-800 text-sm truncate">{s.name}</span>
                {!s.isActive && <span className="badge-inactive text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">Inactive</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="icon-btn" title="Edit">
                  <span className="material-symbols-outlined text-base">edit</span>
                </button>
                <button onClick={() => handleToggle(s)} className="icon-btn" title={s.isActive ? 'Deactivate' : 'Activate'}>
                  <span className="material-symbols-outlined text-base">{s.isActive ? 'toggle_on' : 'toggle_off'}</span>
                </button>
                <button onClick={() => handleDelete(s)} className="icon-btn text-red-400 hover:text-red-600" title="Delete">
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">{editingId ? 'Edit Spec' : 'Add Spec'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="form-label">Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="form-input"
                  placeholder="e.g. HARDEN AND TEMPER"
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(p => ({ ...p, sortOrder: e.target.value }))}
                  className="form-input"
                  placeholder="0"
                />
                <p className="text-xs text-slate-400 mt-1">Lower number appears first in dropdown</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
                </button>
                <button type="button" onClick={closeForm} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
