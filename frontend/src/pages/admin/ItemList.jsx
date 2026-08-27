import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, Trash2, X, Package } from 'lucide-react';
import api from '../../utils/api';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const emptyForm = () => ({
  partNo: '',
  description: '',
  unit: 'NOS',
  hsnCode: '',
  drawingNo: '',
  material: '',
  weightKg: '',
});

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const SkeletonRow = () => (
  <tr>
    <td className="td sticky left-0 z-[1] bg-white"><Skeleton className="h-3.5 w-20" /></td>
    <td className="td"><Skeleton className="h-3.5 w-16" /></td>
    <td className="td"><Skeleton className="h-3.5 w-16" /></td>
    <td className="td"><Skeleton className="h-3.5 w-10 ml-auto" /></td>
    <td className="td"><Skeleton className="h-3.5 w-10" /></td>
    <td className="td"><Skeleton className="h-3.5 w-14" /></td>
    <td className="td"><Skeleton className="h-3.5 w-32" /></td>
    <td className="td"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
  </tr>
);

export default function ItemList() {
  const PAGE_SIZE = 10;
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/items', {
        params: debouncedSearch ? { search: debouncedSearch } : {},
      });
      setItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items.');
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
      toast.error('Part number is required.');
      return;
    }

    const payload = {
      ...formData,
      weightKg: formData.weightKg === '' || formData.weightKg == null ? undefined : formData.weightKg,
    };

    try {
      if (editingId) {
        await api.put(`/items/${editingId}`, payload);
        toast.success('Item updated successfully.');
      } else {
        await api.post('/items', payload);
        toast.success('Item created successfully.');
      }
      setFormData(emptyForm());
      setEditingId(null);
      setShowForm(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error(error?.response?.data?.message || 'Failed to save item.');
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

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'Delete item?',
      message: 'This will permanently delete this item.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/items/${id}`);
          toast.success('Item deleted.');
          fetchItems();
        } catch (error) {
          toast.error(error?.response?.data?.message || 'Failed to delete item.');
        } finally { setConfirmDialog(null); }
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const closeForm = () => { setShowForm(false); setEditingId(null); setFormData(emptyForm()); };

  return (
    <div className="font-app w-full space-y-3 animate-slide-up">
      <PageHeader
        title="Items"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Items' }]}
        actions={
          <Button type="button" onClick={() => { setEditingId(null); setFormData(emptyForm()); setShowForm(true); }}>
            <Plus /> Add item
          </Button>
        }
      />

      {/* Add / Edit form — side sheet */}
      <Sheet open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <SheetContent side="right" className="font-app sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit item' : 'New item'}</SheetTitle>
            <SheetDescription>Parts, units and HSN.</SheetDescription>
          </SheetHeader>
          <form id="item-form" onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Part no" htmlFor="item-partno" required>
                <Input id="item-partno" placeholder="Part no" value={formData.partNo} onChange={(e) => setFormData({ ...formData, partNo: e.target.value })} required className="font-mono" />
              </FormField>
              <FormField label="Unit" htmlFor="item-unit" hint="Default NOS">
                <Input id="item-unit" placeholder="NOS" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
              </FormField>
              <FormField label="Drawing no" htmlFor="item-drawing">
                <Input id="item-drawing" placeholder="Drawing no." value={formData.drawingNo} onChange={(e) => setFormData({ ...formData, drawingNo: e.target.value })} className="font-mono" />
              </FormField>
              <FormField label="Material" htmlFor="item-material">
                <Input id="item-material" placeholder="e.g. D2" value={formData.material} onChange={(e) => setFormData({ ...formData, material: e.target.value })} />
              </FormField>
              <FormField label="Weight (kg)" htmlFor="item-weight">
                <Input id="item-weight" placeholder="0.00" value={formData.weightKg} onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })} className="text-right tabular-nums" />
              </FormField>
              <FormField label="HSN code" htmlFor="item-hsn">
                <Input id="item-hsn" placeholder="HSN code" value={formData.hsnCode} onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })} className="font-mono" />
              </FormField>
              <FormField label="Description" htmlFor="item-desc" className="col-span-1 md:col-span-2">
                <Textarea id="item-desc" placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="min-h-[88px]" />
              </FormField>
          </form>
          <SheetFooter>
            <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="item-form">{editingId ? 'Update' : 'Create'}</Button>
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
                placeholder="Search part no, drawing, material, description..."
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
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr>
                <th className="th sticky left-0 z-[1] bg-slate-50/95 backdrop-blur-sm shadow-[4px_0_12px_-8px_rgba(15,23,42,0.25)]">Part no</th>
                <th className="th">Drawing</th>
                <th className="th">Material</th>
                <th className="th text-right">Wt (kg)</th>
                <th className="th">Unit</th>
                <th className="th">HSN</th>
                <th className="th">Description</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <Package className="h-5 w-5 text-sky-300" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {searchTerm ? 'No items match your search.' : 'No items yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pagedItems.map((item) => (
                <tr key={item.id} className="tr group">
                  <td className="td font-semibold text-slate-800 sticky left-0 z-[1] bg-white group-hover:bg-slate-50/80 shadow-[4px_0_12px_-8px_rgba(15,23,42,0.12)]">{item.partNo}</td>
                  <td className="td font-mono text-xs text-slate-600">{item.drawingNo || '—'}</td>
                  <td className="td text-slate-600">{item.material || '—'}</td>
                  <td className="td text-right tabular-nums text-slate-700">{item.weightKg != null ? item.weightKg : '—'}</td>
                  <td className="td text-slate-600">{item.unit || '—'}</td>
                  <td className="td font-mono text-xs text-slate-600">{item.hsnCode || '—'}</td>
                  <td className="td text-slate-600 max-w-[200px] truncate" title={item.description}>{item.description || '—'}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => setViewItem(item)}
                        title="View" aria-label={`View item ${item.partNo}`}
                        className="text-slate-400 hover:text-slate-700">
                        <Eye />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => handleEdit(item)}
                        title="Edit" aria-label={`Edit item ${item.partNo}`}
                        className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                        <Pencil />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm"
                        onClick={() => handleDelete(item.id)}
                        title="Delete" aria-label={`Delete item ${item.partNo}`}
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
        {!loading && items.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, items.length)} of {items.length}
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
      {viewItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 animate-backdrop-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-card-elevated border border-slate-200 animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 leading-none tracking-tight">Item details</h3>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewItem(null)} aria-label="Close" className="text-slate-400 hover:text-slate-700">
                <X />
              </Button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part no</p><p className="font-semibold text-slate-800 mt-0.5">{viewItem.partNo || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit</p><p className="font-semibold text-slate-800 mt-0.5">{viewItem.unit || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drawing</p><p className="font-semibold text-slate-800 font-mono mt-0.5">{viewItem.drawingNo || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material</p><p className="font-semibold text-slate-800 mt-0.5">{viewItem.material || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight (kg)</p><p className="font-semibold text-slate-800 tabular-nums mt-0.5">{viewItem.weightKg ?? '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HSN</p><p className="font-semibold text-slate-800 font-mono mt-0.5">{viewItem.hsnCode || '—'}</p></div>
              <div className="col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</p><p className="font-semibold text-slate-800 mt-0.5">{viewItem.description || '—'}</p></div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
