import { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import ListSearchInput from '../../components/ListSearchInput';
import SearchSelect from '../../components/SearchSelect';
import HeatCycleGraphPreview from '../../components/HeatCycleGraphPreview';
import { useProcesses } from '../../hooks/useMasterData';
import ConfirmDialog from '../../components/ConfirmDialog';

const PAGE_SIZE = 15;
const EMPTY_SEGMENT = () => ({ tempC: '', holdMin: '', label: '' });
const EMPTY_FORM = {
  name: '', material: '', processTypeId: '', description: '',
  isDefault: false, isActive: true,
  segments: [EMPTY_SEGMENT()],
};

export default function TempCycleGraphList() {
  const { data: processes = [] } = useProcesses();
  const [graphs, setGraphs]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [busyId, setBusyId]     = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchGraphs = async () => {
    setLoading(true);
    try {
      const r = await api.get('/quality/temp-cycle-templates', { params: { limit: 500 } });
      setGraphs(r.data.data || []);
    } catch {
      toast.error('Failed to load graphs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGraphs(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = async (g) => {
    try {
      const r = await api.get(`/quality/temp-cycle-templates/${g.id}`);
      const full = r.data.data;
      setForm({
        name: full.name || '',
        material: full.material || '',
        processTypeId: full.processTypeId ? String(full.processTypeId) : '',
        description: full.description || '',
        isDefault: full.isDefault,
        isActive: full.isActive,
        segments: (full.data || []).length ? full.data.map(s => ({ ...s })) : [EMPTY_SEGMENT()],
      });
      setEditingId(g.id);
      setShowForm(true);
    } catch {
      toast.error('Failed to load graph details.');
    }
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const updateSegment = (i, field, val) => {
    setForm(f => {
      const segments = [...f.segments];
      segments[i] = { ...segments[i], [field]: val };
      return { ...f, segments };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Graph Name is required.'); return; }
    const validSegments = form.segments.filter(s => s.tempC !== '' && s.tempC !== null);
    if (!validSegments.length) { toast.error('Add at least one point (Temperature required).'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        material: form.material.trim() || null,
        processTypeId: form.processTypeId || null,
        description: form.description.trim() || null,
        isDefault: form.isDefault,
        isActive: form.isActive,
        data: validSegments,
      };
      if (editingId) {
        await api.put(`/quality/temp-cycle-templates/${editingId}`, payload);
        toast.success('Graph updated.');
      } else {
        await api.post('/quality/temp-cycle-templates', payload);
        toast.success('Graph created.');
      }
      closeForm();
      fetchGraphs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save graph.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (g) => {
    setBusyId(g.id);
    try {
      await api.post(`/quality/temp-cycle-templates/${g.id}/duplicate`);
      toast.success(`Duplicated "${g.name}".`);
      fetchGraphs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate.');
    } finally { setBusyId(null); }
  };

  const handleSetDefault = async (g) => {
    setBusyId(g.id);
    try {
      await api.patch(`/quality/temp-cycle-templates/${g.id}/set-default`);
      toast.success(`"${g.name}" set as default${g.processType ? ` for ${g.processType.name}` : ''}.`);
      fetchGraphs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set default.');
    } finally { setBusyId(null); }
  };

  const handleDelete = (g) => {
    setConfirmDialog({
      title: 'Delete graph?',
      message: `Delete graph "${g.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setBusyId(g.id);
        try {
          await api.delete(`/quality/temp-cycle-templates/${g.id}`);
          toast.success('Graph deleted.');
          fetchGraphs();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete.');
        } finally { setBusyId(null); setConfirmDialog(null); }
      },
    });
  };

  const filtered = graphs.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.material?.toLowerCase().includes(search.toLowerCase()) ||
    g.processType?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-stack w-full space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Temperature Cycle Graphs</h1>
          <p className="page-subtitle">Reusable heat-treatment graph master — used by Certificates &amp; VHT Run Sheets</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary shrink-0 inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span> Create Graph
        </button>
      </div>

      {showForm && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 font-headline mb-5">
            {editingId ? 'Edit graph' : 'New graph'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Graph Name <span className="text-rose-500">*</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. D2 Hardening"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label">Material</label>
                <input
                  className="form-input"
                  placeholder="e.g. D2"
                  value={form.material}
                  onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Process</label>
                <SearchSelect
                  value={form.processTypeId}
                  onChange={(v) => setForm((f) => ({ ...f, processTypeId: v }))}
                  options={processes.map(p => ({ value: p.id, label: p.name }))}
                  placeholder="— None —"
                  useFixed
                />
              </div>
              <div className="flex items-end gap-5 pb-1.5">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="accent-sky-600 h-4 w-4 rounded"
                  />
                  Active
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                    className="accent-emerald-600 h-4 w-4 rounded"
                  />
                  Set as Default{form.processTypeId ? '' : ' (general)'}
                </label>
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                className="form-input resize-none"
                rows={2}
                placeholder="Optional notes…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">Graph Points</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, segments: [...f.segments, EMPTY_SEGMENT()] }))}
                  className="btn-secondary text-xs px-3 py-1.5">
                  <span className="material-symbols-outlined text-sm">add</span> Add Point
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="px-2 py-2 w-8 text-center font-bold text-[10px] uppercase">#</th>
                      <th className="px-2 py-2 font-bold text-[10px] uppercase">Temperature (°C)</th>
                      <th className="px-2 py-2 font-bold text-[10px] uppercase">Duration (min)</th>
                      <th className="px-2 py-2 font-bold text-[10px] uppercase">Step Name</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.segments.map((row, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="px-2 py-1.5"><input type="number" step="1" value={row.tempC} onChange={e => updateSegment(i, 'tempC', e.target.value)} className="form-input text-xs py-1 w-24" placeholder="°C" /></td>
                        <td className="px-2 py-1.5"><input type="number" step="1" min="0" value={row.holdMin} onChange={e => updateSegment(i, 'holdMin', e.target.value)} className="form-input text-xs py-1 w-24" placeholder="min" /></td>
                        <td className="px-2 py-1.5"><input value={row.label} onChange={e => updateSegment(i, 'label', e.target.value)} className="form-input text-xs py-1 w-full" placeholder="e.g. Preheat 1" /></td>
                        <td className="px-2 py-1.5 text-center">
                          {form.segments.length > 1 && (
                            <button type="button" onClick={() => setForm(f => ({ ...f, segments: f.segments.filter((_, idx) => idx !== i) }))}
                              className="text-rose-400 hover:text-rose-600">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <HeatCycleGraphPreview segments={form.segments} />
              </div>
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <ListSearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, material, process…"
          className="flex-1"
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>
        ) : paged.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No graphs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="th">Name</th>
                  <th className="th">Material</th>
                  <th className="th">Process</th>
                  <th className="th text-center">Status</th>
                  <th className="th text-center">Default</th>
                  <th className="th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((g) => (
                  <tr key={g.id} className={`tr ${!g.isActive ? 'opacity-50' : ''}`}>
                    <td className="td font-semibold text-slate-800">
                      {g.name}
                      {g.description && <p className="text-xs text-slate-400 truncate max-w-[240px]">{g.description}</p>}
                    </td>
                    <td className="td text-slate-600">{g.material || '—'}</td>
                    <td className="td text-slate-600">{g.processType?.name || '—'}</td>
                    <td className="td text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${g.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {g.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="td text-center">
                      {g.isDefault ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">★ Default</span>
                      ) : (
                        <button type="button" onClick={() => handleSetDefault(g)} disabled={busyId === g.id}
                          className="text-xs text-slate-400 hover:text-amber-600 font-semibold disabled:opacity-50">
                          Set Default
                        </button>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex justify-center gap-1">
                        <button type="button" title="Edit" aria-label={`Edit graph ${g.name}`} onClick={() => openEdit(g)}
                          className="p-2 rounded-lg text-sky-700 hover:bg-sky-50">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button type="button" title="Duplicate" aria-label={`Duplicate graph ${g.name}`} onClick={() => handleDuplicate(g)} disabled={busyId === g.id}
                          className="p-2 rounded-lg text-sky-600 hover:bg-sky-50 disabled:opacity-50">
                          <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        </button>
                        <button type="button" title="Delete" aria-label={`Delete graph ${g.name}`} onClick={() => handleDelete(g)} disabled={busyId === g.id}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50">
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

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
