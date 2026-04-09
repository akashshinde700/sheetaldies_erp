import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toInt, toNum } from '../../utils/normalize';

function formatCurrency2(v) {
  const n = typeof v === 'number' ? v : toNum(String(v ?? '').replace(/,/g, ''), NaN);
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [quickCodeSearch, setQuickCodeSearch] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const [quickCost, setQuickCost] = useState('');
  const [activeItemRow, setActiveItemRow] = useState(0);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [viewPO, setViewPO] = useState(null);
  const [formData, setFormData] = useState({
    vendorId: '',
    poDate: '',
    expectedDelivery: '',
    remarks: '',
    items: [{ itemId: '', quantity: '1', unitPrice: '', description: '', partNo: '', unit: 'NOS', gstRate: 0, remark: '' }],
  });

  useEffect(() => {
    fetchPOs();
    fetchVendors();
    fetchItems();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchPOs();
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchPOs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchase?search=' + searchTerm);
      setOrders(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await api.get('/parties?type=VENDOR');
      setVendors(response.data.data || []);
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

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      vendorId: '',
      poDate: '',
      expectedDelivery: '',
      remarks: '',
      items: [{ itemId: '', quantity: '1', unitPrice: '', description: '', partNo: '', unit: 'NOS', gstRate: 0, remark: '' }],
    });
    setQuickCodeSearch('');
    setQuickQty('1');
    setQuickCost('');
  };

  const lineAmount = (item) => {
    const qty = toNum(item.quantity, 0);
    const rate = toNum(item.unitPrice, 0);
    return (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(rate) ? rate : 0);
  };

  const totalQty = useMemo(
    () => formData.items.reduce((acc, item) => acc + toNum(item.quantity, 0), 0),
    [formData.items],
  );
  const taxableAmount = useMemo(
    () => formData.items.reduce((acc, item) => acc + lineAmount(item), 0),
    [formData.items],
  );

  const selectedVendor = useMemo(
    () => vendors.find((v) => String(v.id) === String(formData.vendorId)),
    [vendors, formData.vendorId],
  );

  const filteredVendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      `${v.name} ${v.partyCode || ''} ${v.city || ''} ${v.state || ''}`.toLowerCase().includes(q),
    );
  }, [vendors, vendorSearch]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      `${it.partNo || ''} ${it.description || ''} ${it.hsnCode || ''}`.toLowerCase().includes(q),
    );
  }, [items, itemSearch]);

  const quickMatchedItems = useMemo(() => {
    const q = quickCodeSearch.trim().toLowerCase();
    if (!q) return [];
    return items.filter((it) => `${it.partNo || ''} ${it.description || ''}`.toLowerCase().includes(q)).slice(0, 8);
  }, [items, quickCodeSearch]);

  const addLine = (prefill = null) => {
    const next = {
      itemId: '',
      quantity: '1',
      unitPrice: '',
      description: '',
      partNo: '',
      unit: 'NOS',
      gstRate: 0,
      remark: '',
      ...(prefill || {}),
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, next] }));
  };

  const removeLine = (idx) => {
    setFormData((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items: nextItems.length ? nextItems : [{ itemId: '', quantity: '1', unitPrice: '', description: '', partNo: '', unit: 'NOS', gstRate: 0, remark: '' }] };
    });
  };

  const updateLine = (idx, patch) => {
    setFormData((prev) => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, items: next };
    });
  };

  const assignItemToRow = (idx, it) => {
    updateLine(idx, {
      itemId: String(it.id),
      partNo: it.partNo || '',
      description: it.description || '',
      unit: it.unit || 'NOS',
      gstRate: toNum(it.gstRate, 0) || 0,
      unitPrice: formData.items[idx]?.unitPrice || '',
    });
  };

  const handleQuickAdd = () => {
    const matched = items.find((it) =>
      `${it.partNo || ''} ${it.description || ''}`.toLowerCase().includes(quickCodeSearch.trim().toLowerCase()),
    );
    if (!matched) {
      toast.error('Please select a valid product code.');
      return;
    }
    addLine({
      itemId: String(matched.id),
      partNo: matched.partNo || '',
      description: matched.description || '',
      unit: matched.unit || 'NOS',
      gstRate: toNum(matched.gstRate, 0) || 0,
      quantity: String(toNum(quickQty, 1) || 1),
      unitPrice: String(toNum(quickCost, 0) || 0),
    });
    setQuickCodeSearch('');
    setQuickQty('1');
    setQuickCost('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendorId || formData.items.some(i => !i.itemId || !i.quantity || !i.unitPrice)) {
      toast.error('Fill all required fields.');
      return;
    }

    const payload = {
      vendorId: formData.vendorId,
      poDate: formData.poDate || undefined,
      expectedDelivery: formData.expectedDelivery || undefined,
      remarks: formData.remarks || undefined,
      items: formData.items.map((item) => ({
        itemId: toInt(item.itemId, 0),
        quantity: toInt(item.quantity, 0) || 0,
        unitPrice: toNum(item.unitPrice, 0) || 0,
      })),
    };

    try {
      if (editingId) {
        await api.put(`/purchase/${editingId}`, payload);
        toast.success('Purchase order updated.');
      } else {
        await api.post('/purchase', payload);
        toast.success('Purchase order created.');
      }
      setShowForm(false);
      resetForm();
      fetchPOs();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save purchase order.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this PO?')) return;
    try {
      await api.delete(`/purchase/${id}`);
      toast.success('Purchase order deleted.');
      fetchPOs();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete purchase order.');
    }
  };

  return (
    <div className="page-stack">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Vendors, amounts, and PO status</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!showForm) resetForm();
            setShowForm(!showForm);
          }}
          className="btn-primary shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">add</span> New PO
        </button>
      </div>

      {showForm && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 font-headline mb-4">{editingId ? 'Edit Purchase Order' : 'Create Purchase Order'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Vendor *</label>
                <div className="flex gap-2">
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="form-input"
                    required
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <button type="button" className="btn-outline shrink-0" onClick={() => setShowVendorPicker(true)}>List</button>
                </div>
              </div>
              <div>
                <label className="form-label">PO Date</label>
                <input type="date" value={formData.poDate} onChange={(e) => setFormData({ ...formData, poDate: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">Expected delivery</label>
                <input type="date" value={formData.expectedDelivery} onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })} className="form-input" />
              </div>
            </div>
            <div>
              <label className="form-label">Vendor address</label>
              <input
                type="text"
                readOnly
                value={selectedVendor?.address || ''}
                className="form-input bg-slate-50"
                placeholder="Address auto-fills from selected vendor"
              />
            </div>
            <div>
              <label className="form-label">Remarks</label>
              <textarea
                placeholder="Remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="form-input min-h-[88px]"
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Order lines</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-6 relative">
                  <label className="form-label">Search by product code</label>
                  <input
                    value={quickCodeSearch}
                    onChange={(e) => setQuickCodeSearch(e.target.value)}
                    className="form-input"
                    placeholder="Part no / product"
                  />
                  {quickMatchedItems.length > 0 && quickCodeSearch.trim() && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-auto">
                      {quickMatchedItems.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setQuickCodeSearch(it.partNo || it.description || '')}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <span className="font-semibold text-slate-700">{it.partNo}</span> - {it.description || 'No description'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Qty</label>
                  <input value={quickQty} onChange={(e) => setQuickQty(e.target.value)} type="number" min="1" className="form-input" />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Cost (Rs)</label>
                  <input value={quickCost} onChange={(e) => setQuickCost(e.target.value)} type="number" min="0" step="0.01" className="form-input" />
                </div>
                <div className="md:col-span-2">
                  <button type="button" onClick={handleQuickAdd} className="btn-primary w-full">Add</button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-sky-50/70 border-b border-slate-200/80">
                      <th className="th text-center">Sr</th>
                      <th className="th text-left">Code</th>
                      <th className="th text-left">Product</th>
                      <th className="th text-left">UOM</th>
                      <th className="th text-right">GST %</th>
                      <th className="th text-right">Qty</th>
                      <th className="th text-right">Cost (Rs)</th>
                      <th className="th text-right">Amount (Rs)</th>
                      <th className="th text-left">Remark</th>
                      <th className="th text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, idx) => (
                      <tr key={`${item.itemId || 'new'}-${idx}`} className="tr">
                        <td className="td text-center">{idx + 1}</td>
                        <td className="td">
                          <button
                            type="button"
                            onClick={() => { setActiveItemRow(idx); setShowItemPicker(true); }}
                            className="text-indigo-600 hover:underline text-left"
                          >
                            {item.partNo || item.itemId || 'Select'}
                          </button>
                        </td>
                        <td className="td max-w-[340px] truncate" title={item.description}>{item.description || '—'}</td>
                        <td className="td">{item.unit || 'NOS'}</td>
                        <td className="td text-right tabular-nums">{formatCurrency2(item.gstRate || 0)}</td>
                        <td className="td">
                          <input
                            type="number"
                            min="1"
                            className="form-input py-2 text-right text-sm"
                            value={item.quantity}
                            onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                          />
                        </td>
                        <td className="td">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input py-2 text-right text-sm"
                            value={item.unitPrice}
                            onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                          />
                        </td>
                        <td className="td text-right tabular-nums font-semibold">₹{formatCurrency2(lineAmount(item))}</td>
                        <td className="td">
                          <input
                            type="text"
                            className="form-input py-2 text-sm"
                            value={item.remark || ''}
                            onChange={(e) => updateLine(idx, { remark: e.target.value })}
                            placeholder="Remark"
                          />
                        </td>
                        <td className="td text-center">
                          <button type="button" onClick={() => removeLine(idx)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Remove row">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => addLine()} className="btn-outline text-sm">+ New Product</button>
            </div>
            <div className="flex justify-end">
              <div className="w-full max-w-sm rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Final Taxable Amount</span>
                  <span className="font-semibold text-slate-800">₹ {formatCurrency2(taxableAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Qty/Wgt</span>
                  <span className="font-semibold text-slate-800">{formatCurrency2(totalQty)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total</span>
                  <span className="font-bold text-indigo-700">₹ {formatCurrency2(taxableAmount)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
          <span className="material-symbols-outlined text-[20px] text-slate-400 shrink-0">search</span>
          <input
            type="text"
            placeholder="Search POs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyUp={fetchPOs}
            className="flex-1 form-input border-0 bg-transparent shadow-none focus:ring-0"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200/80">
                <th className="th text-left">PO No</th>
                <th className="th text-left">Vendor</th>
                <th className="th text-right">Amount</th>
                <th className="th text-left">Expected</th>
                <th className="th text-left">Status</th>
                <th className="th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(po => (
                <tr key={po.id} className="tr">
                  <td className="td font-semibold text-slate-800">{po.poNumber}</td>
                  <td className="td">{po.vendor?.name}</td>
                  <td className="td text-right tabular-nums">₹{formatCurrency2(po.totalAmount)}</td>
                  <td className="td">{new Date(po.expectedDelivery).toLocaleDateString()}</td>
                  <td className="td"><span className={`badge ${po.status === 'DRAFT' ? 'bg-sky-100 text-sky-900' : 'bg-emerald-100 text-emerald-800'}`}>{po.status}</span></td>
                  <td className="td">
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => setViewPO(po)}
                        className="p-2 rounded-lg text-slate-700 hover:bg-slate-100"
                        aria-label="View"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const mappedItems = (po.items || []).map((line) => ({
                            itemId: String(line.itemId),
                            quantity: String(line.quantity ?? ''),
                            unitPrice: String(line.unitPrice ?? ''),
                            description: line.item?.description || '',
                            partNo: line.item?.partNo || '',
                            unit: line.item?.unit || 'NOS',
                            gstRate: toNum(line.item?.gstRate, 0) || 0,
                            remark: '',
                          }));
                          setEditingId(po.id);
                          setFormData({
                            vendorId: String(po.vendorId),
                            poDate: po.poDate ? String(po.poDate).slice(0, 10) : '',
                            expectedDelivery: po.expectedDelivery ? String(po.expectedDelivery).slice(0, 10) : '',
                            remarks: po.remarks || '',
                            items: mappedItems.length ? mappedItems : [{ itemId: '', quantity: '1', unitPrice: '', description: '', partNo: '', unit: 'NOS', gstRate: 0, remark: '' }],
                          });
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg text-sky-800 hover:bg-sky-50"
                        aria-label="Edit"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button type="button" onClick={() => handleDelete(po.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Delete"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showVendorPicker && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={() => setShowVendorPicker(false)} aria-hidden />
          <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Vendor List</h3>
              <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setShowVendorPicker(false)}><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-400">search</span>
                <input value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="form-input" placeholder="Search by vendor name" />
              </div>
              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="th text-left">Vendor</th>
                      <th className="th text-left">City</th>
                      <th className="th text-left">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVendors.map((v) => (
                      <tr
                        key={v.id}
                        className="cursor-pointer hover:bg-sky-50/50"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, vendorId: String(v.id) }));
                          setShowVendorPicker(false);
                        }}
                      >
                        <td className="td font-medium text-slate-700">{v.name}</td>
                        <td className="td">{v.city || '—'}</td>
                        <td className="td">{v.state || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {showItemPicker && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={() => setShowItemPicker(false)} aria-hidden />
          <div className="relative w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Product List</h3>
              <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setShowItemPicker(false)}><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-400">search</span>
                <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="form-input" placeholder="Search by product code/name" />
              </div>
              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="th text-left">Code</th>
                      <th className="th text-left">Product Name</th>
                      <th className="th text-left">UOM</th>
                      <th className="th text-left">HSN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((it) => (
                      <tr
                        key={it.id}
                        className="cursor-pointer hover:bg-sky-50/50"
                        onClick={() => {
                          assignItemToRow(activeItemRow, it);
                          setShowItemPicker(false);
                        }}
                      >
                        <td className="td font-medium text-indigo-700">{it.partNo || '—'}</td>
                        <td className="td">{it.description || '—'}</td>
                        <td className="td">{it.unit || 'NOS'}</td>
                        <td className="td">{it.hsnCode || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {viewPO && createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={() => setViewPO(null)} aria-hidden />
          <div className="relative w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">PO Details - {viewPO.poNumber}</h3>
              <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setViewPO(null)}><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-slate-400 text-xs">Vendor</p><p className="font-semibold">{viewPO.vendor?.name || '—'}</p></div>
                <div><p className="text-slate-400 text-xs">PO Date</p><p className="font-semibold">{viewPO.poDate ? new Date(viewPO.poDate).toLocaleDateString() : '—'}</p></div>
                <div><p className="text-slate-400 text-xs">Expected Delivery</p><p className="font-semibold">{viewPO.expectedDelivery ? new Date(viewPO.expectedDelivery).toLocaleDateString() : '—'}</p></div>
                <div><p className="text-slate-400 text-xs">Status</p><p className="font-semibold">{viewPO.status || '—'}</p></div>
                <div className="md:col-span-4"><p className="text-slate-400 text-xs">Remarks</p><p className="font-semibold">{viewPO.remarks || '—'}</p></div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="th text-left">Item</th>
                      <th className="th text-right">Qty</th>
                      <th className="th text-right">Rate</th>
                      <th className="th text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewPO.items || []).map((line, i) => (
                      <tr key={i}>
                        <td className="td">{line.item?.partNo || line.item?.description || `Item #${line.itemId}`}</td>
                        <td className="td text-right">{line.quantity}</td>
                        <td className="td text-right">₹{formatCurrency2(line.unitPrice)}</td>
                        <td className="td text-right font-semibold">₹{formatCurrency2(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
