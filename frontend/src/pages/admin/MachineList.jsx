import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, Trash2, X, Cog } from 'lucide-react';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td"><Skeleton className="h-3.5 w-16" /></td>
    <td className="td"><Skeleton className="h-3.5 w-40" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
  </tr>
);

export default function MachineList() {
  const PAGE_SIZE = 10;
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMachine, setViewMachine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    fetchMachines();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const response = await api.get('/machines');
      setMachines(response.data.data || []);
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machines.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Code and name are required.');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/machines/${editingId}`, {
          name: formData.name,
          code: formData.code,
          isActive: true,
        });
        toast.success('Machine updated successfully.');
      } else {
        await api.post('/machines', {
          code: formData.code,
          name: formData.name,
        });
        toast.success('Machine created successfully.');
      }
      setFormData({ code: '', name: '' });
      setEditingId(null);
      setShowForm(false);
      fetchMachines();
    } catch (error) {
      console.error('Error saving machine:', error);
      toast.error(error.response?.data?.message || 'Failed to save machine.');
    }
  };

  const handleEdit = (machine) => {
    setFormData({
      code: machine.code,
      name: machine.name,
    });
    setEditingId(machine.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'Delete machine?',
      message: 'This will permanently delete this machine.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/machines/${id}`);
          toast.success('Machine deleted.');
          fetchMachines();
        } catch (error) {
          toast.error(error?.response?.data?.message || 'Failed to delete machine.');
        } finally { setConfirmDialog(null); }
      },
    });
  };

  const filteredMachines = machines.filter((machine) =>
    machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / PAGE_SIZE));
  const pagedMachines = filteredMachines.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const closeForm = () => { setShowForm(false); setEditingId(null); setFormData({ code: '', name: '' }); };

  return (
    <div className="font-app mx-auto w-full max-w-5xl space-y-5 animate-slide-up">
      <PageHeader
        title="Machines"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Machines' }]}
        actions={
          <Button type="button" onClick={() => { setEditingId(null); setFormData({ code: '', name: '' }); setShowForm(true); }}>
            <Plus /> Add machine
          </Button>
        }
      />

      {/* Add / Edit form — side sheet */}
      <Sheet open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <SheetContent side="right" className="font-app sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit machine' : 'New machine'}</SheetTitle>
            <SheetDescription>Shop-floor equipment master.</SheetDescription>
          </SheetHeader>
          <form id="machine-form" onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4">
            <FormField label="Code" htmlFor="machine-code" required>
              <Input id="machine-code" placeholder="e.g. VF-01" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required className="font-app-mono" />
            </FormField>
            <FormField label="Machine name" htmlFor="machine-name" required>
              <Input id="machine-name" placeholder="e.g. Vacuum Furnace 1" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </FormField>
          </form>
          <SheetFooter>
            <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="machine-form">{editingId ? 'Update' : 'Create'}</Button>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search code, name..."
                className="w-full"
              />
            </div>
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
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
          <table className="w-full text-left min-w-[420px]">
            <thead>
              <tr>
                <th className="th">Code</th>
                <th className="th">Name</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <Cog className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {searchTerm ? 'No machines match your search.' : 'No machines yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pagedMachines.map((machine) => (
                <tr key={machine.id} className="tr">
                  <td className="td font-mono text-xs font-semibold text-slate-700">{machine.code}</td>
                  <td className="td font-medium text-slate-800">{machine.name}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => setViewMachine(machine)}
                        title="View" aria-label={`View machine ${machine.name}`}
                        className="text-slate-400 hover:text-slate-700">
                        <Eye />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => handleEdit(machine)}
                        title="Edit" aria-label={`Edit machine ${machine.name}`}
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Pencil />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => handleDelete(machine.id)}
                        title="Delete" aria-label={`Delete machine ${machine.name}`}
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
        {!loading && filteredMachines.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredMachines.length)} of {filteredMachines.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">{page} / {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View modal */}
      {viewMachine && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 animate-backdrop-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-card-elevated border border-slate-200 animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 leading-none tracking-tight">Machine details</h3>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewMachine(null)} aria-label="Close" className="text-slate-400 hover:text-slate-700">
                <X />
              </Button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code</p><p className="font-semibold text-slate-800 font-mono mt-0.5">{viewMachine.code || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</p><p className="font-semibold text-slate-800 mt-0.5">{viewMachine.name || '—'}</p></div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
