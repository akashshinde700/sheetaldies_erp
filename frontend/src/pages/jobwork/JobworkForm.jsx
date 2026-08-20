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

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

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
      return;
    }
    if (manualChallanNo && !challanNoInput.trim()) {
      toast.error('Challan number is required when manual  ticked.');
      return;
    }
    const validItems = lineItems.filter(it => it.description?.trim() || toNum(it.quantity, 0) > 0);
    if (!validItems.length) {
      toast.error('At least one line item with quantity is required.');
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
    <div className="page-stack w-full animate-slide-up">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to="/jobwork"
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div className="space-y-2 min-w-0">
            <h1 className="page-title">{isEdit ? 'Edit Inward Challan' : 'New Inward Challan'}</h1>
            <p className="page-subtitle max-w-2xl">Manage inward challans with a cleaner header and consistent page spacing.</p>
            {isEdit ? (
              <p className="text-xs text-slate-500">Editing: <span className="font-mono">{challanNoInput || `#${id}`}</span></p>
            ) : (
              <p className="text-xs text-slate-500">Rule 45(1) CGST Rules, 2017</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isEdit && (
            <button type="button" onClick={fillFromImage} className="btn-outline">
              <span className="material-symbols-outlined text-sm">file_upload</span> Load sample data
            </button>
          )}
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Challan for Job Work
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="card p-5">
          <F label="Processing Notes / Instructions">
            <textarea value={form.processingNotes} onChange={e => setForm(p => ({ ...p, processingNotes: e.target.value }))}
              rows={2} className="form-input resize-none" placeholder="Material pre-heat temperature, hardness required, vacuum level..." />
          </F>
        </div>

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

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> {isEdit ? 'Updating...' : 'Creating...'}</>
              : <><span className="material-symbols-outlined text-sm">save</span> {isEdit ? 'Update Challan' : 'Create Challan'}</>
            }
          </button>
          <Link to="/jobwork" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
