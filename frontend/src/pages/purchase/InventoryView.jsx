import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import { exportToCsv, exportToExcel } from '../../utils/export';
import toast from 'react-hot-toast';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
  const [historyLimit, setHistoryLimit] = useState(20);
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
      DateTime: new Date(m.createdAt).toLocaleString(),
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
        <td>${escapeHtml(new Date(m.createdAt).toLocaleString())}</td>
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
          <p>Generated on ${new Date().toLocaleString()}</p>
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
    <div className="page-stack">
      <div>
        <h1 className="page-title">Inventory</h1>
        <p className="page-subtitle">On-hand quantities and reorder alerts</p>
      </div>
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={openAddModal}>
          <span className="material-symbols-outlined text-[18px]">add</span> Add / Update Inventory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU rows</p>
          <p className="text-3xl font-extrabold text-sky-800 font-headline mt-1">{inventory.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total on hand</p>
          <p className="text-3xl font-extrabold text-emerald-700 font-headline mt-1">
            {inventory.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0)}
          </p>
        </div>
        <div className="card p-5 border-l-4 border-amber-400">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low stock</p>
          <p className="text-3xl font-extrabold text-amber-700 font-headline mt-1">{lowStock.length}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex gap-3 items-start">
          <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">warning</span>
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Low stock</h3>
            <p className="text-sm text-amber-800/90">{lowStock.length} items at or below reorder level</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
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
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
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
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'history'
                ? 'text-sky-800 border-b-2 border-sky-600 bg-sky-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            History ({movements.length})
          </button>
        </div>

        <div className="p-4 border-b border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
          <span className="material-symbols-outlined text-[20px] text-slate-400 shrink-0">search</span>
          <input
            type="text"
            placeholder="Search items…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 form-input border-0 bg-transparent shadow-none focus:ring-0"
          />
        </div>

        {activeTab !== 'history' ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200/80">
                    <th className="th text-left">Item</th>
                    <th className="th text-center">On hand</th>
                    <th className="th text-center">Reorder</th>
                    <th className="th text-center">Status</th>
                    <th className="th text-left">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayData.map(item => {
                    const isLow = item.quantityOnHand <= (item.reorderLevel || 10);
                    return (
                      <tr key={item.id} className={`tr ${isLow ? 'bg-amber-50/40' : ''}`}>
                        <td className="td font-medium text-slate-800">{item.item?.partNo || item.item?.description}</td>
                        <td className="td text-center font-semibold tabular-nums">{item.quantityOnHand || 0}</td>
                        <td className="td text-center text-slate-600">{item.reorderLevel}</td>
                        <td className="td text-center">
                          <span className={`badge ${isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isLow ? 'Low' : 'OK'}
                          </span>
                        </td>
                        <td className="td text-slate-500 text-xs">
                          {item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {displayData.length === 0 && !loading && (
              <div className="p-10 text-center text-slate-500 text-sm">No items found</div>
            )}
          </>
        ) : (
          <>
            <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="history-from-date" className="form-label">From</label>
                <input id="history-from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="form-input min-w-[160px]" />
              </div>
              <div>
                <label htmlFor="history-to-date" className="form-label">To</label>
                <input id="history-to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="form-input min-w-[160px]" />
              </div>
              <div>
                <label htmlFor="history-source" className="form-label">Source</label>
                <select id="history-source" className="form-input min-w-[150px]" value={historySource} onChange={(e) => setHistorySource(e.target.value)}>
                  <option value="">All</option>
                  <option value="GRN">GRN</option>
                  <option value="MANUAL_ADJUSTMENT">Manual</option>
                </select>
              </div>
              <div>
                <label htmlFor="history-item" className="form-label">Item</label>
                <select id="history-item" className="form-input min-w-[220px]" value={historyItemId} onChange={(e) => setHistoryItemId(e.target.value)}>
                  <option value="">All items</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.partNo || `Item ${it.id}`} - {it.description || 'No description'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setHistoryPage(1);
                  fetchMovements();
                }}
              >
                Apply
              </button>
              <button
                type="button"
                className="btn-ghost"
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
              </button>
              <div className="ml-auto flex flex-wrap gap-2">
                <button type="button" className="btn-outline" onClick={handleExportCsv}>
                  <span className="material-symbols-outlined text-[16px]">download</span> CSV
                </button>
                <button type="button" className="btn-outline" onClick={handleExportExcel}>
                  <span className="material-symbols-outlined text-[16px]">table_chart</span> XLSX
                </button>
                <button type="button" className="btn-outline" onClick={handleExportPdf}>
                  <span className="material-symbols-outlined text-[16px]">description</span> PDF
                </button>
              </div>
            </div>
            <div className="px-4 py-3 border-b border-slate-200/80 bg-white flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {movements.length} of {historyTotal} records
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Rows</label>
                <select
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200/80">
                    <th className="th text-left">When</th>
                    <th className="th text-left">Item</th>
                    <th className="th text-left">Source</th>
                    <th className="th text-right">Change</th>
                    <th className="th text-right">Balance</th>
                    <th className="th text-right">Reorder</th>
                    <th className="th text-left">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="tr">
                      <td className="td text-xs text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
                      <td className="td">
                        <div className="font-semibold text-slate-800">{m.item?.partNo || `Item ${m.itemId}`}</div>
                        <div className="text-xs text-slate-500">{m.item?.description || '—'}</div>
                      </td>
                      <td className="td">
                        <span className={`badge ${m.source === 'GRN' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'}`}>
                          {m.source === 'GRN' ? 'GRN' : 'Manual'}
                        </span>
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
              <div className="p-10 text-center text-slate-500 text-sm">No movement history found</div>
            )}
            <div className="px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs text-slate-500">Page {historyPage} of {totalHistoryPages}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                {historyPageButtons.map((token, idx) => (
                  token === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">...</span>
                  ) : (
                    <button
                      key={`page-${token}`}
                      type="button"
                      onClick={() => setHistoryPage(token)}
                      className={`min-w-8 px-2 py-1 rounded-lg text-xs font-semibold border ${
                        token === historyPage
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {token}
                    </button>
                  )
                ))}
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                >
                  Next
                </button>
                <div className="ml-2 flex items-center gap-2">
                  <label className="text-xs text-slate-500">Go to</label>
                  <input
                    id="history-go-to-page"
                    type="number"
                    min="1"
                    max={totalHistoryPages}
                    value={historyJumpPage}
                    onChange={(e) => setHistoryJumpPage(e.target.value)}
                    className="form-input py-1.5 text-xs w-[84px]"
                  />
                  <button
                    type="button"
                    className="btn-outline py-1.5 px-2 text-xs"
                    onClick={() => {
                      const next = Number(historyJumpPage);
                      if (!Number.isInteger(next)) return;
                      setHistoryPage(Math.min(totalHistoryPages, Math.max(1, next)));
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={() => setShowAddModal(false)} aria-hidden />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Add / Update Inventory</h3>
              <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setShowAddModal(false)}>
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <form className="p-4 space-y-4" onSubmit={saveInventory}>
              <div>
                <label className="form-label">Search item</label>
                <input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="form-input"
                  placeholder="Part no / description"
                />
              </div>
              <div>
                <label className="form-label">Item *</label>
                <select
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
              </div>
              {selectedItem && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-sm text-slate-700">
                  Selected: <span className="font-semibold">{selectedItem.partNo || `Item ${selectedItem.id}`}</span> ({selectedItem.unit || 'NOS'})
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Quantity On Hand *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.quantityOnHand}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantityOnHand: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Reorder Level *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.reorderLevel}
                    onChange={(e) => setForm((prev) => ({ ...prev, reorderLevel: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" className="btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
