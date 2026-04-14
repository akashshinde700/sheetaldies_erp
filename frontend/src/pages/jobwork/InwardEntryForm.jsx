import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useParties, useProcesses } from '../../hooks/useMasterData';
import { toNum, toInt } from '../../utils/normalize';

export default function InwardEntryForm() {
  const { data: parties = [] } = useParties();
  const { data: processes = [] } = useProcesses();
  const [createdChallan, setCreatedChallan] = useState(null);
  const [createdJobCard, setCreatedJobCard] = useState(null);
  const [createdRunSheet, setCreatedRunSheet] = useState(null);
  const [creatingJobCard, setCreatingJobCard] = useState(false);
  const [creatingFullFlow, setCreatingFullFlow] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fromPartyId: '',
    challanNo: '',
    challanDate: new Date().toISOString().split('T')[0],
    materialInDate: new Date().toISOString().split('T')[0],
    vehicleNo: '',
    deliveryPerson: '',
    invoiceRef: '',
    poNo: '',
    poDate: '',
    cillNo: '',
    dispatchQty: '0',
    dispatchDate: '',
    processingNotes: '',
  });


  const emptyItem = () => ({
    partName: '',
    material: '',
    drawingNo: '',
    hrc: '',
    woNo: '',
    hsnCode: '',
    sacNo: '',
    qty: '',
    weight: '',
    rate: '0',
    amount: '0',
    processTypeId: '',
    processName: '',
  });

  const calcAmount = (it, overrides = {}) => {
    const weight = toNum(overrides.weight ?? it.weight, 0);
    const qty    = toNum(overrides.qty    ?? it.qty,    0);
    const rate   = toNum(overrides.rate   ?? it.rate,   0);
    if (rate === 0) return '0';
    const base = weight > 0 ? weight : qty;
    return (base * rate).toFixed(2);
  };

  const handleProcessChange = (id, processTypeId) => {
    const proc = processes.find(p => p.id === toInt(processTypeId));
    setItems(items.map(it => {
      if (it.id !== id) return it;
      const weight = toNum(it.weight, 0);
      const pricePerKg = proc ? toNum(proc.pricePerKg, 0) : 0;
      const minCharge  = proc ? toNum(proc.minCharge,  0) : 0;
      let autoRate = it.rate;
      if (proc && pricePerKg > 0) {
        const calc = weight > 0 ? weight * pricePerKg : pricePerKg;
        autoRate = String(Math.max(calc, minCharge || 0).toFixed(2));
      }
      const updated = {
        ...it,
        processTypeId,
        processName: proc?.name || '',
        hsnCode: proc?.hsnSacCode || it.hsnCode,
        rate: autoRate,
      };
      updated.amount = calcAmount(updated);
      return updated;
    }));
  };

  const handleAddItem = () => {
    setItems([...items, { ...emptyItem(), id: Math.random() }]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(it => it.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      // Re-calc rate when weight changes and a process is selected
      if (field === 'weight' && updated.processTypeId) {
        const proc = processes.find(p => p.id === toInt(updated.processTypeId));
        if (proc) {
          const pricePerKg = toNum(proc.pricePerKg, 0);
          const minCharge  = toNum(proc.minCharge,  0);
          if (pricePerKg > 0) {
            const w = toNum(value, 0);
            const calc = w > 0 ? w * pricePerKg : pricePerKg;
            updated.rate = String(Math.max(calc, minCharge || 0).toFixed(2));
          }
        }
      }
      // Always recalc amount when weight, qty, or rate changes
      if (['weight', 'qty', 'rate'].includes(field)) {
        updated.amount = calcAmount(updated);
      }
      return updated;
    }));
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fromPartyId) {
      toast.error('Company Name is required');
      return;
    }

    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    const hasInvalidItems = items.some(it => !it.material || !it.qty);
    if (hasInvalidItems) {
      toast.error('All items must have Material and Qty');
      return;
    }

    setLoading(true);
    try {
      const resolvedFromPartyId = toInt(form.fromPartyId);
      const resolvedToPartyId = parties.find(p => p.partyType === 'BOTH')?.id;
      if (!resolvedToPartyId) {
        toast.error('No processor found. Please select a processor.');
        setLoading(false);
        return;
      }

      const payload = {
        manualChallanNo: form.challanNo,
        challanDate: form.challanDate,
        fromPartyId: resolvedFromPartyId,
        toPartyId: resolvedToPartyId,
        receivedDate: form.materialInDate,
        invoiceChNo: form.invoiceRef,
        vehicleNo: form.vehicleNo,
        deliveryPerson: form.deliveryPerson,
        poNo: form.poNo,
        poDate: form.poDate || null,
        cillNo: form.cillNo,
        dispatchDate: form.dispatchDate,
        processingNotes: form.processingNotes,
        items: items.map((it, idx) => ({
          material: it.material,
          drawingNo: it.drawingNo,
          hrc: it.hrc,
          woNo: it.woNo,
          hsnCode: it.hsnCode,
          sacNo: it.sacNo,
          quantity: toNum(it.qty, 0),
          weight: toNum(it.weight, 0),
          qtyOut: idx === 0 ? toNum(form.dispatchQty, 0) : 0,
          rate: toNum(it.rate, 0),
          amount: toNum(it.amount, 0),
          uom: 'KGS',
          description: [it.partName, it.material, it.processName].filter(Boolean).join(' - ') || it.material,
          processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
          processName: it.processName || null,
        })),
      };

      const r = await api.post('/jobwork/inward', payload);
      toast.success(`Created challan ${r.data.data.challan.challanNo}!`);
      setCreatedChallan(r.data.data.challan);
      // navigate('/jobwork/register');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating inward entry');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJobCard = async () => {
    if (!createdChallan) return;
    setCreatingJobCard(true);
    try {
      const r = await api.post('/jobwork/jobcard-from-challan', {
        challanId: createdChallan.id,
      });
      toast.success(`Created job card ${r.data.data.jobCard.jobCardNo}!`);
      setCreatedJobCard(r.data.data.jobCard);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating job card');
    } finally {
      setCreatingJobCard(false);
    }
  };

  const handleCreateFullWorkflow = async (e) => {
    e.preventDefault();

    if (!form.fromPartyId) {
      toast.error('Company Name is required');
      return;
    }

    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    const hasInvalidItems = items.some(it => !it.material || !it.qty);
    if (hasInvalidItems) {
      toast.error('All items must have Material and Qty');
      return;
    }

    setCreatingFullFlow(true);
    try {
      const resolvedFromPartyId = toInt(form.fromPartyId);
      const resolvedToPartyId2 = parties.find(p => p.partyType === 'BOTH')?.id;
      if (!resolvedToPartyId2) {
        toast.error('No processor found.');
        setCreatingFullFlow(false);
        return;
      }

      const payload = {
        manualChallanNo: form.challanNo,
        challanDate: form.challanDate,
        fromPartyId: resolvedFromPartyId,
        toPartyId: resolvedToPartyId2,
        receivedDate: form.materialInDate,
        invoiceChNo: form.invoiceRef,
        vehicleNo: form.vehicleNo,
        deliveryPerson: form.deliveryPerson,
        poNo: form.poNo,
        poDate: form.poDate || null,
        cillNo: form.cillNo,
        dispatchDate: form.dispatchDate,
        processingNotes: form.processingNotes,
        items: items.map((it, idx) => ({
          material: it.material,
          drawingNo: it.drawingNo,
          hrc: it.hrc,
          woNo: it.woNo,
          hsnCode: it.hsnCode,
          sacNo: it.sacNo,
          quantity: toNum(it.qty, 0),
          weight: toNum(it.weight, 0),
          qtyOut: idx === 0 ? toNum(form.dispatchQty, 0) : 0,
          rate: toNum(it.rate, 0),
          amount: toNum(it.amount, 0),
          uom: 'KGS',
          description: [it.partName, it.material, it.processName].filter(Boolean).join(' - ') || it.material,
          processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
          processName: it.processName || null,
        })),
      };

      const r = await api.post('/jobwork/inward-to-runsheet', payload);
      const { challan, jobCard, runsheet } = r.data.data;
      setCreatedChallan(challan);
      setCreatedJobCard(jobCard);
      setCreatedRunSheet(runsheet);
      toast.success(`Created challan ${challan.challanNo}, job card ${jobCard.jobCardNo}, run sheet ${runsheet.runsheetNumber}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating full workflow');
    } finally {
      setCreatingFullFlow(false);
    }
  };

  const totalQty    = items.reduce((sum, it) => sum + toNum(it.qty, 0), 0);
  const totalWeight = items.reduce((sum, it) => sum + toNum(it.weight, 0), 0);
  const totalAmount = items.reduce((sum, it) => sum + toNum(it.amount, 0), 0);

  const formatDisplayDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';
  const previewMaterial = items.length > 0
    ? items.map(it => [it.partName, it.material].filter(Boolean).join(' ')).filter(Boolean).join(' | ') || '—'
    : '—';
  const dispatchQty = toNum(form.dispatchQty, 0);
  const balanceQty = totalQty - dispatchQty;

  const selectedCustomerName = parties.find(p => p.id === toInt(form.fromPartyId))?.name || '—';

  const previewCards = [
    { label: 'COMPANY NAME', value: selectedCustomerName },
    { label: 'MATERIAL', value: previewMaterial },
    { label: 'CHALLAN NO', value: form.challanNo || '—' },
    { label: 'CHALLAN DATE', value: formatDisplayDate(form.challanDate) },
    { label: 'PO NO', value: form.poNo || '—' },
    { label: 'CILL NO', value: form.cillNo || '—' },
    { label: 'MATERIAL IN DATE', value: formatDisplayDate(form.materialInDate) },
    { label: 'QTY', value: totalQty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
    { label: 'WEIGHT', value: totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
    { label: 'JOBCARD NO', value: createdJobCard?.jobCardNo || 'Will be generated' },
    { label: 'JOBCARD DATE', value: createdJobCard ? formatDisplayDate(createdJobCard.createdAt || createdJobCard.receivedDate) : 'Will be generated' },
    { label: 'RUNSHEET NO', value: createdRunSheet?.runsheetNumber || 'Will be generated' },
    { label: 'DISPATCH QTY', value: String(dispatchQty) },
    { label: 'DISPATCH DATE', value: formatDisplayDate(form.dispatchDate) },
    { label: 'BAL QTY', value: balanceQty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
    { label: 'EST. AMOUNT (₹)', value: totalAmount > 0 ? totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—' },
    { label: 'VEHICLE NO', value: form.vehicleNo || '—' },
  ];

  return (
    <div className="page-stack w-full animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/jobwork/register"
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Inward Entry</h2>
          <p className="text-xs text-slate-400 font-semibold">Record customer material received and create challan</p>
        </div>
      </div>

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 mb-5">
            {previewCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{card.label}</div>
                <div className="text-sm font-bold text-slate-900 leading-tight">{card.value}</div>
              </div>
            ))}
          </div>

        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Challan Details Section */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-500 text-[15px]">description</span>
            </div>
            <p className="section-title">Challan Details</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* Company Name = Customer */}
            <div className="md:col-span-2">
              <label className="form-label">Company Name <span className="text-rose-500">*</span></label>
              <select
                value={form.fromPartyId}
                onChange={(e) => handleFormChange('fromPartyId', e.target.value)}
                className="form-input font-semibold"
                required
              >
                <option value="">— Select Customer —</option>
                {parties
                  .filter(p => p.partyType === 'CUSTOMER')
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="form-label">Challan No</label>
              <input
                type="text"
                value={form.challanNo}
                onChange={(e) => handleFormChange('challanNo', e.target.value)}
                placeholder="Auto-generate if blank"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Challan Date</label>
              <input type="date" value={form.challanDate}
                onChange={(e) => handleFormChange('challanDate', e.target.value)} className="form-input" />
            </div>

            <div>
              <label className="form-label">Material In Date</label>
              <input type="date" value={form.materialInDate}
                onChange={(e) => handleFormChange('materialInDate', e.target.value)} className="form-input" />
            </div>

            <div>
              <label className="form-label">PO No</label>
              <input type="text" value={form.poNo}
                onChange={(e) => handleFormChange('poNo', e.target.value)}
                placeholder="Optional" className="form-input" />
            </div>

            <div>
              <label className="form-label">PO Date</label>
              <input type="date" value={form.poDate}
                onChange={(e) => handleFormChange('poDate', e.target.value)} className="form-input" />
            </div>

            <div>
              <label className="form-label">Cill No</label>
              <input type="text" value={form.cillNo}
                onChange={(e) => handleFormChange('cillNo', e.target.value)}
                placeholder="Optional" className="form-input" />
            </div>

            <div>
              <label className="form-label">Vehicle No</label>
              <input type="text" value={form.vehicleNo}
                onChange={(e) => handleFormChange('vehicleNo', e.target.value)}
                placeholder="e.g. MH14HU9157" className="form-input" />
            </div>

            <div>
              <label className="form-label">Delivery Person</label>
              <input type="text" value={form.deliveryPerson}
                onChange={(e) => handleFormChange('deliveryPerson', e.target.value)}
                placeholder="Optional" className="form-input" />
            </div>

          </div>

          {/* Processing Notes */}
          <div>
            <label className="form-label">Processing Notes</label>
            <textarea
              value={form.processingNotes}
              onChange={(e) => handleFormChange('processingNotes', e.target.value)}
              placeholder="Any special instructions..."
              rows={2}
              className="form-input"
            />
          </div>
        </div>

        {/* Items Section */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-[15px]">inventory_2</span>
              </div>
              <p className="section-title">Items Received</p>
              <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">
                {items.length} items
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="btn-sm btn-primary"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <span className="material-symbols-outlined text-5xl opacity-20 block mb-2">box</span>
              <p className="font-semibold">No items added yet</p>
              <p className="text-xs mt-1">Click "Add Item" to start</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 mb-4">
                {previewCards.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500 mb-2">{card.label}</div>
                    <div className="text-sm font-bold text-slate-900 leading-tight break-words">{card.value}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={item.id} className="p-4 border-2 border-slate-100 rounded-lg hover:border-indigo-200 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Item {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-rose-500 hover:text-rose-700 text-sm font-bold"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {/* Process Selection Row */}
                  <div className="pb-3 border-b border-slate-200 mb-0">
                    <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">PROCESS</label>
                    <select
                      value={item.processTypeId}
                      onChange={(e) => handleProcessChange(item.id, e.target.value)}
                      className="form-input text-sm font-bold"
                    >
                      <option value="">— Select Process —</option>
                      {processes.filter(p => p.isActive !== false).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.pricePerKg ? ` (₹${Number(p.pricePerKg).toFixed(0)}/kg)` : ''}
                        </option>
                      ))}
                    </select>
                    {item.processName && (
                      <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Rate auto-fills from process pricing · editable below</p>
                    )}
                  </div>

                  {/* Row 1: Material Info */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pb-3 border-b border-slate-200 mt-3">
                    <div className="md:col-span-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">PART NAME / DESCRIPTION</label>
                      <input
                        type="text"
                        value={item.partName || ''}
                        onChange={(e) => handleItemChange(item.id, 'partName', e.target.value)}
                        placeholder="e.g., GEARS, INSERT, HUB INSERT"
                        className="form-input text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">MATERIAL GRADE</label>
                      <input
                        type="text"
                        value={item.material}
                        onChange={(e) => handleItemChange(item.id, 'material', e.target.value)}
                        placeholder="e.g., H13, D2, M2"
                        className="form-input text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">HRC / SPECIFICATION</label>
                      <input
                        type="text"
                        value={item.hrc}
                        onChange={(e) => handleItemChange(item.id, 'hrc', e.target.value)}
                        placeholder="e.g., 54-56"
                        className="form-input text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">DRAWING NO</label>
                      <input
                        type="text"
                        value={item.drawingNo}
                        onChange={(e) => handleItemChange(item.id, 'drawingNo', e.target.value)}
                        placeholder="Optional"
                        className="form-input text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">WO/REF NO</label>
                      <input
                        type="text"
                        value={item.woNo || ''}
                        onChange={(e) => handleItemChange(item.id, 'woNo', e.target.value)}
                        placeholder="Optional"
                        className="form-input text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">HSN CODE</label>
                      <input
                        type="text"
                        value={item.hsnCode || ''}
                        onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                        placeholder="Optional"
                        className="form-input text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">SAC NO</label>
                      <input
                        type="text"
                        value={item.sacNo || ''}
                        onChange={(e) => handleItemChange(item.id, 'sacNo', e.target.value)}
                        placeholder="Optional"
                        className="form-input text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 2: Qty, Weight & Amount */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">QTY (PCS)</label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                        placeholder="0"
                        className="form-input text-sm font-bold"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">WEIGHT (KGS)</label>
                      <input
                        type="number"
                        value={item.weight}
                        onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)}
                        placeholder="0"
                        className="form-input text-sm font-bold"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">RATE (₹)</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        placeholder="0"
                        className="form-input text-sm font-bold"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">AMOUNT (₹)</label>
                      <div className="form-input text-sm font-black text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center">
                        {toNum(item.amount, 0) > 0
                          ? toNum(item.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

          {/* Totals */}
          {items.length > 0 && (
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white rounded-lg p-3 border-2 border-indigo-100">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-2 tracking-wider">Total Qty (KGS)</p>
                  <p className="text-3xl font-black text-indigo-700">{totalQty.toLocaleString('en-IN', {maximumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border-2 border-amber-100">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-2 tracking-wider">Total Weight (KGS)</p>
                  <p className="text-3xl font-black text-amber-700">{totalWeight.toLocaleString('en-IN', {maximumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border-2 border-slate-200">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-2 tracking-wider">Items Count</p>
                  <p className="text-3xl font-black text-slate-700">{items.length}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border-2 border-emerald-100">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-2 tracking-wider">Est. Amount (₹)</p>
                  <p className="text-2xl font-black text-emerald-700">
                    {totalAmount > 0 ? totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={loading || creatingFullFlow}
            className="btn-primary flex-1"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Create Inward Entry
              </>
            )}
          </button>
          <button
            type="button"
            disabled={creatingFullFlow || loading}
            onClick={handleCreateFullWorkflow}
            className="btn-secondary flex-1"
          >
            {creatingFullFlow ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Creating Full Workflow...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">auto_awesome_motion</span>
                Create Inward + Job Card + Run Sheet
              </>
            )}
          </button>
          <Link to="/jobwork/register" className="btn-ghost">
            Cancel
          </Link>
        </div>
      </form>

      {/* Created Challan Section */}
      {createdChallan && (
        <div className="card p-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-800">Challan Created Successfully</h3>
              <p className="text-sm text-green-600">Challan No: <span className="font-mono font-bold">{createdChallan.challanNo}</span></p>
            </div>
          </div>

          {!createdJobCard && (
            <div className="space-y-4">
              <p className="text-sm text-green-700">Now create a job card for this challan. Job card number and date will be generated automatically.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateJobCard}
                  disabled={creatingJobCard}
                  className="btn-primary"
                >
                  {creatingJobCard ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      Creating Job Card...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">add</span>
                      Create Job Card
                    </>
                  )}
                </button>
                <Link to="/jobwork/register" className="btn-ghost">
                  View Register
                </Link>
              </div>
            </div>
          )}

          {createdJobCard && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 text-[16px]">check_circle</span>
                </div>
                <p className="text-sm text-green-700">
                  Job Card Created: <span className="font-mono font-bold">{createdJobCard.jobCardNo}</span>
                </p>
              </div>
              {createdRunSheet ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-700">
                    Run Sheet Created: <span className="font-mono font-bold">{createdRunSheet.runsheetNumber}</span>
                  </p>
                  <div className="flex gap-3">
                    <Link to={`/manufacturing/runsheet/${createdRunSheet.id}`} className="btn-primary">
                      <span className="material-symbols-outlined text-sm">engineering</span>
                      View Run Sheet
                    </Link>
                    <Link to="/jobwork/register" className="btn-ghost">
                      View Register
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-green-700">Next: Create a run sheet for this job card in the Manufacturing section.</p>
                  <div className="flex gap-3">
                    <Link to="/manufacturing/runsheet/new" className="btn-primary">
                      <span className="material-symbols-outlined text-sm">engineering</span>
                      Create Run Sheet
                    </Link>
                    <Link to="/jobwork/register" className="btn-ghost">
                      View Register
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
