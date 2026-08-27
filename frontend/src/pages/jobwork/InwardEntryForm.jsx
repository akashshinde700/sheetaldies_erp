import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, Save, Package, Layers } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useParties, useProcesses, useItems } from '../../hooks/useMasterData';
import { toNum, toInt } from '../../utils/normalize';
import SearchSelect from '../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// AutocompleteInput renders a raw <input>, so it takes the same visual classes
// as the shared <Input> component to stay aligned inside FormField grids.
const INPUT_CLS = 'flex w-full min-h-[44px] sm:min-h-0 sm:h-9 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300/90 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all duration-200 ease-out';

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-inherit rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function AutocompleteInput({ value, onChange, suggestions, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState({});
  const inputRef = useRef(null);
  const filtered = value
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions;
  const visible = filtered.slice(0, 12);

  useEffect(() => { setHighlightedIndex(0); }, [value, open]);

  // Dropdown is position:fixed so it escapes any overflow:hidden/auto ancestor
  // (e.g. the horizontally-scrollable items table) instead of being clipped.
  const updateMenuPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 2,
      left: rect.left,
      minWidth: rect.width,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  const handleSelect = (s) => {
    onChange(s);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { setOpen(true); return; }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(p => Math.min(p + 1, visible.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightedIndex(p => Math.max(p - 1, 0)); return; }
    if (e.key === 'Enter') {
      if (visible.length > 0 && visible[highlightedIndex] !== undefined) {
        e.preventDefault();
        handleSelect(visible[highlightedIndex]);
      }
      return;
    }
    if (e.key === 'Tab') { setOpen(false); }
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && visible.length > 0 && (
        <div
          style={menuStyle}
          className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto w-max"
        >
          {visible.map((s, index) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-3 py-1.5 text-xs truncate ${index === highlightedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'} text-slate-800`}
            >
              {highlightMatch(s, value)}
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

  const [partNameHistorySuggestions, setPartNameHistorySuggestions] = useState([]);
  const [materialHistorySuggestions, setMaterialHistorySuggestions] = useState([]);
  const [hrcHistorySuggestions, setHrcHistorySuggestions] = useState([]);

  const partNameSuggestions = useMemo(() => {
    const names = [
      ...itemsMaster.map(i => i.description).filter(Boolean),
      ...partNameHistorySuggestions,
    ];
    return [...new Set(names)].sort();
  }, [itemsMaster, partNameHistorySuggestions]);

  const materialSuggestions = useMemo(() => {
    const mats = [
      ...itemsMaster.map(i => i.material).filter(Boolean),
      ...materialHistorySuggestions,
    ];
    return [...new Set(mats)].sort();
  }, [itemsMaster, materialHistorySuggestions]);

  const [creatingFullFlow, setCreatingFullFlow] = useState(false);
  const [items, setItems] = useState([]);
  const [issuedBySuggestions, setIssuedBySuggestions] = useState([]);

  useEffect(() => {
    api.get('/jobwork/issued-by-suggestions').then(r => setIssuedBySuggestions(r.data.data || [])).catch(() => {});
    api.get('/jobwork/material-suggestions').then(r => setMaterialHistorySuggestions(r.data.data || [])).catch(() => {});
    api.get('/jobwork/part-name-suggestions').then(r => setPartNameHistorySuggestions(r.data.data || [])).catch(() => {});
    api.get('/jobwork/hrc-suggestions').then(r => setHrcHistorySuggestions(r.data.data || [])).catch(() => {});
  }, []);

  const hrcSuggestions = useMemo(() => {
    const fromItems = items.map(i => i.hrc).filter(Boolean);
    const defaults = ['54-56', '58-60', '60-62', '62-64', '62-65', '64-66'];
    return [...new Set([...fromItems, ...defaults, ...hrcHistorySuggestions])];
  }, [items, hrcHistorySuggestions]);
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
      if (!map[mat]) map[mat] = { qty: 0, weight: 0 };
      map[mat].qty += toNum(it.qty, 0);
      map[mat].weight += toNum(it.weight, 0);
    }
    return Object.entries(map).map(([material, data]) => ({ material, sumQty: data.qty, sumWeight: data.weight }));
  }, [items]);

  const grandTotalWeight = useMemo(() => {
    const dgt = toNum(directGrandTotalWeight, 0);
    if (dgt > 0) return dgt;
    return materialSummary.reduce((sum, { material, sumWeight }) => {
      const direct = toNum(materialWeights[material], 0);
      return sum + (direct > 0 ? direct : sumWeight);
    }, 0);
  }, [materialSummary, materialWeights, directGrandTotalWeight]);

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
    issuedBy: '',
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
    rate: '',
    amount: '0',
    pcQty: '',
    lotQty: '',
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
      const { rate: autoRate } = getEffectiveRate(proc) ?? {};
      const updated = {
        ...it,
        processTypeId,
        processName: proc?.name || '',
        hsnCode: it.hsnCode,
        rate: autoRate ?? it.rate,
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
      if (['weight', 'qty', 'rate'].includes(field)) {
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
            const updated = { ...it, rate: effective.rate ?? it.rate };
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

  // Returns { rate } — inward entry uses only per-kg process pricing for the
  // internally-tracked amount; Pc/Lot are received-quantity fields the user
  // fills in directly, not rates (the per-pc/lot rate lives on the party master
  // and is applied later at invoicing time).
  const getEffectiveRate = (proc, ratesOverride = null) => {
    if (!proc) return null;
    const partyR = (ratesOverride || partyRates)[proc.id];
    const pricePerKg = toNum(partyR?.pricePerKg ?? proc.pricePerKg, 0);
    if (pricePerKg > 0) return { rate: String(pricePerKg.toFixed(2)) };
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
    // Grand total weight entered by user — stored at challan level, NOT distributed to items
    const totalInwardWeight = toNum(directGrandTotalWeight, 0) || null;

    // Qty resolution: item-level → material-level → grand total proportional fallback
    const dgtQ = toNum(directGrandTotalQty, 0);
    const totalSumQty = materialSummary.reduce((s, m) => s + m.sumQty, 0);

    return {
      manualChallanNo: form.challanNo,
      challanDate: form.challanDate,
      fromPartyId: toInt(form.fromPartyId),
      toPartyId: resolvedToPartyId,
      receivedDate: form.materialInDate,
      invoiceChNo: form.invoiceRef,
      vehicleNo: form.vehicleNo,
      deliveryPerson: form.deliveryPerson,
      issuedBy: form.issuedBy || null,
      poNo: form.poNo,
      poDate: form.poDate || null,
      processingNotes: form.processingNotes,
      totalInwardWeight,
      items: items.map((it) => {
        const mat = it.material?.trim() || '(unknown)';
        const matEntry = materialSummary.find(m => m.material === mat);

        // Qty resolution (unchanged)
        const itemQty = toNum(it.qty, 0);
        let resolvedQty = itemQty;
        if (resolvedQty === 0) {
          const directQty = dgtQ > 0
            ? (materialSummary.length > 0 ? dgtQ / materialSummary.length : 0)
            : toNum(materialQtys[mat], 0);
          const itemCount = matEntry ? items.filter(i => (i.material?.trim() || '(unknown)') === mat).length : 1;
          if (directQty > 0 && itemCount > 0) resolvedQty = directQty / itemCount;
        }

        return {
          material: it.material,
          drawingNo: it.drawingNo,
          hrc: it.hrc,
          woNo: it.woNo,
          hsnCode: it.hsnCode,
          sacNo: it.sacNo,
          quantity: resolvedQty,
          weight: it.weight ? toNum(it.weight, null) : null, // per-item weight optional, no auto-calc
          rate: toNum(it.rate, 0),
          amount: toNum(it.amount, 0),
          pcQty: it.pcQty ? toNum(it.pcQty, null) : null,
          lotQty: it.lotQty ? toNum(it.lotQty, null) : null,
          uom: 'KGS',
          description: it.partName?.trim() || null,
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
  const totalAmount = items.reduce((sum, it) => sum + toNum(it.amount, 0), 0);

  return (
    <div className="font-app mx-auto w-full max-w-5xl space-y-5 pb-4 animate-slide-up">
      <PageHeader
        title="Inward Entry"
        backTo="/jobwork/register"
        breadcrumbs={[{ label: 'Inwards', to: '/jobwork/register' }, { label: 'New' }]}
      />

      <form onSubmit={handleSubmit} className="space-y-5" id="inward-form">
        {/* Challan Details */}
        <Card>
          <CardHeader>
            <CardTitle>Challan Details</CardTitle>
            <CardDescription>Customer, challan references and transport details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ── Challan basics ── */}
            <div className="space-y-3">
              <GroupTitle>Challan</GroupTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4">
                <FormField label="Company Name" required className="sm:col-span-2">
                  <div className="flex gap-2">
                    <SearchSelect
                      value={String(form.fromPartyId || '')}
                      onChange={v => handleFormChange('fromPartyId', v)}
                      options={parties.filter(p => p.partyType === 'CUSTOMER').map(p => ({ value: p.id, label: p.name }))}
                      placeholder="— Select Customer —"
                      required
                      className="flex-1 font-semibold"
                    />
                    <Button type="button" variant="outline" onClick={openPartyModal} className="shrink-0">
                      <Plus /> New
                    </Button>
                  </div>
                </FormField>

                <FormField label="Challan No" htmlFor="in-challan-no" hint="Tax document — auto-generated if blank">
                  <Input
                    id="in-challan-no"
                    value={form.challanNo}
                    onChange={(e) => handleFormChange('challanNo', e.target.value)}
                    placeholder="Auto-generate if blank"
                  />
                </FormField>

                <FormField label="Challan Date" htmlFor="in-challan-date">
                  <Input
                    id="in-challan-date"
                    type="date"
                    value={form.challanDate}
                    onChange={(e) => handleFormChange('challanDate', e.target.value)}
                  />
                </FormField>

                <FormField label="Material In Date" htmlFor="in-material-date">
                  <Input
                    id="in-material-date"
                    type="date"
                    value={form.materialInDate}
                    onChange={(e) => handleFormChange('materialInDate', e.target.value)}
                  />
                </FormField>

                <FormField label="PO No" htmlFor="in-po-no">
                  <Input
                    id="in-po-no"
                    value={form.poNo}
                    onChange={(e) => handleFormChange('poNo', e.target.value)}
                    placeholder="Optional"
                  />
                </FormField>

                <FormField label="PO Date" htmlFor="in-po-date">
                  <Input
                    id="in-po-date"
                    type="date"
                    value={form.poDate}
                    onChange={(e) => handleFormChange('poDate', e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            {/* ── Transport & people ── */}
            <div className="space-y-3">
              <GroupTitle>Transport &amp; People</GroupTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
                <FormField label="Vehicle No" htmlFor="in-vehicle-no">
                  <Input
                    id="in-vehicle-no"
                    value={form.vehicleNo}
                    onChange={(e) => handleFormChange('vehicleNo', e.target.value)}
                    placeholder="e.g. MH14HU9157"
                  />
                </FormField>

                <FormField label="Delivery Person" htmlFor="in-delivery-person">
                  <Input
                    id="in-delivery-person"
                    value={form.deliveryPerson}
                    onChange={(e) => handleFormChange('deliveryPerson', e.target.value)}
                    placeholder="Optional"
                  />
                </FormField>

                <FormField label="Issued By">
                  <AutocompleteInput
                    value={form.issuedBy}
                    onChange={v => handleFormChange('issuedBy', v)}
                    suggestions={issuedBySuggestions}
                    placeholder="Person who issued material"
                    className={INPUT_CLS}
                  />
                </FormField>
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="space-y-3">
              <GroupTitle>Notes</GroupTitle>
              <FormField label="Processing Notes" htmlFor="in-processing-notes">
                <Textarea
                  id="in-processing-notes"
                  value={form.processingNotes}
                  onChange={(e) => handleFormChange('processingNotes', e.target.value)}
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle>Items Received</CardTitle>
                {items.length > 0 && (
                  <Badge variant="warning" className="px-2 py-0.5 text-[10px] tabular-nums">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <CardDescription>Parts and material received with this challan.</CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
              <Plus /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Package className="h-5 w-5 text-amber-300" />
                </div>
                <p className="text-sm text-slate-500">No items added yet.</p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus /> Add first item
                </Button>
              </div>
            ) : (
              <>
                {items.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
                    {/* Row header */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-700 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 truncate">
                          {item.partName || 'New item'}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        aria-label={`Remove item ${idx + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    {/* Primary fields — Process / Part / Material, then HRC / Qty / Wt */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <FormField label="Process">
                          <SearchSelect
                            value={String(item.processTypeId || '')}
                            onChange={v => handleProcessChange(item.id, v)}
                            options={processes.filter(p => p.isActive !== false).map(p => ({ value: p.id, label: p.name }))}
                            placeholder="— Process —"
                            useFixed
                            dense
                            className="w-full"
                          />
                        </FormField>
                        <FormField label="Part Name" className="sm:col-span-2">
                          <AutocompleteInput
                            value={item.partName || ''}
                            onChange={(v) => handleItemChange(item.id, 'partName', v)}
                            suggestions={partNameSuggestions}
                            placeholder="Part name…"
                            className={`${INPUT_CLS} font-semibold`}
                          />
                        </FormField>
                        <FormField label="Material">
                          <AutocompleteInput
                            value={item.material || ''}
                            onChange={(v) => handleItemChange(item.id, 'material', v)}
                            suggestions={materialSuggestions}
                            placeholder="D2, H13…"
                            className={`${INPUT_CLS} font-semibold`}
                          />
                        </FormField>
                        <FormField label="HRC">
                          <AutocompleteInput
                            value={item.hrc || ''}
                            onChange={(v) => handleItemChange(item.id, 'hrc', v)}
                            suggestions={hrcSuggestions}
                            placeholder="54-56"
                            className={INPUT_CLS}
                          />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label="Qty">
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={item.qty}
                              onChange={(e) => handleItemChange(item.id, 'qty', e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="0"
                              className="text-right tabular-nums"
                              min="0" step="1"
                            />
                          </FormField>
                          <FormField label="Wt (kg)">
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={item.weight}
                              onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)}
                              placeholder="0.00"
                              className="text-right tabular-nums"
                              min="0" step="0.01"
                            />
                          </FormField>
                        </div>
                      </div>

                      {/* Secondary fields — hidden until needed */}
                      <Accordion type="single" collapsible>
                        <AccordionItem value="more">
                          <AccordionTrigger className="text-xs text-slate-500">More details — pieces, lot, drawing, HSN / SAC</AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-3">
                              <FormField label="Pc">
                                <Input type="number" inputMode="numeric" value={item.pcQty}
                                  onChange={(e) => handleItemChange(item.id, 'pcQty', e.target.value.replace(/[^0-9]/g, ''))}
                                  placeholder="0" className="text-right tabular-nums" min="0" step="1" />
                              </FormField>
                              <FormField label="Lot">
                                <Input type="number" inputMode="numeric" value={item.lotQty}
                                  onChange={(e) => handleItemChange(item.id, 'lotQty', e.target.value.replace(/[^0-9]/g, ''))}
                                  placeholder="0" className="text-right tabular-nums" min="0" step="1" />
                              </FormField>
                              <FormField label="Drawing No">
                                <Input value={item.drawingNo}
                                  onChange={(e) => handleItemChange(item.id, 'drawingNo', e.target.value)} placeholder="Optional" />
                              </FormField>
                              <FormField label="WO / Ref No">
                                <Input value={item.woNo || ''}
                                  onChange={(e) => handleItemChange(item.id, 'woNo', e.target.value)} placeholder="Optional" />
                              </FormField>
                              <FormField label="HSN Code">
                                <Input value={item.hsnCode || ''}
                                  onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)} placeholder="Optional" />
                              </FormField>
                              <FormField label="SAC No">
                                <Input value={item.sacNo || ''}
                                  onChange={(e) => handleItemChange(item.id, 'sacNo', e.target.value)} placeholder="Optional" />
                              </FormField>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                ))}

                {/* Totals + Add Item — bottom */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5">
                  <span className="text-xs font-bold text-slate-500">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-5">
                    <span className="text-xs text-slate-500">
                      Qty{' '}
                      <span className="font-black text-sky-700 tabular-nums">
                        {totalQty > 0 ? totalQty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      Weight{' '}
                      <span className="font-black text-amber-700 tabular-nums">
                        {totalWeight > 0 ? totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' kg' : '—'}
                      </span>
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                      <Plus /> Add Item
                    </Button>
                  </div>
                </div>

                {/* Material Weight Summary */}
                {materialSummary.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Material Weight Summary</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Auto-calculated from item weight/qty — override only if you need a different total</p>
                      </div>
                    </div>
                    {/* Five numeric columns, two of them editable — scroll rather
                        than squeeze them below a usable width. */}
                    <div className="table-responsive">
                      <table className="w-full text-xs min-w-[600px]">
                        <thead>
                          <tr>
                            <th className="th">Material</th>
                            <th className="th text-right">Item Qty (sum)</th>
                            <th className="th text-right w-36">Total Qty (direct)</th>
                            <th className="th text-right">Item Weight (sum)</th>
                            <th className="th text-right w-40">Total Weight (kg)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/80">
                          {materialSummary.map(({ material, sumQty, sumWeight }) => (
                            <tr key={material} className="tr">
                              <td className="td font-semibold text-slate-800">{material}</td>
                              <td className="td text-right text-slate-400 tabular-nums text-[11px]">
                                {sumQty > 0 ? sumQty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                              </td>
                              <td className="td">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={materialQtys[material] ?? ''}
                                  onChange={e => setMaterialQtys(prev => ({ ...prev, [material]: e.target.value }))}
                                  placeholder="0"
                                  aria-label={`Total qty for ${material}`}
                                  className="form-input text-xs py-1 text-right tabular-nums w-full"
                                  min="0" step="1"
                                />
                              </td>
                              <td className="td text-right text-slate-400 tabular-nums text-[11px]">
                                {sumWeight > 0 ? sumWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                              </td>
                              <td className="td">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={materialWeights[material] ?? ''}
                                  onChange={e => setMaterialWeights(prev => ({ ...prev, [material]: e.target.value }))}
                                  placeholder={sumWeight > 0 ? sumWeight.toFixed(2) : '0.00'}
                                  aria-label={`Total weight for ${material}`}
                                  className="form-input text-xs py-1 text-right tabular-nums w-full"
                                  min="0" step="0.01"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-sky-50 border-t-2 border-sky-200">
                          <tr>
                            <td colSpan={2} className="px-4 py-2 text-xs font-bold text-sky-700">
                              <div className="flex flex-col gap-0.5">
                                <span>Grand Total Override</span>
                                <span className="font-normal text-sky-400 text-[9px] normal-case">
                                  Optional: fills blanks only when material summary is incomplete
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                value={directGrandTotalQty}
                                onChange={e => setDirectGrandTotalQty(e.target.value)}
                                placeholder={grandTotalQty > 0 ? String(grandTotalQty) : '0'}
                                aria-label="Grand total qty override"
                                className="form-input text-xs py-1 text-right tabular-nums w-full font-black text-sky-700 border-sky-300"
                                min="0" step="1"
                              />
                            </td>
                            <td className="px-4 py-2 text-right text-sky-400 tabular-nums text-[11px] font-semibold">
                              {materialSummary.reduce((s, m) => s + m.sumWeight, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={directGrandTotalWeight}
                                onChange={e => setDirectGrandTotalWeight(e.target.value)}
                                placeholder={grandTotalWeight > 0 ? grandTotalWeight.toFixed(2) : '0.00'}
                                aria-label="Grand total weight override"
                                className="form-input text-xs py-1 text-right tabular-nums w-full font-black text-amber-700 border-amber-300"
                                min="0" step="0.01"
                              />
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center">
          <Button type="submit" disabled={creatingFullFlow} className="flex-1">
            {creatingFullFlow ? (
              <>
                <Loader2 className="animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Save /> Create Inward
              </>
            )}
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/jobwork/register">Cancel</Link>
          </Button>
        </div>
      </form>

      {/* Quick Create Party — Sheet */}
      <Sheet open={partyModal.open} onOpenChange={(o) => { if (!o) closePartyModal(); }}>
        <SheetContent side="right" className="font-app sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>New customer</SheetTitle>
            <SheetDescription>Add a party and, optionally, its per-process rates.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <FormField label="Party Type">
                  <Select
                    value={partyModal.partyType}
                    onValueChange={v => setPartyModal(p => ({ ...p, partyType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Party type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                      <SelectItem value="VENDOR">VENDOR</SelectItem>
                      <SelectItem value="BOTH">BOTH</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Email" htmlFor="pm-email" hint="Optional">
                  <Input
                    id="pm-email"
                    type="email"
                    value={partyModal.email}
                    onChange={(e) => setPartyModal(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@company.com"
                  />
                </FormField>
              </div>

              <FormField label="Party Name" htmlFor="pm-name" required>
                <Input
                  id="pm-name"
                  value={partyModal.name}
                  onChange={(e) => setPartyModal(p => ({ ...p, name: e.target.value }))}
                  placeholder="Company / Party name"
                />
              </FormField>

              <FormField label="Address" htmlFor="pm-address" required>
                <Textarea
                  id="pm-address"
                  value={partyModal.address}
                  onChange={(e) => setPartyModal(p => ({ ...p, address: e.target.value }))}
                  rows={3}
                  placeholder="Full address"
                />
              </FormField>

              {/* Process Rates */}
              {processes.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <GroupTitle>Process Rates (₹/kg)</GroupTitle>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="table-responsive">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead>
                          <tr>
                            <th className="th">Process</th>
                            <th className="th">Rate/Kg (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/80">
                          {processes.filter(p => p.isActive !== false).map(pt => (
                            <tr key={pt.id} className="tr">
                              <td className="td font-medium text-slate-700">
                                {pt.name}
                              </td>
                              <td className="td">
                                <input
                                  type="number" step="0.01" min="0"
                                  inputMode="decimal"
                                  value={partyModal.rates[pt.id] ?? ''}
                                  onChange={(e) => setPartyRate(pt.id, e.target.value)}
                                  className="form-input py-1 text-xs text-right tabular-nums w-24"
                                  placeholder={pt.pricePerKg ?? '—'}
                                  aria-label={`Rate per kg for ${pt.name}`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">Leave blank to use global process rate. Party rate takes priority during inward entry.</p>
                </div>
              )}
          </div>

          <SheetFooter>
            <Button type="button" variant="ghost" onClick={closePartyModal}>Cancel</Button>
            <Button type="button" onClick={createPartyQuick} disabled={partyModal.saving}>
              {partyModal.saving
                ? <><Loader2 className="animate-spin" /> Saving...</>
                : <><Save /> Create Party</>
              }
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
