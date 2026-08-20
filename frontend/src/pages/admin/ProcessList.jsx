import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  code: '', name: '', description: '', hsnSacCode: '', tallyStockItem: '',
  pricePerKg: '', pricePerPc: '', lotPrice: '', gstRate: '18',
};


export default function ProcessList() {
  const [processes, setProcesses]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [showAll, setShowAll]       = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => { fetchProcesses(); }, [showAll]);
  useEffect(() => { setPage(1); }, [search]);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const r = await api.get('/processes', { params: { all: showAll ? 'true' : undefined, limit: 500 } });
      setProcesses(r.data.data || []);
    } catch {
      toast.error('Failed to load processes.');
    } finally {
      setLoading(false);
    }
  };

  const nextCode = () => {
    const maxNumeric = processes.reduce((max, p) => {
      const n = Number(p.code);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return String(maxNumeric + 1);
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, code: nextCode() });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      code:        p.code        || '',
      name:        p.name        || '',
      description: p.description || '',
      hsnSacCode:  p.hsnSacCode  || '',
      tallyStockItem: p.tallyStockItem || '',
      pricePerKg:  p.pricePerKg  != null ? String(p.pricePerKg)  : '',
      pricePerPc:  p.pricePerPc  != null ? String(p.pricePerPc)  : '',
      lotPrice:    p.lotPrice    != null ? String(p.lotPrice)    : '',
      gstRate:     p.gstRate     != null ? String(p.gstRate)     : '18',
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and Name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code:        form.code.trim().toUpperCase(),
        name:        form.name.trim(),
        description: form.description.trim() || null,
        hsnSacCode:  form.hsnSacCode.trim()  || null,
        tallyStockItem: form.tallyStockItem.trim() || null,
        pricePerKg:  form.pricePerKg  !== '' ? Number(form.pricePerKg)  : null,
        pricePerPc:  form.pricePerPc  !== '' ? Number(form.pricePerPc)  : null,
        lotPrice:    form.lotPrice    !== '' ? Number(form.lotPrice)    : null,
        gstRate:     form.gstRate     !== '' ? Number(form.gstRate)     : 18,
      };
      if (editingId) {
        await api.put(`/processes/${editingId}`, payload);
        toast.success('Process updated.');
      } else {
        await api.post('/processes', payload);
        toast.success('Process created.');
      }
      closeForm();
      fetchProcesses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await api.patch(`/processes/${p.id}/toggle`);
      toast.success(p.isActive ? 'Process deactivated.' : 'Process activated.');
      fetchProcesses();
    } catch {
      toast.error('Failed to toggle status.');
    }
  };

  const handleDelete = (p) => {
    setConfirmDialog({
      title: 'Delete process?',
      message: `Delete "${p.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/processes/${p.id}`);
          toast.success('Process deleted.');
          fetchProcesses();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete.');
        } finally { setConfirmDialog(null); }
      },
    });
  };

  const filtered = processes.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.hsnSacCode?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-stack w-full space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Process Types</h1>
          <p className="page-subtitle">Heat treatment process master — rates used in inwards and invoicing</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary shrink-0 inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span> Add Process
        </button>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 font-headline mb-5">
            {editingId ? 'Edit process' : 'New process'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Code <span className="text-rose-500">*</span></label>
                <input
                  className="form-input font-mono"
                  placeholder="e.g. HRD"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label">Name <span className="text-rose-500">*</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. Hardening"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label">HSN / SAC Code</label>
                <input
                  className="form-input"
                  placeholder="e.g. 9988"
                  value={form.hsnSacCode}
                  onChange={(e) => setForm((f) => ({ ...f, hsnSacCode: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Tally Stock Item</label>
                <input
                  className={`form-input ${form.tallyStockItem ? 'border-violet-300 bg-violet-50/40' : ''}`}
                  placeholder={form.name || 'Tally me jo stock item hai'}
                  value={form.tallyStockItem}
                  onChange={(e) => setForm((f) => ({ ...f, tallyStockItem: e.target.value }))}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Khali chhodo to upar wala process naam hi Tally me jayega. Tally me is process ka
                  stock item kisi aur naam se hai to wahi yahan likho — <strong>bilkul waisa hi</strong>.
                  Tally import pe stock item khud nahi banata.
                </p>
                {form.tallyStockItem && form.tallyStockItem.trim() !== form.name.trim() && (
                  <p className="text-[10px] text-violet-600 mt-0.5">
                    Invoice pe: <strong>{form.name || '—'}</strong> · Tally me: <strong>{form.tallyStockItem.trim()}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">GST Rate (%)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="18"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.gstRate}
                  onChange={(e) => setForm((f) => ({ ...f, gstRate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                className="form-input resize-none"
                rows={2}
                placeholder="Optional notes about this process…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <ListSearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code, name, HSN…"
          className="flex-1"
        />
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="accent-sky-600 h-4 w-4 rounded"
          />
          Show inactive
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>
        ) : paged.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No processes found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="th text-center w-20">Code</th>
                  <th className="th">Name</th>
                  <th className="th text-center">Status</th>
                  <th className="th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((p) => (
                  <tr key={p.id} className={`tr ${!p.isActive ? 'opacity-50' : ''}`}>
                    <td className="td text-center font-mono font-semibold text-slate-500">{p.code}</td>
                    <td className="td font-medium">
                      {p.name}
                      {p.description && (
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{p.description}</p>
                      )}
                    </td>
                    <td className="td text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          title="Edit"
                          aria-label={`Edit process ${p.name}`}
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-lg text-sky-700 hover:bg-sky-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          title={p.isActive ? 'Deactivate' : 'Activate'}
                          aria-label={`${p.isActive ? 'Deactivate' : 'Activate'} process ${p.name}`}
                          onClick={() => handleToggle(p)}
                          className="p-2 rounded-lg text-amber-600 hover:bg-amber-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {p.isActive ? 'toggle_on' : 'toggle_off'}
                          </span>
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          aria-label={`Delete process ${p.name}`}
                          onClick={() => handleDelete(p)}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                        >
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

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline text-xs disabled:opacity-40">Prev</button>
              <span className="text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-outline text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Party-specific rate overrides are set per party in <strong>Party Details → Process Rates</strong>.
        The rates here are global defaults.
      </p>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
