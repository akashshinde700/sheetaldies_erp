import { useState, useRef, useMemo, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useParties, useProcesses, useItems } from '../../hooks/useMasterData';
import { toNum, toInt } from '../../utils/normalize';
import SearchSelect from '../../components/SearchSelect';

function AutocompleteInput({ value, onChange, suggestions, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const filtered = value
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions;
  const handleSelect = (s) => {
    onChange(s);
    setOpen(false);
  };
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto min-w-[120px] w-max">
          {filtered.slice(0, 12).map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-800 truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InwardEntryForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: parties = [] } = useParties();
  const { data: processesRaw = [] } = useProcesses();
  const { data: itemsMaster = [] } = useItems();

  // Deduplicate processes by name
  const processes = useMemo(() => {
    const uniqueByName = [];
    const seenNames = new Set();
    for (const p of processesRaw) {
      if (!seenNames.has(p.name)) {
        seenNames.add(p.name);
        uniqueByName.push(p);
      }
    }
    return uniqueByName;
  }, [processesRaw]);

  const partNameSuggestions = useMemo(() => {
    const names = itemsMaster.map(i => i.description).filter(Boolean);
    return [...new Set(names)].sort();
  }, [itemsMaster]);

  const materialSuggestions = useMemo(() => {
    const mats = itemsMaster.map(i => i.material).filter(Boolean);
    return [...new Set(mats)].sort();
  }, [itemsMaster]);

  const [creatingFullFlow, setCreatingFullFlow] = useState(false);
  const [items, setItems] = useState([]);

  const hrcSuggestions = useMemo(() => {
    const fromItems = items.map(i => i.hrc).filter(Boolean);
    const defaults = ['54-56', '58-60', '60-62', '62-64', '62-65', '64-66'];
    return [...new Set([...fromItems, ...defaults])];
  }, [items]);
  const [loading, setLoading] = useState(false);
  const [partyRates, setPartyRates] = useState({}); // { [processTypeId]: { pricePerKg, pricePerPc, lotPrice } }
  const [materialWeights, setMaterialWeights] = useState({});
  const [materialQtys, setMaterialQtys] = useState({});
  const [directGrandTotalWeight, setDirectGrandTotalWeight] = useState('');
  const [directGrandTotalQty, setDirectGrandTotalQty] = useState('');

  const materialSummary = useMemo(() => {
    const map = {};
    for (const it of items) {
      const mat = it.material?.trim() || '(unknown)';
      if (!map[mat]) map[mat] = { qty: 0 };
      map[mat].qty += toNum(it.qty, 0);
    }
    return Object.entries(map).map(([material, data]) => ({ material, sumQty: data.qty }));
  }, [items]);

  const grandTotalWeight = useMemo(() => {
    const dgt = toNum(directGrandTotalWeight, 0);
    if (dgt > 0) return dgt;
    return Object.values(materialWeights).reduce((sum, w) => sum + toNum(w, 0), 0);
  }, [materialWeights, directGrandTotalWeight]);

  const grandTotalQty = useMemo(() => {
    const dgt = toNum(directGrandTotalQty, 0);
    if (dgt > 0) return dgt;
    return materialSummary.reduce((sum, { material, sumQty }) => {
      const direct = toNum(materialQtys[material], 0);
      return sum + (direct > 0 ? direct : sumQty);
    }, 0);
  }, [materialSummary, materialQtys, directGrandTotalQty]);
  const [partyModal, setPartyModal] = useState({
    open: false,
    name: '',
    address: '',
    email: '',
    partyType: 'CUSTOMER',
    saving: false,
    rates: {}, // { [processTypeId]: pricePerKg }
  });
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
    lotPrice: '',
    amount: '0',
    processTypeId: '',
    processName: '',
  });

  const calcAmount = (it, overrides = {}) => {
    const lotPrice = toNum(it.lotPrice, 0);
    if (lotPrice > 0) return lotPrice.toFixed(2);
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
      const { rate: autoRate, lotPrice: autoLot } = getEffectiveRate(proc) ?? {};
      const updated = {
        ...it,
        processTypeId,
        processName: proc?.name || '',
        hsnCode: it.hsnCode,
        rate: autoRate ?? it.rate,
        lotPrice: autoLot ?? '',
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
      if (['weight', 'qty', 'rate', 'lotPrice'].includes(field)) {
        updated.amount = calcAmount(updated);
      }
      return updated;
    }));
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'fromPartyId' && value) {
      api.get(`/parties/${value}/process-rates`).then(r => {
        const m = {};
        for (const row of r.data.data || []) {
          if (row.pricePerKg != null || row.pricePerPc != null || row.lotPrice != null) {
            m[row.processTypeId] = { pricePerKg: row.pricePerKg, pricePerPc: row.pricePerPc, lotPrice: row.lotPrice };
          }
        }
        setPartyRates(m);
        setItems(prev => prev.map(it => {
          if (!it.processTypeId) return it;
          const proc = processes.find(p => p.id === toInt(it.processTypeId));
          const effective = getEffectiveRate(proc, m);
          if (effective) {
            const updated = { ...it, rate: effective.rate ?? it.rate, lotPrice: effective.lotPrice ?? '' };
            updated.amount = calcAmount(updated);
            return updated;
          }
          return it;
        }));
      }).catch(() => {
        setPartyRates({});
        toast.error('Could not load party rates. Using default process rates.');
      });
    } else if (field === 'fromPartyId') {
      setPartyRates({});
    }
  };

  // Returns { rate, lotPrice } — rate is always the per-unit price, never weight*rate
  const getEffectiveRate = (proc, ratesOverride = null) => {
    if (!proc) return null;
    const partyR = (ratesOverride || partyRates)[proc.id];
    const lotPrice   = toNum(partyR?.lotPrice   ?? proc.lotPrice,   0);
    const pricePerKg = toNum(partyR?.pricePerKg ?? proc.pricePerKg, 0);
    // Lot price: flat per-lot charge — rate field shows the lot price, amount = lot price
    if (lotPrice > 0) return { rate: String(lotPrice.toFixed(2)), lotPrice: String(lotPrice.toFixed(2)) };
    if (pricePerKg > 0) return { rate: String(pricePerKg.toFixed(2)), lotPrice: '' };
    return null;
  };

  const validateForm = () => {
    if (!form.fromPartyId) { toast.error('Company Name is required'); return false; }
    if (items.length === 0) { toast.error('Add at least one item'); return false; }
    const hasGrandTotalQty = toNum(directGrandTotalQty, 0) > 0;
    if (!hasGrandTotalQty) {
      const anyQtyMissing = items.some(it => {
        const mat = (it.material || '').trim() || '(unknown)';
        return toNum(it.qty, 0) === 0 && toNum(materialQtys[mat], 0) === 0;
      });
      if (anyQtyMissing) {
        toast.error('Set Qty per item, or fill Grand Total Qty in Material Summary');
        return false;
      }
    }
    return true;
  };

  const buildPayload = () => {
    const resolvedToPartyId = parties.find(p => p.partyType === 'BOTH')?.id;
    return {
      manualChallanNo: form.challanNo,
      challanDate: form.challanDate,
      fromPartyId: toInt(form.fromPartyId),
      toPartyId: resolvedToPartyId,
      receivedDate: form.materialInDate,
      invoiceChNo: form.invoiceRef,
      vehicleNo: form.vehicleNo,
      deliveryPerson: form.deliveryPerson,
      poNo: form.poNo,
      poDate: form.poDate || null,
      processingNotes: form.processingNotes,
      items: items.map((it) => {
        const mat = it.material?.trim() || '(unknown)';
        const matEntry = materialSummary.find(m => m.material === mat);
        const dgtW = toNum(directGrandTotalWeight, 0);
        const dgtQ = toNum(directGrandTotalQty, 0);
        const totalSumQty = materialSummary.reduce((s, m) => s + m.sumQty, 0);

        // Resolve weight: item-level → material-level → grand total proportional fallback
        const itemWeight = toNum(it.weight, 0);
        let resolvedWeight = itemWeight;
        if (resolvedWeight === 0) {
          const matW = dgtW > 0
            ? (totalSumQty > 0 ? (dgtW * (matEntry?.sumQty || 0)) / totalSumQty : 0)
            : toNum(materialWeights[mat], 0);
          const directQty = toNum(materialQtys[mat], 0);
          const refQty = directQty > 0 ? directQty : (matEntry?.sumQty || 0);
          const itemQty = toNum(it.qty, 0);
          if (matW > 0 && refQty > 0 && itemQty > 0) {
            resolvedWeight = (matW * itemQty) / refQty;
          } else if (dgtW > 0 && totalSumQty > 0) {
            resolvedWeight = (dgtW * toNum(it.qty, 0)) / totalSumQty;
          }
        }

        // Resolve qty: item-level → material-level → grand total proportional fallback
        const itemQty = toNum(it.qty, 0);
        let resolvedQty = itemQty;
        if (resolvedQty === 0) {
          const directQty = dgtQ > 0
            ? (materialSummary.length > 0 ? dgtQ / materialSummary.length : 0)
            : toNum(materialQtys[mat], 0);
          const itemCount = matEntry ? items.filter(i => (i.material?.trim() || '(unknown)') === mat).length : 1;
          if (directQty > 0 && itemCount > 0) {
            resolvedQty = directQty / itemCount;
          }
        }

        return {
          material: it.material,
          drawingNo: it.drawingNo,
          hrc: it.hrc,
          woNo: it.woNo,
          hsnCode: it.hsnCode,
          sacNo: it.sacNo,
          quantity: resolvedQty,
          weight: resolvedWeight,
          rate: toNum(it.rate, 0),
          amount: toNum(it.amount, 0),
          uom: 'KGS',
          description: [it.partName, it.material, it.processName].filter(Boolean).join(' - ') || it.material,
          processTypeId: it.processTypeId ? toInt(it.processTypeId) : null,
          processName: it.processName || null,
        };
      }),
    };
  };

  const autoSaveMasterData = (itemsList) => {
    for (const it of itemsList) {
      const part = it.partName?.trim();
      const mat  = it.material?.trim();
      if (!part && !mat) continue;
      const partKnown = part && itemsMaster.some(m => m.description?.toLowerCase() === part.toLowerCase());
      const matKnown  = mat  && materialSuggestions.includes(mat);
      if (part && !partKnown) {
        api.post('/items', {
          partNo: `P-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          description: part,
          material: mat || undefined,
        }).catch(() => {});
      } else if (!part && mat && !matKnown) {
        api.post('/items', {
          partNo: `M-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          description: mat,
          material: mat,
        }).catch(() => {});
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setCreatingFullFlow(true);
    try {
      const payload = buildPayload();
      if (!payload.toPartyId) { toast.error('No processor found.'); setCreatingFullFlow(false); return; }
      const r = await api.post('/jobwork/inward-with-jobcards', payload);
      const { challan } = r.data.data;
      toast.success(`Challan ${challan.challanNo} created — select combinations to create Job Cards.`);
      autoSaveMasterData(items);
      navigate(`/jobwork/${challan.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating inward entry');
    } finally {
      setCreatingFullFlow(false);
    }
  };

  const openPartyModal = () => {
    setPartyModal({
      open: true,
      name: '',
      address: '',
      email: '',
      partyType: 'CUSTOMER',
      saving: false,
      rates: {},
    });
  };

  const closePartyModal = () => {
    setPartyModal(p => ({ ...p, open: false, saving: false }));
  };

  const setPartyRate = (ptId, value) => {
    setPartyModal(p => ({ ...p, rates: { ...p.rates, [ptId]: value } }));
  };

  const createPartyQuick = async () => {
    if (!partyModal.name.trim() || !partyModal.address.trim()) {
      toast.error('Party Name and Address are required');
      return;
    }
    setPartyModal(p => ({ ...p, saving: true }));
    try {
      const r = await api.post('/parties/quick', {
        name: partyModal.name.trim(),
        address: partyModal.address.trim(),
        email: partyModal.email.trim() || null,
        partyType: partyModal.partyType,
        rates: Object.entries(partyModal.rates).map(([ptId, pricePerKg]) => ({
          processTypeId: Number(ptId),
          pricePerKg: pricePerKg !== '' ? Number(pricePerKg) : null,
        })),
      });
      const created = r.data.data;
      toast.success(`Party "${created.name}" created!`);
      closePartyModal();
      // Invalidate query cache so party list refreshes without page reload
      await queryClient.invalidateQueries({ queryKey: ['parties'] });
      // Auto-select the newly created party
      if (created?.id) handleFormChange('fromPartyId', created.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create party');
      setPartyModal(p => ({ ...p, saving: false }));
    }
  };

  const totalQty    = items.reduce((sum, it) => sum + toNum(it.qty, 0), 0);
  const totalWeight = items.reduce((sum, it) => sum + toNum(it.weight, 0), 0);

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

      <form onSubmit={handleSubmit} className="space-y-5" id="inward-form">
        {/* Challan Details */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-500 text-[15px]">description</span>
            </div>
            <p className="section-title">Challan Details</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Company Name <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                <SearchSelect
                  value={String(form.fromPartyId || '')}
                  onChange={v => handleFormChange('fromPartyId', v)}
                  options={parties.filter(p => p.partyType === 'CUSTOMER').map(p => ({ value: p.id, label: p.name }))}
                  placeholder="— Select Customer —"
                  required
                  className="flex-1 font-semibold"
                />
                <button
                  type="button"
                  onClick={openPartyModal}
                  className="btn-outline whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0">add</span>
                  New
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">
                Challan No
                <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide">(Tax Doc)</span>
              </label>
              <input type="text" value={form.challanNo}
                onChange={(e) => handleFormChange('challanNo', e.target.value)}
                placeholder="Auto-generate if blank" className="form-input" />
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-[15px]">inventory_2</span>
              </div>
              <p className="section-title">Items Received</p>
              {items.length > 0 && (
                <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">
                  {items.length} items
                </span>
              )}
            </div>
            <button type="button" onClick={handleAddItem} className="btn-sm btn-primary">
              <span className="material-symbols-outlined text-sm">add</span>
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <span className="material-symbols-outlined text-5xl opacity-20 block mb-2">box</span>
              <p className="font-semibold">No items added yet</p>
              <p className="text-xs mt-1">Click "Add Item" to start</p>
            </div>
          ) : (
            <>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs min-w-[820px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-left">
                      <th className="px-2 py-2.5 w-8 text-center font-bold text-[11px] uppercase tracking-wide">#</th>
                      <th className="px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide min-w-[150px]">Process</th>
                      <th className="px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide min-w-[160px]">Part Name</th>
                      <th className="px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide min-w-[110px]">Material</th>
                      <th className="px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide w-20">HRC</th>
                      <th className="px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide w-20 text-right">Qty</th>
                      <th className="px-3 py-2.5 font-bold text-[11px] uppercase tracking-wide w-24 text-right">Wt (kg)</th>
                      <th className="px-2 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <Fragment key={item.id}>
                        <tr className="hover:bg-slate-50 align-middle border-b border-slate-100">
                          <td className="px-2 py-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="px-2 py-1.5">
                            <SearchSelect
                              value={String(item.processTypeId || '')}
                              onChange={v => handleProcessChange(item.id, v)}
                              options={processes.filter(p => p.isActive !== false).map(p => ({ value: p.id, label: p.name }))}
                              placeholder="— Process —"
                              useFixed
                              className="w-full"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <AutocompleteInput
                              value={item.partName || ''}
                              onChange={(v) => handleItemChange(item.id, 'partName', v)}
                              suggestions={partNameSuggestions}
                              placeholder="Part name…"
                              className="w-full form-input text-xs py-1.5 font-semibold"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <AutocompleteInput
                              value={item.material || ''}
                              onChange={(v) => handleItemChange(item.id, 'material', v)}
                              suggestions={materialSuggestions}
                              placeholder="D2, H13…"
                              className="w-full form-input text-xs py-1.5 font-semibold"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <AutocompleteInput
                              value={item.hrc || ''}
                              onChange={(v) => handleItemChange(item.id, 'hrc', v)}
                              suggestions={hrcSuggestions}
                              placeholder="54-56"
                              className="w-full form-input text-xs py-1.5"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                              placeholder="0"
                              className="w-full form-input text-xs py-1.5 text-right"
                              min="0" step="0.01"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={item.weight}
                              onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)}
                              placeholder="0.00"
                              className="w-full form-input text-xs py-1.5 text-right"
                              min="0" step="0.01"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </td>
                        </tr>
                        {/* Secondary fields row — always visible */}
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td></td>
                          <td colSpan={9} className="px-3 py-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Drawing No</label>
                                <input type="text" value={item.drawingNo}
                                  onChange={(e) => handleItemChange(item.id, 'drawingNo', e.target.value)}
                                  placeholder="Optional" className="form-input text-xs py-1.5" />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">WO / Ref No</label>
                                <input type="text" value={item.woNo || ''}
                                  onChange={(e) => handleItemChange(item.id, 'woNo', e.target.value)}
                                  placeholder="Optional" className="form-input text-xs py-1.5" />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">HSN Code</label>
                                <input type="text" value={item.hsnCode || ''}
                                  onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                                  placeholder="Optional" className="form-input text-xs py-1.5" />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">SAC No</label>
                                <input type="text" value={item.sacNo || ''}
                                  onChange={(e) => handleItemChange(item.id, 'sacNo', e.target.value)}
                                  placeholder="Optional" className="form-input text-xs py-1.5" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-xs font-bold text-slate-500">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-black text-indigo-700 tabular-nums">
                        {totalQty > 0 ? totalQty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : ''}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-black text-amber-700 tabular-nums">
                        {totalWeight > 0 ? totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' kg' : ''}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Add Item — bottom */}
              <div className="flex justify-end pt-1">
                <button type="button" onClick={handleAddItem} className="btn-sm btn-outline">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Item
                </button>
              </div>

              {/* Material Weight Summary */}
              {materialSummary.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Material Weight Summary</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Enter total weight per material — used when individual item weight is blank</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="px-4 py-2 font-bold text-[11px] uppercase tracking-wide text-slate-600">Material</th>
                        <th className="px-4 py-2 font-bold text-[11px] uppercase tracking-wide text-slate-600 text-right">Item Qty (sum)</th>
                        <th className="px-4 py-2 font-bold text-[11px] uppercase tracking-wide text-slate-600 text-right w-36">Total Qty (direct)</th>
                        <th className="px-4 py-2 font-bold text-[11px] uppercase tracking-wide text-slate-600 text-right w-40">Total Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materialSummary.map(({ material, sumQty }) => (
                        <tr key={material} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-semibold text-slate-800">{material}</td>
                          <td className="px-4 py-2 text-right text-slate-400 tabular-nums text-[11px]">
                            {sumQty > 0 ? sumQty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={materialQtys[material] ?? ''}
                              onChange={e => setMaterialQtys(prev => ({ ...prev, [material]: e.target.value }))}
                              placeholder="0"
                              className="form-input text-xs py-1 text-right w-full"
                              min="0" step="1"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={materialWeights[material] ?? ''}
                              onChange={e => setMaterialWeights(prev => ({ ...prev, [material]: e.target.value }))}
                              placeholder="0.00"
                              className="form-input text-xs py-1 text-right w-full"
                              min="0" step="0.01"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-indigo-50 border-t-2 border-indigo-300">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-xs font-bold text-indigo-700">
                          Grand Total
                          <span className="ml-1 text-[9px] font-normal text-indigo-400 normal-case">(direct entry overrides material-wise)</span>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={directGrandTotalQty}
                            onChange={e => setDirectGrandTotalQty(e.target.value)}
                            placeholder={grandTotalQty > 0 ? String(grandTotalQty) : '0'}
                            className="form-input text-xs py-1 text-right w-full font-black text-indigo-700 border-indigo-300"
                            min="0" step="1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={directGrandTotalWeight}
                            onChange={e => setDirectGrandTotalWeight(e.target.value)}
                            placeholder={grandTotalWeight > 0 ? grandTotalWeight.toFixed(2) : '0.00'}
                            className="form-input text-xs py-1 text-right w-full font-black text-amber-700 border-amber-300"
                            min="0" step="0.01"
                          />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={creatingFullFlow}
            className="btn-primary flex-1"
          >
            {creatingFullFlow ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Creating…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">auto_awesome_motion</span>
                Create Inward
              </>
            )}
          </button>
          <Link to="/jobwork/register" className="btn-ghost">
            Cancel
          </Link>
        </div>
      </form>

      {/* Quick Create Party Modal */}
      {partyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <div className="text-xs font-black tracking-widest text-slate-400 uppercase">Quick Create Party</div>
                <div className="text-lg font-extrabold text-slate-800 mt-1">New Customer with Process Rates</div>
              </div>
              <button type="button" onClick={closePartyModal} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Party Type</label>
                  <select
                    value={partyModal.partyType}
                    onChange={(e) => setPartyModal(p => ({ ...p, partyType: e.target.value }))}
                    className="form-input"
                  >
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="VENDOR">VENDOR</option>
                    <option value="BOTH">BOTH</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Email (optional)</label>
                  <input
                    type="email"
                    value={partyModal.email}
                    onChange={(e) => setPartyModal(p => ({ ...p, email: e.target.value }))}
                    className="form-input"
                    placeholder="email@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Party Name *</label>
                <input
                  value={partyModal.name}
                  onChange={(e) => setPartyModal(p => ({ ...p, name: e.target.value }))}
                  className="form-input"
                  placeholder="Company / Party name"
                />
              </div>

              <div>
                <label className="form-label">Address *</label>
                <textarea
                  value={partyModal.address}
                  onChange={(e) => setPartyModal(p => ({ ...p, address: e.target.value }))}
                  className="form-input"
                  rows={3}
                  placeholder="Full address"
                />
              </div>

              {/* Process Rates */}
              {processes.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="section-title mb-3">Process Rates (₹/kg)</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs min-w-[400px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Process</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Rate/Kg (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {processes.filter(p => p.isActive !== false).map(pt => (
                          <tr key={pt.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2 font-medium text-slate-700">
                              {pt.name}
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number" step="0.01" min="0"
                                value={partyModal.rates[pt.id] ?? ''}
                                onChange={(e) => setPartyRate(pt.id, e.target.value)}
                                className="form-input py-1 text-xs w-24"
                                placeholder={pt.pricePerKg ?? '—'}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">Leave blank to use global process rate. Party rate takes priority during inward entry.</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 justify-end shrink-0">
              <button type="button" onClick={closePartyModal} className="btn-ghost">Cancel</button>
              <button
                type="button"
                onClick={createPartyQuick}
                disabled={partyModal.saving}
                className="btn-primary"
              >
                {partyModal.saving
                  ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Saving...</>
                  : <><span className="material-symbols-outlined text-sm">save</span> Create Party</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
