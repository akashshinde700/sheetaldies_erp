import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Thermometer } from 'lucide-react';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const EMPTY_FORM = { name: '', sortOrder: '0' };

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

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
    <div className="page-stack w-full space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Heat Treatment Specs</h1>
          <p className="page-subtitle">Options shown in the Heat Treatment Specification dropdown</p>
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0">
          <Plus /> Add Spec
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search specs..."
                className="w-full"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap pb-2 sm:pb-2.5">
              <Checkbox
                checked={showAll}
                onCheckedChange={(c) => setShowAll(c === true)}
              />
              Show inactive
            </label>
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

      {/* List */}
      {loading ? (
        <Card>
          <div className="divide-y divide-slate-50/80">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3.5 w-6" />
                  <Skeleton className="h-3.5 w-48" />
                </div>
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <Thermometer className="h-5 w-5 text-sky-300" />
              </div>
              <p className="text-sm text-slate-500">
                {search ? 'No specs match your search.' : 'No specs yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="card divide-y divide-slate-50/80 overflow-hidden">
          {filtered.map(s => (
            <div key={s.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50/60 transition-colors ${!s.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] text-slate-400 w-6 text-right tabular-nums">{s.sortOrder}</span>
                <span className="font-semibold text-slate-800 text-sm truncate">{s.name}</span>
                {!s.isActive && (
                  <Badge variant="neutral" className="px-1.5 py-0.5 text-[10px]">Inactive</Badge>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button type="button" variant="ghost" size="icon-sm"
                  onClick={() => openEdit(s)}
                  title="Edit" aria-label={`Edit spec ${s.name}`}
                  className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                  <Pencil />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm"
                  onClick={() => handleToggle(s)}
                  title={s.isActive ? 'Deactivate' : 'Activate'}
                  aria-label={`${s.isActive ? 'Deactivate' : 'Activate'} spec ${s.name}`}
                  className="text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                  {s.isActive ? <ToggleRight /> : <ToggleLeft />}
                </Button>
                <Button type="button" variant="ghost" size="icon-sm"
                  onClick={() => handleDelete(s)}
                  title="Delete" aria-label={`Delete spec ${s.name}`}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 animate-backdrop-in" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-card-elevated border border-slate-200 w-full max-w-sm animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 leading-none tracking-tight">{editingId ? 'Edit Spec' : 'Add Spec'}</h2>
              <Button type="button" variant="ghost" size="icon-sm" onClick={closeForm} aria-label="Close" className="text-slate-400 hover:text-slate-700">
                <X />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <FormField label="Name" htmlFor="spec-name" required>
                <Input
                  id="spec-name"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. HARDEN AND TEMPER"
                  autoFocus
                />
              </FormField>
              <FormField label="Sort Order" htmlFor="spec-sort" hint="Lower number appears first in dropdown">
                <Input
                  id="spec-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(p => ({ ...p, sortOrder: e.target.value }))}
                  placeholder="0"
                  className="text-right tabular-nums"
                />
              </FormField>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} className="flex-1">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
