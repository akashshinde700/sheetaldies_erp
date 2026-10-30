import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, AlertTriangle, Download, Table2, FileText, PackageSearch } from 'lucide-react';
import api from '../../utils/api';
import { exportToCsv, exportToExcel } from '../../utils/export';
import toast from 'react-hot-toast';
import ListSearchInput from '../../components/ListSearchInput';
import KpiCard from '../../components/KpiCard';
import { formatDate } from '../../utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
    {children}
  </label>
);

export default function InventoryView() {
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [items, setItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [historySource, setHistorySource] = useState('');
  const [historyItemId, setHistoryItemId] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyJumpPage, setHistoryJumpPage] = useState('1');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [form, setForm] = useState({
    itemId: '',
    quantityOnHand: '',
    reorderLevel: '10',
  });

  useEffect(() => {
    fetchInventory();
    fetchLowStock();
    fetchMovements();
    fetchItems();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchMovements();
    }
  }, [activeTab, historyPage, historyLimit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchInventory();
    fetchLowStock();
    if (activeTab === 'history') {
      setHistoryPage(1);
      fetchMovements();
    }
  }, [debouncedSearchTerm]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchase/inventory/list?search=' + debouncedSearchTerm);
      setInventory(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const response = await api.get('/purchase/inventory/low-stock?search=' + debouncedSearchTerm);
      setLowStock(response.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMovements = async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (historySource) params.set('source', historySource);
      if (historyItemId) params.set('itemId', historyItemId);
      params.set('page', String(historyPage));
      params.set('limit', String(historyLimit));
      const query = params.toString();
      const response = await api.get(`/purchase/inventory/movements${query ? `?${query}` : ''}`);
      setMovements(response.data.data || []);
      setHistoryTotal(response.data.total || 0);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const openAddModal = () => {
    setForm({ itemId: '', quantityOnHand: '', reorderLevel: '10' });
    setItemSearch('');
    setShowAddModal(true);
  };

  const selectedItem = useMemo(
    () => items.find((it) => String(it.id) === String(form.itemId)),
    [items, form.itemId],
  );

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => `${it.partNo || ''} ${it.description || ''}`.toLowerCase().includes(q));
  }, [items, itemSearch]);

  const saveInventory = async (e) => {
    e.preventDefault();
    if (!form.itemId) {
      toast.error('Please select item.');
      return;
    }
    if (form.quantityOnHand === '' || Number(form.quantityOnHand) < 0) {
      toast.error('Please enter valid quantity.');
      return;
    }
    try {
      await api.post('/purchase/inventory/upsert', {
        itemId: Number(form.itemId),
        quantityOnHand: Number(form.quantityOnHand),
        reorderLevel: form.reorderLevel === '' ? 10 : Number(form.reorderLevel),
      });
      toast.success('Inventory saved.');
      setShowAddModal(false);
      fetchInventory();
      fetchLowStock();
      fetchMovements();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save inventory.');
    }
  };

  const exportMovementRows = useMemo(() => (
    movements.map((m) => ({
      DateTime: formatDate(m.createdAt, true),
      ItemCode: m.item?.partNo || `Item ${m.itemId}`,
      ItemDescription: m.item?.description || '',
      Source: m.source === 'GRN' ? 'GRN' : 'MANUAL',
      QuantityChange: m.quantityChange,
      BalanceAfter: m.balanceAfter,
      ReorderLevelAfter: m.reorderLevelAfter,
      Reference: `${m.referenceType || ''}${m.referenceId ? ` #${m.referenceId}` : ''}`.trim(),
      Remarks: m.remarks || '',
    }))
  ), [movements]);

  const handleExportCsv = () => {
    if (!exportMovementRows.length) {
      toast.error('No history rows to export.');
      return;
    }
    exportToCsv(exportMovementRows, `inventory-history-${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportExcel = () => {
    if (!exportMovementRows.length) {
      toast.error('No history rows to export.');
      return;
    }
    exportToExcel(exportMovementRows, `inventory-history-${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPdf = () => {
    if (!movements.length) {
      toast.error('No history rows to export.');
      return;
    }
    const rowsHtml = movements.map((m) => (
      `<tr>
        <td>${escapeHtml(formatDate(m.createdAt, true))}</td>
        <td>${escapeHtml(m.item?.partNo || `Item ${m.itemId}`)}</td>
        <td>${escapeHtml(m.source === 'GRN' ? 'GRN' : 'MANUAL')}</td>
        <td style="text-align:right;">${escapeHtml(`${m.quantityChange >= 0 ? '+' : ''}${m.quantityChange}`)}</td>
        <td style="text-align:right;">${escapeHtml(m.balanceAfter)}</td>
        <td>${escapeHtml(`${m.referenceType || '-'}${m.referenceId ? ` #${m.referenceId}` : ''}`)}</td>
      </tr>`
    )).join('');
    const popup = window.open('', '_blank', 'width=1200,height=700');
    if (!popup) return;
    popup.document.write(`
      <html>
        <head>
          <title>Inventory History</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 20px; }
            p { margin: 0 0 16px; color: #6b7280; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Inventory Movement History</h1>
          <p>Generated on ${formatDate(new Date(), true)}</p>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Item</th>
                <th>Source</th>
                <th>Change</th>
                <th>Balance</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const displayData = activeTab === 'low-stock' ? lowStock : inventory;
  const totalHistoryPages = Math.max(Math.ceil(historyTotal / historyLimit), 1);
  const historyPageButtons = useMemo(() => {
    if (totalHistoryPages <= 1) return [1];
    const pages = new Set([1, totalHistoryPages, historyPage - 1, historyPage, historyPage + 1]);
    const normalized = Array.from(pages)
      .filter((n) => n >= 1 && n <= totalHistoryPages)
      .sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < normalized.length; i += 1) {
      const page = normalized[i];
      const prev = normalized[i - 1];
      if (i > 0 && page - prev > 1) out.push('ellipsis');
      out.push(page);
    }
    return out;
  }, [historyPage, totalHistoryPages]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    fetchMovements();
  }, [fromDate, toDate, historySource, historyItemId]);

  useEffect(() => {
    if (!showAddModal) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowAddModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAddModal]);

  useEffect(() => {
    setHistoryJumpPage(String(historyPage));
  }, [historyPage]);

  return (
    <div className="page-stack min-w-0 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">On-hand quantities and reorder alerts</p>
        </div>
        <Button type="button" className="w-full sm:w-auto shrink-0" onClick={openAddModal}>
          <Plus /> Add / Update Inventory
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label="SKU rows"
          value={inventory.length}
          sub="Tracked stock items"
          icon="inventory_2"
          iconBg="bg-sky-100 text-sky-700"
        />
        <KpiCard
          label="Total on hand"
          value={inventory.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0)}
          sub="Across all items"
          icon="warehouse"
          iconBg="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Low stock"
          value={lowStock.length}
          sub="At or below reorder level"
          icon="warning"
          iconBg="bg-amber-100 text-amber-700"
          badge={lowStock.length > 0 ? 'Attention' : 'Clear'}
          badgeColor={lowStock.length > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}
        />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Low stock</h3>
            <p className="text-sm text-amber-800/90">{lowStock.length} items at or below reorder level</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden min-w-0">
        <div className="flex overflow-x-auto overscroll-x-contain border-b border-slate-200/80 touch-pan-x">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'text-sky-800 border-b-2 border-sky-600 bg-sky-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({inventory.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('low-stock')}
            className={`shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'low-stock'
                ? 'text-sky-800 border-b-2 border-sky-600 bg-sky-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Low stock ({lowStock.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'history'
                ? 'text-sky-800 border-b-2 border-sky-600 bg-sky-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            History ({movements.length})
          </button>
        </div>

        <div className="p-3 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <ListSearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className="w-full"
              />
            </div>
            {searchTerm ? (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setSearchTerm('')}
                className="text-slate-500 hover:text-rose-600">
                <X /> Clear
              </Button>
            ) : null}
          </div>
        </div>

        {activeTab !== 'history' ? (
          <>
            <div className="table-responsive">
              <table className="w-full text-left min-w-[520px]">
                <thead>
                  <tr>
                    <th className="th">Item</th>
                    <th className="th text-right">On hand</th>
                    <th className="th text-right">Reorder</th>
                    <th className="th text-center">Status</th>
                    <th className="th">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {displayData.map(item => {
                    const isLow = item.quantityOnHand <= (item.reorderLevel || 10);
                    return (
                      <tr key={item.id} className={`tr ${isLow ? 'bg-amber-50/40' : ''}`}>
                        <td className="td font-medium text-slate-800">{item.item?.partNo || item.item?.description}</td>
                        <td className="td text-right font-semibold tabular-nums">{item.quantityOnHand || 0}</td>
                        <td className="td text-right text-slate-600 tabular-nums">{item.reorderLevel}</td>
                        <td className="td text-center">
                          <Badge variant={isLow ? 'error' : 'success'} className="px-2 py-0.5 text-[10px]">
                            {isLow ? 'Low' : 'OK'}
                          </Badge>
                        </td>
                        <td className="td text-slate-500 text-xs">
                          {formatDate(item.lastRestockDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {displayData.length === 0 && !loading && (
              <div className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                    <PackageSearch className="h-5 w-5 text-sky-300" />
                  </div>
                  <p className="text-sm text-slate-500">No items found</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="p-3 border-b border-slate-200/80 bg-slate-50/50 flex flex-col xs:flex-row flex-wrap items-stretch xs:items-end gap-3">
              <div className="space-y-1 w-full xs:w-auto min-w-0 xs:min-w-[150px]">
                <FilterLabel htmlFor="history-from-date">From</FilterLabel>
                <input id="history-from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="form-input text-xs w-full" />
              </div>
              <div className="space-y-1 w-full xs:w-auto min-w-0 xs:min-w-[150px]">
                <FilterLabel htmlFor="history-to-date">To</FilterLabel>
                <input id="history-to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="form-input text-xs w-full" />
              </div>
              <div className="space-y-1 w-full xs:w-auto min-w-0 xs:min-w-[130px]">
                <FilterLabel htmlFor="history-source">Source</FilterLabel>
                <select id="history-source" className="form-input text-xs w-full" value={historySource} onChange={(e) => setHistorySource(e.target.value)}>
                  <option value="">All</option>
                  <option value="GRN">GRN</option>
                  <option value="MANUAL_ADJUSTMENT">Manual</option>
                </select>
              </div>
              <div className="space-y-1 w-full xs:flex-1 xs:min-w-[200px] min-w-0">
                <FilterLabel htmlFor="history-item">Item</FilterLabel>
                <select id="history-item" className="form-input text-xs w-full max-w-full" value={historyItemId} onChange={(e) => setHistoryItemId(e.target.value)}>
                  <option value="">All items</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.partNo || `Item ${it.id}`} - {it.description || 'No description'}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setHistoryPage(1);
                  fetchMovements();
                }}
              >
                Apply
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setHistorySource('');
                  setHistoryItemId('');
                  setHistoryPage(1);
                  fetchMovements();
                }}
              >
                Reset
              </Button>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
                  <Download /> CSV
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleExportExcel}>
                  <Table2 /> XLSX
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleExportPdf}>
                  <FileText /> PDF
                </Button>
              </div>
            </div>
            <div className="px-4 py-2.5 border-b border-slate-200/80 bg-white flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {movements.length} of {historyTotal} records
              </p>
              <div className="flex items-center gap-2">
                <FilterLabel htmlFor="history-rows">Rows</FilterLabel>
                <select
                  id="history-rows"
                  className="form-input py-1.5 text-xs w-[84px]"
                  value={historyLimit}
                  onChange={(e) => {
                    setHistoryLimit(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                >
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="w-full text-left min-w-[680px]">
                <thead>
                  <tr>
                    <th className="th">When</th>
                    <th className="th">Item</th>
                    <th className="th">Source</th>
                    <th className="th text-right">Change</th>
                    <th className="th text-right">Balance</th>
                    <th className="th text-right">Reorder</th>
                    <th className="th">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {movements.map((m) => (
                    <tr key={m.id} className="tr">
                      <td className="td text-xs text-slate-500 whitespace-nowrap">{formatDate(m.createdAt, true)}</td>
                      <td className="td">
                        <div className="font-semibold text-slate-800">{m.item?.partNo || `Item ${m.itemId}`}</div>
                        <div className="text-xs text-slate-500">{m.item?.description || '—'}</div>
                      </td>
                      <td className="td">
                        <Badge className={`px-2 py-0.5 text-[10px] ${m.source === 'GRN' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'}`}>
                          {m.source === 'GRN' ? 'GRN' : 'Manual'}
                        </Badge>
                      </td>
                      <td className={`td text-right font-semibold tabular-nums ${m.quantityChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange}
                      </td>
                      <td className="td text-right tabular-nums">{m.balanceAfter}</td>
                      <td className="td text-right tabular-nums">{m.reorderLevelAfter}</td>
                      <td className="td text-xs text-slate-500">
                        {m.referenceType || '—'}{m.referenceId ? ` #${m.referenceId}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {movements.length === 0 && !loading && (
              <div className="px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                    <PackageSearch className="h-5 w-5 text-sky-300" />
                  </div>
                  <p className="text-sm text-slate-500">No movement history found</p>
                </div>
              </div>
            )}
            <div className="px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-slate-500">Page {historyPage} of {totalHistoryPages}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                {historyPageButtons.map((token, idx) => (
                  token === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">...</span>
                  ) : (
                    <Button
                      key={`page-${token}`}
                      type="button"
                      variant={token === historyPage ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setHistoryPage(token)}
                      className="min-w-8 px-2"
                    >
                      {token}
                    </Button>
                  )
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                >
                  Next
                </Button>
                <div className="ml-2 flex items-center gap-2">
                  <FilterLabel htmlFor="history-go-to-page">Go to</FilterLabel>
                  <Input
                    id="history-go-to-page"
                    type="number"
                    min="1"
                    max={totalHistoryPages}
                    value={historyJumpPage}
                    onChange={(e) => setHistoryJumpPage(e.target.value)}
                    className="py-1.5 text-xs w-[84px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = Number(historyJumpPage);
                      if (!Number.isInteger(next)) return;
                      setHistoryPage(Math.min(totalHistoryPages, Math.max(1, next)));
                    }}
                  >
                    Go
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setShowAddModal(false)} aria-hidden />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-card-elevated overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 leading-none tracking-tight">Add / Update Inventory</h3>
              <Button type="button" variant="ghost" size="icon-sm"
                onClick={() => setShowAddModal(false)} aria-label="Close"
                className="text-slate-400 hover:text-slate-700">
                <X />
              </Button>
            </div>
            <form className="p-5 space-y-4" onSubmit={saveInventory}>
              <FormField label="Search item" htmlFor="inv-item-search">
                <Input
                  id="inv-item-search"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Part no / description"
                />
              </FormField>
              <FormField label="Item" htmlFor="inv-item-select" required>
                <select
                  id="inv-item-select"
                  className="form-input"
                  value={form.itemId}
                  onChange={(e) => setForm((prev) => ({ ...prev, itemId: e.target.value }))}
                  required
                >
                  <option value="">Select item</option>
                  {filteredItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.partNo || `Item ${it.id}`} - {it.description || 'No description'}
                    </option>
                  ))}
                </select>
              </FormField>
              {selectedItem && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-sm text-slate-700">
                  Selected: <span className="font-semibold">{selectedItem.partNo || `Item ${selectedItem.id}`}</span> ({selectedItem.unit || 'NOS'})
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Quantity On Hand" htmlFor="inv-qty" required>
                  <Input
                    id="inv-qty"
                    type="number"
                    min="0"
                    value={form.quantityOnHand}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantityOnHand: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Reorder Level" htmlFor="inv-reorder" required>
                  <Input
                    id="inv-reorder"
                    type="number"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(e) => setForm((prev) => ({ ...prev, reorderLevel: e.target.value }))}
                    required
                  />
                </FormField>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit">Save</Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
