import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Copy, Star, LineChart } from 'lucide-react';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import SearchSelect from '../../components/SearchSelect';
import HeatCycleGraphPreview from '../../components/HeatCycleGraphPreview';
import { useProcesses } from '../../hooks/useMasterData';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 15;
const EMPTY_SEGMENT = () => ({ tempC: '', holdMin: '', label: '' });
const EMPTY_FORM = {
  name: '', material: '', processTypeId: '', description: '',
  isDefault: false, isActive: true,
  segments: [EMPTY_SEGMENT()],
};

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-36" /></td>
    <td className="td"><Skeleton className="h-3.5 w-16" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24" /></td>
    <td className="td"><Skeleton className="h-5 w-14 rounded-full mx-auto" /></td>
    <td className="td"><Skeleton className="h-3.5 w-16 mx-auto" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
  </tr>
);

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
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Temperature Cycle Graphs</h1>
          <p className="page-subtitle">Reusable heat-treatment graph master — used by Certificates &amp; VHT Run Sheets</p>
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0">
          <Plus /> Create Graph
        </Button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit graph' : 'New graph'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Graph Name" htmlFor="graph-name" required>
                  <Input
                    id="graph-name"
                    placeholder="e.g. D2 Hardening"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Material" htmlFor="graph-material">
                  <Input
                    id="graph-material"
                    placeholder="e.g. D2"
                    value={form.material}
                    onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                  />
                </FormField>
                <FormField label="Process">
                  <SearchSelect
                    value={form.processTypeId}
                    onChange={(v) => setForm((f) => ({ ...f, processTypeId: v }))}
                    options={processes.map(p => ({ value: p.id, label: p.name }))}
                    placeholder="— None —"
                    useFixed
                  />
                </FormField>
                <div className="flex items-end gap-5 pb-1.5">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <Checkbox
                      checked={form.isActive}
                      onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c === true }))}
                    />
                    Active
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <Checkbox
                      checked={form.isDefault}
                      onCheckedChange={(c) => setForm((f) => ({ ...f, isDefault: c === true }))}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    Set as Default{form.processTypeId ? '' : ' (general)'}
                  </label>
                </div>
              </div>

              <FormField label="Description" htmlFor="graph-desc">
                <Textarea
                  id="graph-desc"
                  rows={2}
                  placeholder="Optional notes…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="min-h-[64px]"
                />
              </FormField>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="mb-0">Graph Points</Label>
                  <Button type="button" variant="secondary" size="sm"
                    onClick={() => setForm(f => ({ ...f, segments: [...f.segments, EMPTY_SEGMENT()] }))}>
                    <Plus /> Add Point
                  </Button>
                </div>
                <div className="table-responsive rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        <th className="th w-8 text-center">#</th>
                        <th className="th">Temperature (°C)</th>
                        <th className="th">Duration (min)</th>
                        <th className="th">Step Name</th>
                        <th className="th w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50/80">
                      {form.segments.map((row, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1.5 text-center text-slate-400 font-mono tabular-nums">{i + 1}</td>
                          <td className="px-2 py-1.5">
                            <Input type="number" step="1" value={row.tempC}
                              onChange={e => updateSegment(i, 'tempC', e.target.value)}
                              className="h-8 min-h-0 text-xs text-right tabular-nums w-24" placeholder="°C"
                              aria-label={`Point ${i + 1} temperature`} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input type="number" step="1" min="0" value={row.holdMin}
                              onChange={e => updateSegment(i, 'holdMin', e.target.value)}
                              className="h-8 min-h-0 text-xs text-right tabular-nums w-24" placeholder="min"
                              aria-label={`Point ${i + 1} duration`} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input value={row.label}
                              onChange={e => updateSegment(i, 'label', e.target.value)}
                              className="h-8 min-h-0 text-xs w-full" placeholder="e.g. Preheat 1"
                              aria-label={`Point ${i + 1} step name`} />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {form.segments.length > 1 && (
                              <Button type="button" variant="ghost" size="icon-sm"
                                onClick={() => setForm(f => ({ ...f, segments: f.segments.filter((_, idx) => idx !== i) }))}
                                title="Remove point" aria-label={`Remove point ${i + 1}`}
                                className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                                <Trash2 />
                              </Button>
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
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, material, process…"
                className="w-full"
              />
            </div>
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="text-slate-500 hover:text-rose-600"
              >
                <X /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Material</th>
                <th className="th">Process</th>
                <th className="th text-center">Status</th>
                <th className="th text-center">Default</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <LineChart className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {search ? 'No graphs match your search.' : 'No graphs yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paged.map((g) => (
                <tr key={g.id} className={`tr ${!g.isActive ? 'opacity-50' : ''}`}>
                  <td className="td font-semibold text-slate-800">
                    {g.name}
                    {g.description && <p className="text-xs text-slate-400 truncate max-w-[240px]">{g.description}</p>}
                  </td>
                  <td className="td text-slate-600">{g.material || '—'}</td>
                  <td className="td text-slate-600">{g.processType?.name || '—'}</td>
                  <td className="td text-center">
                    <Badge variant={g.isActive ? 'success' : 'neutral'} className="px-2 py-0.5 text-[10px]">
                      {g.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="td text-center">
                    {g.isDefault ? (
                      <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
                        <Star className="h-3 w-3" /> Default
                      </Badge>
                    ) : (
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => handleSetDefault(g)} disabled={busyId === g.id}
                        className="h-7 px-2 text-[11px] text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                        Set Default
                      </Button>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button type="button" variant="ghost" size="icon-sm"
                        title="Edit" aria-label={`Edit graph ${g.name}`} onClick={() => openEdit(g)}
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Pencil />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm"
                        title="Duplicate" aria-label={`Duplicate graph ${g.name}`}
                        onClick={() => handleDuplicate(g)} disabled={busyId === g.id}
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Copy />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm"
                        title="Delete" aria-label={`Delete graph ${g.name}`}
                        onClick={() => handleDelete(g)} disabled={busyId === g.id}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">{page} / {totalPages}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
