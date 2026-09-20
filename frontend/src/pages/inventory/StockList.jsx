import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  Plus, Search, X, ArrowDownToLine, ArrowUpFromLine, Scale, Pencil, Trash2,
  AlertTriangle, PackageSearch, Download, History, Boxes,
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import ListSearchInput from '../../components/ListSearchInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import KpiCard from '../../components/KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtQty = (v) => num(v).toLocaleString('en-IN', { maximumFractionDigits: 3 });

const EMPTY_ITEM = {
  sku: '', name: '', category: '', unit: 'NOS', reorderLevel: '0',
  location: '', unitCost: '', trackBatches: false, notes: '',
  openingQty: '', openingBatchNo: '', openingExpiry: '',
};

const MOVE_META = {
  IN:     { label: 'Stock In',  icon: ArrowDownToLine,  tone: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  OUT:    { label: 'Stock Out', icon: ArrowUpFromLine,  tone: 'text-rose-700',    badge: 'bg-rose-100 text-rose-800' },
  ADJUST: { label: 'Adjust',    icon: Scale,            tone: 'text-violet-700',  badge: 'bg-violet-100 text-violet-800' },
};

export default function StockList() {
  const { isManager } = useAuth();

  const [tab, setTab] = useState('items'); // items | movements
  const [view, setView] = useState('all'); // all | low
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, stockValue: 0, expiringSoon: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [moves, setMoves] = useState([]);
  const [movesTotal, setMovesTotal] = useState(0);
  const [movesPage, setMovesPage] = useState(1);
  const [moveType, setMoveType] = useState('');
  const [mFrom, setMFrom] = useState('');
  const [mTo, setMTo] = useState('');
  const MOVES_LIMIT = 20;

  const [itemSheet, setItemSheet] = useState(null); // { ...form, editId }
  const [savingItem, setSavingItem] = useState(false);
  const [moveModal, setMoveModal] = useState(null);  // { item, type, quantity, ... }
  const [savingMove, setSavingMove] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const r = await api.get('/stock', { params: { search: debounced, view } });
      setItems(r.data.data || []);
    } catch { toast.error('Could not load the stock items.'); }
    finally { setLoading(false); }
  };
  const loadStats = async () => {
    try { const r = await api.get('/stock/stats'); setStats(r.data.data || {}); } catch { /* ignore */ }
  };
  const loadCategories = async () => {
    try { const r = await api.get('/stock/categories'); setCategories(r.data.data || []); } catch { /* ignore */ }
  };
  const loadMoves = async () => {
    try {
      const r = await api.get('/stock/movements', {
        params: {
          search: debounced, type: moveType || undefined,
          from: mFrom || undefined, to: mTo || undefined,
          page: movesPage, limit: MOVES_LIMIT,
        },
      });
      setMoves(r.data.data || []);
      setMovesTotal(r.data.total || 0);
    } catch { toast.error('Could not load the movements.'); }
  };

  useEffect(() => { loadStats(); loadCategories(); }, []);
  useEffect(() => { if (tab === 'items') loadItems(); }, [tab, view, debounced]);
  useEffect(() => { if (tab === 'movements') loadMoves(); }, [tab, moveType, mFrom, mTo, movesPage, debounced]);

  const refreshAll = () => { loadItems(); loadStats(); loadCategories(); if (tab === 'movements') loadMoves(); };

  // ── Item Sheet ──
  const openNewItem = () => setItemSheet({ ...EMPTY_ITEM, editId: null });
  const openEditItem = (it) => setItemSheet({
    editId: it.id,
    sku: it.sku || '', name: it.name || '', category: it.category || '',
    unit: it.unit || 'NOS', reorderLevel: String(it.reorderLevel ?? '0'),
    location: it.location || '', unitCost: it.unitCost == null ? '' : String(it.unitCost),
    trackBatches: !!it.trackBatches, notes: it.notes || '',
    openingQty: '', openingBatchNo: '', openingExpiry: '',
  });
  const setSheet = (k, v) => setItemSheet((p) => ({ ...p, [k]: v }));

  const saveItem = async (e) => {
    e.preventDefault();
    if (!itemSheet.name.trim()) return toast.error('A name is required.');
    setSavingItem(true);
    try {
      const body = {
        sku: itemSheet.sku, name: itemSheet.name, category: itemSheet.category,
        unit: itemSheet.unit, reorderLevel: itemSheet.reorderLevel,
        location: itemSheet.location, unitCost: itemSheet.unitCost,
        trackBatches: itemSheet.trackBatches, notes: itemSheet.notes,
      };
      if (itemSheet.editId) {
        await api.put(`/stock/${itemSheet.editId}`, body);
        toast.success('Stock item update ho gaya.');
      } else {
        await api.post('/stock', {
          ...body,
          openingQty: itemSheet.openingQty,
          openingBatchNo: itemSheet.openingBatchNo,
          openingExpiry: itemSheet.openingExpiry || undefined,
        });
        toast.success('Stock item add ho gaya.');
      }
      setItemSheet(null);
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save.');
    } finally { setSavingItem(false); }
  };

  const askDelete = (it) => setConfirm({
    title: `Remove "${it.name}"?`,
    message: it.quantityOnHand > 0
      ? `There is still ${fmtQty(it.quantityOnHand)} ${it.unit} in stock. An item with movements is never deleted — it is deactivated instead.`
      : 'This stock item will be removed.',
    confirmLabel: 'Remove item',
    variant: 'danger',
    onConfirm: async () => {
      try {
        const r = await api.delete(`/stock/${it.id}`);
        toast.success(r.data.message || 'Ho gaya.');
        refreshAll();
      } catch (err) { toast.error(err.response?.data?.message || 'Could not delete.'); }
      finally { setConfirm(null); }
    },
  });

  // ── Movement modal ──
  const openMove = (item, type) => setMoveModal({
    item, type,
    quantity: type === 'ADJUST' ? String(item.quantityOnHand ?? '') : '',
    batchNo: '', expiryDate: '', unitCost: item.unitCost == null ? '' : String(item.unitCost),
    reason: '', refNo: '', note: '',
    movedAt: new Date().toISOString().slice(0, 10),
  });
  const setMove = (k, v) => setMoveModal((p) => ({ ...p, [k]: v }));

  const saveMove = async (e) => {
    e.preventDefault();
    const m = moveModal;
    if (m.quantity === '' || Number(m.quantity) < 0) return toast.error('Quantity daaliye.');
    if (m.item.trackBatches && m.type === 'IN' && !m.batchNo.trim()) return toast.error('Batch No zaroori hai.');
    setSavingMove(true);
    try {
      const r = await api.post('/stock/movements', {
        stockItemId: m.item.id, type: m.type, quantity: m.quantity,
        batchNo: m.batchNo || undefined, expiryDate: m.expiryDate || undefined,
        unitCost: m.unitCost === '' ? undefined : m.unitCost,
        reason: m.reason || undefined, refNo: m.refNo || undefined, note: m.note || undefined,
        movedAt: m.movedAt || undefined,
      });
      toast.success(r.data.message || 'Ho gaya.');
      setMoveModal(null);
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the movement.');
    } finally { setSavingMove(false); }
  };

  const exportRegister = async () => {
    try {
      const r = await api.get('/stock/movements/export', {
        params: { search: debounced, type: moveType || undefined, from: mFrom || undefined, to: mTo || undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([r.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `StockRegister_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Could not export.'); }
  };

  const movesPages = Math.max(1, Math.ceil(movesTotal / MOVES_LIMIT));
  const lowCount = useMemo(() => items.filter((i) => num(i.quantityOnHand) <= num(i.reorderLevel)).length, [items]);

  return (
    <div className="page-stack w-full space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Internal stock — consumables, spares, tools, gases (job-work items se alag)</p>
        </div>
        {isManager && (
          <Button type="button" onClick={openNewItem} className="shrink-0">
            <Plus /> Add Item
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Stock items" value={stats.totalItems} sub="Active SKUs" icon="inventory_2" iconBg="bg-sky-100 text-sky-700" />
        <KpiCard label="Low stock" value={stats.lowStock} sub="At/below reorder"
          icon="warning" iconBg="bg-amber-100 text-amber-700"
          badge={stats.lowStock > 0 ? 'Attention' : 'Clear'}
          badgeColor={stats.lowStock > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'} />
        <KpiCard label="Stock value" value={`₹${num(stats.stockValue).toLocaleString('en-IN')}`} sub="Qty × unit cost" icon="payments" iconBg="bg-emerald-100 text-emerald-700" />
        <KpiCard label="Expiring ≤30d" value={stats.expiringSoon} sub="Batch expiry" icon="schedule" iconBg="bg-rose-100 text-rose-700" />
      </div>

      <div className="card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200/80">
          {[['items', 'Items', Boxes], ['movements', 'Movements', History]].map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === key ? 'text-sky-800 border-b-2 border-sky-600 bg-sky-50/50' : 'text-slate-500 hover:text-slate-800'
              }`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-slate-200/80 bg-slate-50/50 flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap sm:gap-3">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <FilterLabel>Search</FilterLabel>
            <ListSearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Item, SKU, batch, ref…" className="w-full" />
          </div>
          {tab === 'items' ? (
            <div className="space-y-1">
              <FilterLabel>Show</FilterLabel>
              <div className="flex gap-1.5">
                {[['all', 'All'], ['low', `Low stock (${lowCount})`]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setView(k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      view === k ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <FilterLabel htmlFor="mv-type">Type</FilterLabel>
                <select id="mv-type" value={moveType} onChange={(e) => { setMoveType(e.target.value); setMovesPage(1); }} className="form-input text-xs sm:w-32">
                  <option value="">All</option>
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                  <option value="ADJUST">Adjust</option>
                </select>
              </div>
              <div className="space-y-1">
                <FilterLabel htmlFor="mv-from">From</FilterLabel>
                <input id="mv-from" type="date" value={mFrom} onChange={(e) => { setMFrom(e.target.value); setMovesPage(1); }} className="form-input text-xs" />
              </div>
              <div className="space-y-1">
                <FilterLabel htmlFor="mv-to">To</FilterLabel>
                <input id="mv-to" type="date" value={mTo} onChange={(e) => { setMTo(e.target.value); setMovesPage(1); }} className="form-input text-xs" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={exportRegister}>
                <Download /> Register
              </Button>
            </>
          )}
        </div>

        {/* Items table */}
        {tab === 'items' ? (
          <div className="table-responsive">
            <table className="list-cards w-full text-left min-w-[720px]">
              <thead>
                <tr>
                  <th className="th">Item</th>
                  <th className="th">Category</th>
                  <th className="th text-right">On hand</th>
                  <th className="th text-right">Reorder</th>
                  <th className="th">Location</th>
                  <th className="th text-center">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {loading ? (
                  <tr><td colSpan={7} className="td text-center text-slate-400 py-8">Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center"><PackageSearch className="h-5 w-5 text-sky-300" /></div>
                      <p className="text-sm text-slate-500">{debounced || view === 'low' ? 'Nothing matched.' : 'No stock items yet — start with "Add Item".'}</p>
                    </div>
                  </td></tr>
                ) : items.map((it) => {
                  const low = num(it.quantityOnHand) <= num(it.reorderLevel);
                  return (
                    <tr key={it.id} className={`tr ${low ? 'bg-amber-50/40' : ''}`}>
                      <td className="td">
                        <div className="font-semibold text-slate-800">{it.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {it.sku ? <span className="font-mono">{it.sku}</span> : '—'}
                          {it.trackBatches && <span className="ml-2 rounded bg-violet-100 px-1 text-violet-700">batched</span>}
                        </div>
                      </td>
                      <td className="td text-xs text-slate-600">{it.category || '—'}</td>
                      <td className="td text-right font-bold tabular-nums">{fmtQty(it.quantityOnHand)} <span className="text-[10px] font-normal text-slate-400">{it.unit}</span></td>
                      <td className="td text-right text-slate-500 tabular-nums">{fmtQty(it.reorderLevel)}</td>
                      <td className="td text-xs text-slate-500">{it.location || '—'}</td>
                      <td className="td text-center">
                        <Badge variant={low ? 'error' : 'success'} className="px-2 py-0.5 text-[10px]">{low ? 'Low' : 'OK'}</Badge>
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button type="button" variant="ghost" size="icon-sm" title="Stock In"
                            onClick={() => openMove(it, 'IN')} className="text-slate-400 hover:text-emerald-700 hover:bg-emerald-50">
                            <ArrowDownToLine />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" title="Stock Out"
                            onClick={() => openMove(it, 'OUT')} className="text-slate-400 hover:text-rose-700 hover:bg-rose-50">
                            <ArrowUpFromLine />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" title="Adjust"
                            onClick={() => openMove(it, 'ADJUST')} className="text-slate-400 hover:text-violet-700 hover:bg-violet-50">
                            <Scale />
                          </Button>
                          {isManager && (
                            <>
                              <Button type="button" variant="ghost" size="icon-sm" title="Edit"
                                onClick={() => openEditItem(it)} className="text-slate-400 hover:text-sky-700 hover:bg-sky-50">
                                <Pencil />
                              </Button>
                              <Button type="button" variant="ghost" size="icon-sm" title="Delete"
                                onClick={() => askDelete(it)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                                <Trash2 />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Movements table */
          <>
            <div className="table-responsive">
              <table className="list-cards w-full text-left min-w-[720px]">
                <thead>
                  <tr>
                    <th className="th">When</th>
                    <th className="th">Item</th>
                    <th className="th">Type</th>
                    <th className="th text-right">Change</th>
                    <th className="th text-right">Balance</th>
                    <th className="th">Batch / Ref</th>
                    <th className="th">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {moves.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No movements yet.</td></tr>
                  ) : moves.map((m) => {
                    const meta = MOVE_META[m.type] || MOVE_META.ADJUST;
                    const signed = (m.type === 'OUT' ? -1 : 1) * num(m.quantity);
                    return (
                      <tr key={m.id} className="tr">
                        <td className="td text-xs text-slate-500 whitespace-nowrap">{formatDate(m.movedAt)}</td>
                        <td className="td">
                          <div className="font-semibold text-slate-800">{m.stockItem?.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{m.stockItem?.sku || ''}</div>
                        </td>
                        <td className="td"><Badge className={`px-2 py-0.5 text-[10px] ${meta.badge}`}>{meta.label}</Badge></td>
                        <td className={`td text-right font-semibold tabular-nums ${signed >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {signed >= 0 ? '+' : ''}{fmtQty(signed)} <span className="text-[10px] font-normal text-slate-400">{m.stockItem?.unit}</span>
                        </td>
                        <td className="td text-right tabular-nums">{fmtQty(m.balanceAfter)}</td>
                        <td className="td text-xs text-slate-500">
                          {m.batchNo ? <span className="font-mono">{m.batchNo}</span> : ''}
                          {m.batchNo && m.refNo ? ' · ' : ''}
                          {m.refNo || (!m.batchNo ? '—' : '')}
                        </td>
                        <td className="td text-xs text-slate-500">{m.reason || m.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs text-slate-500 tabular-nums">{movesTotal} records</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={movesPage <= 1} onClick={() => setMovesPage((p) => p - 1)}>Prev</Button>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">{movesPage} / {movesPages}</span>
                <Button type="button" variant="outline" size="sm" disabled={movesPage >= movesPages} onClick={() => setMovesPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Item Sheet ── */}
      <Sheet open={!!itemSheet} onOpenChange={(o) => { if (!o) setItemSheet(null); }}>
        <SheetContent side="right" className="font-app sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{itemSheet?.editId ? 'Edit stock item' : 'New stock item'}</SheetTitle>
            <SheetDescription>Internal stock — customer ke job-work items se alag.</SheetDescription>
          </SheetHeader>
          {itemSheet && (
            <form onSubmit={saveItem} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Name" htmlFor="si-name" required className="col-span-2">
                  <Input id="si-name" value={itemSheet.name} onChange={(e) => setSheet('name', e.target.value)} required placeholder="e.g. Argon gas cylinder" />
                </FormField>
                <FormField label="SKU / Code" htmlFor="si-sku">
                  <Input id="si-sku" value={itemSheet.sku} onChange={(e) => setSheet('sku', e.target.value.toUpperCase())} className="font-mono" placeholder="GAS-AR-40" />
                </FormField>
                <FormField label="Category" htmlFor="si-cat">
                  <Input id="si-cat" list="si-cat-list" value={itemSheet.category} onChange={(e) => setSheet('category', e.target.value)} placeholder="Consumable" />
                  <datalist id="si-cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                </FormField>
                <FormField label="Unit" htmlFor="si-unit">
                  <Input id="si-unit" value={itemSheet.unit} onChange={(e) => setSheet('unit', e.target.value.toUpperCase())} placeholder="NOS / KG / LTR" />
                </FormField>
                <FormField label="Reorder level" htmlFor="si-reorder">
                  <Input id="si-reorder" type="number" step="0.001" min="0" value={itemSheet.reorderLevel}
                    onChange={(e) => setSheet('reorderLevel', e.target.value)} className="text-right tabular-nums" />
                </FormField>
                <FormField label="Location" htmlFor="si-loc">
                  <Input id="si-loc" value={itemSheet.location} onChange={(e) => setSheet('location', e.target.value)} placeholder="Store rack B-2" />
                </FormField>
                <FormField label="Unit cost (₹)" htmlFor="si-cost">
                  <Input id="si-cost" type="number" step="0.01" min="0" value={itemSheet.unitCost}
                    onChange={(e) => setSheet('unitCost', e.target.value)} className="text-right tabular-nums" placeholder="0.00" />
                </FormField>
              </div>

              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={itemSheet.trackBatches} onCheckedChange={(c) => setSheet('trackBatches', c === true)} />
                Track batches &amp; expiry (gas, chemicals…)
              </label>

              <FormField label="Notes" htmlFor="si-notes">
                <Textarea id="si-notes" rows={2} value={itemSheet.notes} onChange={(e) => setSheet('notes', e.target.value)} />
              </FormField>

              {!itemSheet.editId && (
                <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">Opening stock (optional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Opening qty" htmlFor="si-open">
                      <Input id="si-open" type="number" step="0.001" min="0" value={itemSheet.openingQty}
                        onChange={(e) => setSheet('openingQty', e.target.value)} className="text-right tabular-nums" placeholder="0" />
                    </FormField>
                    {itemSheet.trackBatches && (
                      <>
                        <FormField label="Batch no" htmlFor="si-open-batch">
                          <Input id="si-open-batch" value={itemSheet.openingBatchNo} onChange={(e) => setSheet('openingBatchNo', e.target.value)} className="font-mono" />
                        </FormField>
                        <FormField label="Expiry" htmlFor="si-open-exp">
                          <Input id="si-open-exp" type="date" value={itemSheet.openingExpiry} onChange={(e) => setSheet('openingExpiry', e.target.value)} />
                        </FormField>
                      </>
                    )}
                  </div>
                </div>
              )}

              <SheetFooter>
                <Button type="button" variant="ghost" onClick={() => setItemSheet(null)}>Cancel</Button>
                <Button type="submit" loading={savingItem} disabled={savingItem}>
                  {itemSheet.editId ? 'Save changes' : 'Add item'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Movement modal ── */}
      {moveModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-backdrop-in" onClick={() => setMoveModal(null)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-card-elevated overflow-hidden animate-scale-in font-app">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-900">
                {MOVE_META[moveModal.type].label} — <span className="text-slate-500 font-normal">{moveModal.item.name}</span>
              </h3>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMoveModal(null)} className="text-slate-400 hover:text-slate-700"><X /></Button>
            </div>
            <form onSubmit={saveMove} className="p-5 space-y-3">
              <p className="text-xs text-slate-500">
                Abhi stock: <b className="tabular-nums text-slate-800">{fmtQty(moveModal.item.quantityOnHand)} {moveModal.item.unit}</b>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={moveModal.type === 'ADJUST' ? `New on-hand (${moveModal.item.unit})` : `Quantity (${moveModal.item.unit})`} htmlFor="mv-qty" required>
                  <Input id="mv-qty" type="number" step="0.001" min="0" autoFocus value={moveModal.quantity}
                    onChange={(e) => setMove('quantity', e.target.value)} className="text-right tabular-nums" required />
                </FormField>
                <FormField label="Date" htmlFor="mv-date">
                  <Input id="mv-date" type="date" value={moveModal.movedAt} onChange={(e) => setMove('movedAt', e.target.value)} />
                </FormField>
                {moveModal.item.trackBatches && moveModal.type !== 'ADJUST' && (
                  <>
                    <FormField label="Batch no" htmlFor="mv-batch" required={moveModal.type === 'IN'}>
                      <Input id="mv-batch" value={moveModal.batchNo} onChange={(e) => setMove('batchNo', e.target.value)} className="font-mono" />
                    </FormField>
                    {moveModal.type === 'IN' && (
                      <FormField label="Expiry" htmlFor="mv-exp">
                        <Input id="mv-exp" type="date" value={moveModal.expiryDate} onChange={(e) => setMove('expiryDate', e.target.value)} />
                      </FormField>
                    )}
                  </>
                )}
                {moveModal.type === 'IN' && (
                  <FormField label="Unit cost (₹)" htmlFor="mv-cost">
                    <Input id="mv-cost" type="number" step="0.01" min="0" value={moveModal.unitCost}
                      onChange={(e) => setMove('unitCost', e.target.value)} className="text-right tabular-nums" />
                  </FormField>
                )}
                <FormField label={moveModal.type === 'OUT' ? 'Issued to / reason' : 'Reason'} htmlFor="mv-reason" className="col-span-2">
                  <Input id="mv-reason" value={moveModal.reason} onChange={(e) => setMove('reason', e.target.value)}
                    placeholder={moveModal.type === 'OUT' ? 'e.g. Furnace-2 maintenance' : moveModal.type === 'IN' ? 'e.g. Purchase / GRN' : 'e.g. Physical count'} />
                </FormField>
                <FormField label="Ref no" htmlFor="mv-ref">
                  <Input id="mv-ref" value={moveModal.refNo} onChange={(e) => setMove('refNo', e.target.value)} placeholder="PO / bill / slip" />
                </FormField>
                <FormField label="Note" htmlFor="mv-note">
                  <Input id="mv-note" value={moveModal.note} onChange={(e) => setMove('note', e.target.value)} />
                </FormField>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setMoveModal(null)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={savingMove} disabled={savingMove} className="flex-1">
                  {MOVE_META[moveModal.type].label}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
