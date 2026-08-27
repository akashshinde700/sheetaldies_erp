import { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toInt, toNum } from '../../utils/normalize';
import { useParties, useItems, useMasterJobCards, useProcesses } from '../../hooks/useMasterData';

// Subcomponents
import ChallanDetailsSection from './components/ChallanDetailsSection';
import LineItemsSection from './components/LineItemsSection';
import TaxTotalsSection from './components/TaxTotalsSection';

// UI primitives
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Stepper, useStepper } from '@/components/ui/stepper';
import { Save, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

export default function JobworkForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Use global cached hooks
  const { data: parties = [] } = useParties();
  const { data: items = [] } = useItems();
  const { data: processes = [] } = useProcesses();
  // We'll fetch jobcards locally or use a custom hook. 
  // Let's assume we use a hook for jobcards as well.
  const { data: jobCards = [] } = useMasterJobCards ? useMasterJobCards() : { data: [] };

  const [loading,  setLoading]  = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const addDays = (dateStr, days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    challanDate: today,
    jobCardId: '', fromPartyId: '', toPartyId: '',
    invoiceChNo: '', invoiceChDate: '',
    transportMode: 'Hand Delivery', vehicleNo: '', deliveryPerson: '',
    dispatchDate: today,
    dueDate: addDays(today, 4), processingNotes: '', handlingCharges: '0',
    cgstRate: '0', sgstRate: '0', igstRate: '0',
  });
  const [manualChallanNo, setManualChallanNo] = useState(true);
  const [challanNoInput, setChallanNoInput] = useState('');

  const EMPTY_ROW = { id: null, itemId: '', description: '', drawingNo: '', material: '', hrc: '', woNo: '', hsnCode: '', quantity: '', qtyOut: '', uom: 'KGS', weight: '', rate: '', amount: '', processTypeId: '', processName: '', _processKey: '' };
  const [lineItems, setLineItems] = useState([{ ...EMPTY_ROW }]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);

  const removeLineItem = (i) => {
    setLineItems((prev) => {
      const row = prev[i];
      if (row?.id) setDeletedItemIds((ids) => [...ids, row.id]);
      return prev.filter((_, idx) => idx !== i);
    });
  };
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!isEdit) {
          const own = parties.find((p) => p.partyType === 'BOTH') || parties[0];
          if (own) setForm((p) => ({ ...p, fromPartyId: String(own.id) }));
        }

        if (isEdit) {
          const challanRes = await api.get(`/jobwork/${id}`);
          if (!mounted) return;
          const challan = challanRes.data.data;
          setForm((prev) => ({
            ...prev,
            challanDate: challan.challanDate ? challan.challanDate.split('T')[0] : today,
            jobCardId: challan.jobCardId ? String(challan.jobCardId) : '',
            fromPartyId: challan.fromPartyId ? String(challan.fromPartyId) : '',
            toPartyId: challan.toPartyId ? String(challan.toPartyId) : '',
            invoiceChNo: challan.invoiceChNo || '',
            invoiceChDate: challan.invoiceChDate ? challan.invoiceChDate.split('T')[0] : '',
            transportMode: challan.transportMode || 'Hand Delivery',
            vehicleNo: challan.vehicleNo || '',
            deliveryPerson: challan.deliveryPerson || '',
            dispatchDate: challan.dispatchDate ? challan.dispatchDate.split('T')[0] : '',
            dueDate: challan.dueDate ? challan.dueDate.split('T')[0] : '',
            processingNotes: challan.processingNotes || '',
            handlingCharges: String(challan.handlingCharges ?? 0),
            cgstRate: String(challan.cgstRate ?? 0),
            sgstRate: String(challan.sgstRate ?? 0),
            igstRate: String(challan.igstRate ?? 0),
          }));
          setChallanNoInput(challan.challanNo || '');
          setManualChallanNo(false);

          const mappedItems = (challan.items || []).map((it) => ({
            id: it.id,
            itemId: it.itemId ? String(it.itemId) : '',
            description: it.description || '',
            drawingNo: it.drawingNo || '',
            material: it.material || '',
            hrc: it.hrc || '',
            woNo: it.woNo || '',
            hsnCode: it.hsnCode || '',
            quantity: String(it.quantity ?? ''),
            qtyOut: String(it.qtyOut ?? ''),
            uom: it.uom || 'KGS',
            weight: String(it.weight ?? ''),
            rate: String(it.rate ?? ''),
            amount: String(it.amount ?? ''),
            processTypeId: it.processTypeId ? String(it.processTypeId) : '',
            processName: it.processName || '',
            _processKey: '',
          }));
          if (mappedItems.length) {
            setLineItems(mappedItems);
          }
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load jobwork form data.');
      } finally {
        if (mounted) setInitLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id, isEdit, parties]);

  const updateLineItem = (i, field, val) => {
    setLineItems(prev => {
      const arr = [...prev];
      arr[i] = { ...arr[i], [field]: val };
      if (field === 'quantity' || field === 'rate') {
        const q = toNum(field === 'quantity' ? val : arr[i].quantity, 0);
        const r = toNum(field === 'rate' ? val : arr[i].rate, 0);
        arr[i].amount = (q * r).toFixed(2);
      }
      if (field === 'itemId') {
        const item = items.find(it => it.id === toInt(val));
        if (item) { arr[i].description = item.description || item.partNo || ''; arr[i].hsnCode = item.hsnCode || ''; }
      }
      if (field === 'processTypeId') {
        const proc = processes.find(p => p.id === toInt(val));
        arr[i].processName = proc?.name || '';
      }
      return arr;
    });
  };

  const JW_STEPS = [
    { key: 'challan', label: 'Challan details' },
    { key: 'items',   label: 'Line items' },
  ];
  const wiz = useStepper(JW_STEPS.length);
  const LAST = JW_STEPS.length - 1;

  const subtotal   = lineItems.reduce((s, it) => s + toNum(it.amount, 0), 0);
  const total      = subtotal + toNum(form.handlingCharges, 0);
  const cgstAmt    = toNum((total * toNum(form.cgstRate, 0) / 100).toFixed(2), 0);
  const sgstAmt    = toNum((total * toNum(form.sgstRate, 0) / 100).toFixed(2), 0);
  const igstAmt    = toNum((total * toNum(form.igstRate, 0) / 100).toFixed(2), 0);
  const grandTotal = total + cgstAmt + sgstAmt + igstAmt;

  const fillFromImage = () => {
    const jobCard = jobCards[0] || {};
    const fromParty = parties[0] || {};
    const toParty = parties.find(p => p.partyType === 'VENDOR' || p.partyType === 'BOTH') || parties[0] || {};
    setForm({
      challanDate: today,
      jobCardId: jobCard.id ? String(jobCard.id) : '',
      fromPartyId: fromParty.id ? String(fromParty.id) : '',
      toPartyId: toParty.id ? String(toParty.id) : '',
      invoiceChNo: jobCard.jobCardNo ? `INV-${jobCard.jobCardNo || '0001'}` : '',
      invoiceChDate: today,
      transportMode: 'Hand Delivery',
      vehicleNo: '',
      deliveryPerson: '',
      dispatchDate: today,
      dueDate: addDays(today, 4),
      processingNotes: `Process for job card ${jobCard.jobCardNo || ''}`,
      handlingCharges: '0',
      cgstRate: '0',
      sgstRate: '0',
      igstRate: '0',
    });

    const item = items[0] || {};
    setLineItems([{ ...EMPTY_ROW,
      itemId: item.id ? String(item.id) : '',
      description: item.description || item.partNo || 'AutoItem',
      drawingNo: item.drawingNo || '',
      material: item.material || 'H13',
      hrc: item.hrc || '',
      woNo: item.woNo || '',
      hsnCode: item.hsnCode || item.hsnSacCode || '998898',
      quantity: item.quantity ? String(item.quantity) : '1',
      qtyOut: item.quantity ? String(item.quantity) : '1',
      uom: 'KGS',
      weight: item.weight ? String(item.weight) : '',
      rate: item.rate ? String(item.rate) : '0',
      amount: item.amount ? String(item.amount) : '0',
    }]);

    setManualChallanNo(false);
    setChallanNoInput('');
    toast.success('Jobwork values loaded from DB-backed sample.');
  };

  // Re-fetch items from the server and reset local item state to match —
  // used after a partial save failure so the UI never shows a different
  // state than what's actually persisted.
  const syncItemsFromServer = async () => {
    const jr = await api.get(`/jobwork/${id}`);
    const mapped = (jr.data.data.items || []).map((it) => ({
      id: it.id,
      itemId: it.itemId ? String(it.itemId) : '',
      description: it.description || '',
      drawingNo: it.drawingNo || '',
      material: it.material || '',
      hrc: it.hrc || '',
      woNo: it.woNo || '',
      hsnCode: it.hsnCode || '',
      quantity: String(it.quantity ?? ''),
      qtyOut: String(it.qtyOut ?? ''),
      uom: it.uom || 'KGS',
      weight: String(it.weight ?? ''),
      rate: String(it.rate ?? ''),
      amount: String(it.amount ?? ''),
      processTypeId: it.processTypeId ? String(it.processTypeId) : '',
      processName: it.processName || '',
      _processKey: '',
    }));
    setLineItems(mapped.length ? mapped : [{ ...EMPTY_ROW }]);
    setDeletedItemIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromPartyId || !form.toPartyId) {
      toast.error('From and To party are required.');
      wiz.goto(0);
      return;
    }
    if (manualChallanNo && !challanNoInput.trim()) {
      toast.error('Challan number is required when manual  ticked.');
      wiz.goto(0);
      return;
    }
    const validItems = lineItems.filter(it => it.description?.trim() || toNum(it.quantity, 0) > 0);
    if (!validItems.length) {
      toast.error('At least one line item with quantity is required.');
      wiz.goto(1);
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        // Header update uses the safe PUT (no items[] in the payload — that path
        // wipes jobCardId/processTypeId/itemStatus on every item, see below).
        // Item add/edit/remove go through the per-item endpoints instead, which
        // already guard against destructive changes (e.g. removing an item still
        // linked to a job card).
        const { handlingCharges, cgstRate, sgstRate, igstRate, ...headerFields } = form;
        await api.put(`/jobwork/${id}`, { ...headerFields, challanNo: challanNoInput.trim() });

        const existingRows = validItems.filter(it => it.id);
        const newRows      = validItems.filter(it => !it.id);

        const results = await Promise.allSettled([
          ...existingRows.map(row => api.patch(`/jobwork/items/${row.id}`, {
            description: row.description, drawingNo: row.drawingNo, material: row.material,
            hrc: row.hrc, quantity: row.quantity, weight: row.weight,
            processTypeId: row.processTypeId || null, processName: row.processName || null,
          })),
          ...newRows.map(row => api.post(`/jobwork/${id}/items`, row)),
          ...deletedItemIds.map(itemId => api.delete(`/jobwork/items/${itemId}`)),
        ]);

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) {
          failed.forEach(f => toast.error(f.reason?.response?.data?.message || 'One item action failed.'));
          await syncItemsFromServer();
          return;
        }

        toast.success('Challan updated successfully!');
        navigate(`/jobwork/${id}`);
      } else {
        const payload = { ...form, items: validItems, manualChallanNo: manualChallanNo ? challanNoInput.trim() : '' };
        const r = await api.post('/jobwork', payload);
        toast.success(`Challan ${r.data.data.challanNo} created!`);
        navigate('/jobwork');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isEdit ? 'Error updating challan.' : 'Error creating challan.'));
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="text-sm">Loading challan form...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="font-app flex flex-col h-full min-h-0">
      <PageHeader
        title={isEdit ? 'Edit Inward Challan' : 'New Inward Challan'}
        backTo="/jobwork"
        breadcrumbs={[{ label: 'Jobwork', to: '/jobwork' }, { label: isEdit ? (challanNoInput || `#${id}`) : 'New' }]}
        meta={<span className="text-xs text-slate-500">Rule 45(1) CGST Rules, 2017</span>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isEdit && (
              <Button type="button" variant="outline" size="sm" onClick={fillFromImage}>
                <Upload /> Load sample data
              </Button>
            )}
            <Badge variant="warning" className="text-[10px] border border-amber-200">Challan for Job Work</Badge>
          </div>
        }
      />

      <div className="mt-2 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
        <Stepper steps={JW_STEPS} current={wiz.current} completed={wiz.completed} onStepClick={(i) => wiz.goto(i)} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (wiz.current === LAST) handleSubmit(e); }} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 pr-0.5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Step {wiz.current + 1} of {JW_STEPS.length} · {JW_STEPS[wiz.current].label}
        </p>

        {/* ── Step 1 · Challan details ── */}
        <div hidden={wiz.current !== 0} className="space-y-4">
        <ChallanDetailsSection
          isEdit={isEdit} 
          form={form} 
          setForm={setForm} 
          jobCards={jobCards} 
          parties={parties} 
          manualChallanNo={manualChallanNo} 
          setManualChallanNo={setManualChallanNo} 
          challanNoInput={challanNoInput} 
          setChallanNoInput={setChallanNoInput} 
          addDays={addDays} 
        />

        {/* Processing Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField htmlFor="processingNotes" hint="e.g. pre-heat temperature, required hardness, vacuum level">
              <Textarea
                id="processingNotes"
                value={form.processingNotes}
                onChange={e => setForm(p => ({ ...p, processingNotes: e.target.value }))}
                rows={2}
                placeholder="Material pre-heat temperature, hardness required, vacuum level..."
              />
            </FormField>
          </CardContent>
        </Card>

        <datalist id="challan-desc-suggestions">
          <option value="Vacuum Hardening" />
          <option value="Vacuum Hardening + Tempering" />
          <option value="Nitriding" />
          <option value="Deep Cryogenic Treatment" />
          <option value="Stress Relieving" />
          <option value="Annealing" />
          <option value="H13 Die" />
          <option value="D2 Die" />
          <option value="M2 Tool" />
        </datalist>
        </div>

        {/* ── Step 2 · Line items ── */}
        <div hidden={wiz.current !== 1} className="space-y-4">
        <LineItemsSection
          lineItems={lineItems}
          setLineItems={setLineItems}
          items={items}
          updateLineItem={updateLineItem}
          EMPTY_ROW={EMPTY_ROW}
          onRemoveRow={isEdit ? removeLineItem : undefined}
          processes={processes}
        />

        {!isEdit && (
          <TaxTotalsSection
            form={form}
            setForm={setForm}
            subtotal={subtotal}
            cgstAmt={cgstAmt}
            sgstAmt={sgstAmt}
            igstAmt={igstAmt}
            grandTotal={grandTotal}
          />
        )}
        </div>

        </div>

        {/* ── Wizard navigation ── */}
        <div className="shrink-0 mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card sm:px-5">
          <span className="font-app-mono text-xs text-slate-400">Step {wiz.current + 1} of {JW_STEPS.length}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost"><Link to="/jobwork">Cancel</Link></Button>
            <Button type="button" variant="ghost" disabled={wiz.isFirst} onClick={wiz.back}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {wiz.current < LAST ? (
              <Button type="button" onClick={wiz.next}>Next <ChevronRight className="h-4 w-4" /></Button>
            ) : (
              <Button type="button" onClick={handleSubmit} loading={loading} disabled={loading}>
                {!loading && <Save />}
                {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Challan' : 'Create Challan')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
