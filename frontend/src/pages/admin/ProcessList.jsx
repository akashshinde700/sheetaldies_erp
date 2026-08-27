import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, FlaskConical } from 'lucide-react';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  code: '', name: '', description: '', hsnSacCode: '', tallyStockItem: '',
  pricePerKg: '', pricePerPc: '', lotPrice: '', gstRate: '18',
};

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-10 mx-auto" /></td>
    <td className="td"><Skeleton className="h-3.5 w-36" /></td>
    <td className="td"><Skeleton className="h-5 w-14 rounded-full mx-auto" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
  </tr>
);

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
    <div className="font-app w-full space-y-3 animate-slide-up">
      <PageHeader
        title="Process Types"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Processes' }]}
        actions={<Button type="button" onClick={openCreate}><Plus /> Add Process</Button>}
      />

      {/* Add / Edit form — side sheet */}
      <Sheet open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <SheetContent side="right" className="font-app sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit process' : 'New process'}</SheetTitle>
            <SheetDescription>Heat-treatment process master — rates used in inwards and invoicing.</SheetDescription>
          </SheetHeader>
          <form id="process-form" onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Code" htmlFor="proc-code" required>
                  <Input
                    id="proc-code"
                    className="font-mono"
                    placeholder="e.g. HRD"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Name" htmlFor="proc-name" required>
                  <Input
                    id="proc-name"
                    placeholder="e.g. Hardening"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="HSN / SAC Code" htmlFor="proc-hsn">
                  <Input
                    id="proc-hsn"
                    className="font-mono"
                    placeholder="e.g. 9988"
                    value={form.hsnSacCode}
                    onChange={(e) => setForm((f) => ({ ...f, hsnSacCode: e.target.value }))}
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Tally Stock Item" htmlFor="proc-tally">
                    <Input
                      id="proc-tally"
                      className={form.tallyStockItem ? 'border-violet-300 bg-violet-50/40' : ''}
                      placeholder={form.name || 'Tally me jo stock item hai'}
                      value={form.tallyStockItem}
                      onChange={(e) => setForm((f) => ({ ...f, tallyStockItem: e.target.value }))}
                    />
                  </FormField>
                  <p className="text-[10px] text-slate-400 mt-1">
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
                <FormField label="GST Rate (%)" htmlFor="proc-gst">
                  <Input
                    id="proc-gst"
                    type="number"
                    className="text-right tabular-nums"
                    placeholder="18"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.gstRate}
                    onChange={(e) => setForm((f) => ({ ...f, gstRate: e.target.value }))}
                  />
                </FormField>
              </div>

              <FormField label="Description" htmlFor="proc-desc">
                <Textarea
                  id="proc-desc"
                  rows={2}
                  placeholder="Optional notes about this process…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="min-h-[64px]"
                />
              </FormField>

          </form>
          <SheetFooter>
            <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="process-form" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, name, HSN…"
                className="w-full"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none pb-2 sm:pb-2.5">
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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left min-w-[520px]">
            <thead>
              <tr>
                <th className="th text-center w-20">Code</th>
                <th className="th">Name</th>
                <th className="th text-center">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <FlaskConical className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {search ? 'No processes match your search.' : 'No processes yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paged.map((p) => (
                <tr key={p.id} className={`tr ${!p.isActive ? 'opacity-50' : ''}`}>
                  <td className="td text-center font-mono text-xs font-semibold text-slate-500">{p.code}</td>
                  <td className="td font-medium text-slate-800">
                    {p.name}
                    {p.description && (
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{p.description}</p>
                    )}
                  </td>
                  <td className="td text-center">
                    <Badge variant={p.isActive ? 'success' : 'neutral'} className="px-2 py-0.5 text-[10px]">
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        type="button" variant="ghost" size="icon-sm"
                        title="Edit"
                        aria-label={`Edit process ${p.name}`}
                        onClick={() => openEdit(p)}
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button" variant="ghost" size="icon-sm"
                        title={p.isActive ? 'Deactivate' : 'Activate'}
                        aria-label={`${p.isActive ? 'Deactivate' : 'Activate'} process ${p.name}`}
                        onClick={() => handleToggle(p)}
                        className="text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      >
                        {p.isActive ? <ToggleRight /> : <ToggleLeft />}
                      </Button>
                      <Button
                        type="button" variant="ghost" size="icon-sm"
                        title="Delete"
                        aria-label={`Delete process ${p.name}`}
                        onClick={() => handleDelete(p)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
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

      <p className="text-xs text-slate-400">
        Party-specific rate overrides are set per party in <strong>Party Details → Process Rates</strong>.
        The rates here are global defaults.
      </p>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
