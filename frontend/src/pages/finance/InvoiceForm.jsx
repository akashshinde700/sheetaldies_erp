import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toInt, toNum } from '../../utils/normalize';
import { useParties, useProcesses, useMasterJobCards } from '../../hooks/useMasterData';

// Subcomponents
import ChallanSelectionSection from './components/ChallanSelectionSection';
import InvoiceDetailsSection from './components/InvoiceDetailsSection';
import InvoicedItemsSection from './components/InvoicedItemsSection';
import InvoiceTaxTotalsSection from './components/InvoiceTaxTotalsSection';

const EMPTY_LINE = { description:'', material:'', hrc:'', woNo:'', hsnSac:'998898', quantity:'', unit:'KGS', weight:'', rate:'', amount:'', processTypeId:'', sourceChallanItemId:'' };

export default function InvoiceForm() {
  const navigate    = useNavigate();
  const { data: parties = [] } = useParties();
  const { data: processes = [] } = useProcesses();
  const { data: challans = [] } = useMasterJobCards();

  const [challanInfo,    setChallanInfo]    = useState(null);
  const [challanHistory, setChallanHistory] = useState([]);
  const [billingStatus,  setBillingStatus]  = useState(null);
  const [loadingChallan, setLoadingChallan] = useState(false);
  const [loading,        setLoading]        = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    invoiceDate: today,
    dispatchDate: '',
    fromPartyId: '', toPartyId: '',
    challanId: '',
    challanRef: '', poRef: '', jobCardRef: '', otherReferences: '',
    dispatchDocNo: '', eWayBillNo: '',
    cgstRate: '9', sgstRate: '9', igstRate: '0',
    transportFreight: '0', tcsRate: '0', extraAmt: '0',
  });

  const [lineItems, setLineItems] = useState([{ ...EMPTY_LINE }]);
  const [runsheetNumber, setRunsheetNumber] = useState('');
  const [runsheetLookupLoading, setRunsheetLookupLoading] = useState(false);
  const [runsheetLookupMessage, setRunsheetLookupMessage] = useState('');

  useEffect(() => {
    if (parties.length > 0 && !form.fromPartyId) {
      // Invoice: fromParty = our company (BOTH), toParty = customer
      const ourCompany   = parties.find(x => x.partyType === 'BOTH');
      const firstCustomer = parties.find(x => x.partyType === 'CUSTOMER');
      setForm(p => ({
        ...p,
        fromPartyId: ourCompany   ? String(ourCompany.id)    : String(parties[0].id),
        toPartyId:   firstCustomer ? String(firstCustomer.id) : '',
      }));
    }
  }, [parties, form.fromPartyId]);

  const handleChallanChange = async (val) => {
    setRunsheetLookupMessage('');
    setChallanInfo(null);
    setChallanHistory([]);
    setBillingStatus(null);
    setForm(p => ({ ...p, challanId: val, challanRef: '' }));
    if (!val) { setLineItems([{ ...EMPTY_LINE }]); return; }

    setLoadingChallan(true);
    try {
      const [detailRes, histRes, billRes] = await Promise.all([
        api.get(`/jobwork/${val}`),
        api.get('/invoices', { params: { challanId: val } }),
        api.get(`/invoices/challan/${val}/billing-status`),
      ]);
      const ch = detailRes.data.data;
      setChallanInfo(ch);
      setChallanHistory(histRes.data.data || []);
      setBillingStatus(billRes.data.data || null);
      setForm(p => ({
        ...p,
        challanId:   val,
        challanRef:  ch.challanNo,
        fromPartyId: String(ch.fromPartyId || p.fromPartyId),
        toPartyId:   String(ch.toPartyId   || p.toPartyId),
      }));
      if (ch.items?.length > 0) {
        setLineItems(ch.items.map(it => {
          const line = (billRes.data.data?.lineStatus || []).find(x => x.challanItemId === it.id);
          const dispatchQty = line ? line.remainingQty : toNum(it.quantity, 0);
          return {
            description:   it.description || it.item?.name || '',
            material:      it.material    || '',
            hrc:           it.hrc         || '',
            woNo:          it.woNo        || '',
            hsnSac:        it.hsnCode     || it.item?.hsnSacCode || '998898',
            quantity:      String(dispatchQty),
            unit:          it.uom         || 'KGS',
            weight:        it.weight      ? String(it.weight) : '',
            rate:          String(it.rate),
            amount:        String((dispatchQty * toNum(it.rate, 0)).toFixed(2)),
            processTypeId: '',
            sourceChallanItemId: String(it.id),
          }
        }));
      } else {
        setLineItems([{ ...EMPTY_LINE }]);
      }
    } catch {
      toast.error('Could not load challan details.');
      setLineItems([{ ...EMPTY_LINE }]);
    } finally {
      setLoadingChallan(false);
    }
  };

  const lookupRunsheetByNumber = async () => {
    const number = runsheetNumber.trim();
    if (!number) {
      toast.error('Enter a VHT run sheet number to lookup.');
      return;
    }
    setRunsheetLookupLoading(true);
    setRunsheetLookupMessage('');
    try {
      const res = await api.get('/manufacturing/runsheets', { params: { search: number, limit: 10 } });
      const rows = res.data.data || [];
      if (!rows.length) {
        toast.error('Run sheet not found.');
        return;
      }
      const found = rows.find(r => String(r.runsheetNumber).toLowerCase() === number.toLowerCase()) || rows[0];
      const item = found.items?.[0];
      if (!item?.jobCardId) {
        toast.error('Run sheet is not linked to a job card.');
        return;
      }
      const cardRes = await api.get(`/jobcards/${item.jobCardId}`);
      const jobCard = cardRes.data.data;
      const challan = jobCard.challans?.[0];
      if (!challan) {
        toast.error('No challan linked to this job card.');
        return;
      }
      handleChallanChange(String(challan.id));
      setRunsheetLookupMessage(`Run sheet ${found.runsheetNumber} mapped to challan ${challan.challanNo}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to lookup run sheet.');
    } finally {
      setRunsheetLookupLoading(false);
    }
  };

  const fillFromImage = () => {
    const sampleChallan = challans[0] || {};
    const fromParty = parties.find(p => p.id === sampleChallan.fromPartyId) || parties[0] || {};
    const toParty = parties.find(p => p.id === sampleChallan.toPartyId) || parties.find(p => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH') || {};
    setForm(p => ({
      ...p,
      challanId: sampleChallan.id ? String(sampleChallan.id) : '',
      challanRef: sampleChallan.challanNo || '',
      fromPartyId: fromParty.id ? String(fromParty.id) : p.fromPartyId,
      toPartyId: toParty.id ? String(toParty.id) : p.toPartyId,
      invoiceDate: today,
      dispatchDate: today,
      poRef: sampleChallan.invoiceChNo || '',
      jobCardRef: sampleChallan.jobCard?.jobCardNo || '',
      otherReferences: sampleChallan.processingNotes || '',
      dispatchDocNo: sampleChallan.invoiceChNo || '',
      eWayBillNo: sampleChallan.invoiceChNo ? `${sampleChallan.invoiceChNo}-EWB` : '',
      cgstRate: String(sampleChallan.cgstRate || 9),
      sgstRate: String(sampleChallan.sgstRate || 9),
      igstRate: String(sampleChallan.igstRate || 0),
      transportFreight: String(sampleChallan.handlingCharges || 0),
      tcsRate: '0',
      extraAmt: '0',
    }));

    const sampleItem = sampleChallan.items?.[0];
    if (sampleItem) {
      setLineItems([{ ...EMPTY_LINE,
        description: sampleItem.description || '',
        material: sampleItem.material || '',
        hrc: sampleItem.hrc || '',
        woNo: sampleItem.woNo || '',
        hsnSac: sampleItem.hsnCode || '998898',
        quantity: sampleItem.quantity ? String(sampleItem.quantity) : '1',
        unit: sampleItem.uom || 'KGS',
        weight: sampleItem.weight ? String(sampleItem.weight) : '',
        rate: sampleItem.rate ? String(sampleItem.rate) : '0',
        amount: sampleItem.amount ? String(sampleItem.amount) : '0',
      }]);
    } else {
      setLineItems([{ ...EMPTY_LINE }]);
    }
    toast.success('Invoice values loaded from DB-backed sample.');
  };

  const updateLine = (i, field, val) => {
    setLineItems(prev => {
      const arr = [...prev];
      arr[i] = { ...arr[i], [field]: val };
      if (field === 'quantity' || field === 'rate') {
        const q = toNum(field === 'quantity' ? val : arr[i].quantity, 0);
        const r = toNum(field === 'rate' ? val : arr[i].rate, 0);
        arr[i].amount = (q * r).toFixed(2);
      }
      if (field === 'processTypeId' && val) {
        const proc = processes.find(p => p.id === toInt(val));
        if (proc) {
          arr[i].description = proc.name;
          arr[i].hsnSac      = proc.hsnSacCode || '998898';
          if (proc.pricePerKg) arr[i].rate = proc.pricePerKg;
        }
      }
      return arr;
    });
  };

  const subtotal   = lineItems.reduce((s, it) => s + toNum(it.amount, 0), 0);
  const cgst       = subtotal * toNum(form.cgstRate, 0) / 100;
  const sgst       = subtotal * toNum(form.sgstRate, 0) / 100;
  const igst       = subtotal * toNum(form.igstRate, 0) / 100;
  const total      = subtotal + cgst + sgst + igst;
  const transport  = toNum(form.transportFreight, 0);
  const tcsAmt     = total * toNum(form.tcsRate, 0) / 100;
  const extraAmt   = toNum(form.extraAmt, 0);
  const grandTotal = total + transport + tcsAmt + extraAmt;

  const alreadyInvoiced = challanHistory.reduce((s, inv) => s + toNum(inv.subtotal, 0), 0);
  const challanSubtotal = challanInfo ? toNum(challanInfo.subtotal, 0) : 0;
  const remaining       = challanSubtotal - alreadyInvoiced;
  const fullyInvoiced   = challanInfo && remaining <= 0.01;
  const wouldExceed     = challanInfo && subtotal > remaining + 0.01;

  const remainingByChallanItem = new Map((billingStatus?.lineStatus || []).map(x => [String(x.challanItemId), x]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromPartyId || !form.toPartyId) { toast.error('From and To party are required.'); return; }
    if (!lineItems.length || !lineItems.some(it => it.description && toNum(it.quantity, 0) > 0 && toNum(it.rate, 0) > 0)) {
      toast.error('At least one line item with description, quantity and rate is required.'); return;
    }
    if (form.challanId) {
      for (const it of lineItems) {
        const mapped = remainingByChallanItem.get(String(it.sourceChallanItemId || ''));
        if (!mapped) { toast.error('Each line must be mapped to challan item for partial dispatch billing.'); return; }
        if (toNum(it.quantity, 0) > mapped.remainingQty + 0.00001) {
          toast.error(`Line qty exceeds remaining challan qty (remaining ${mapped.remainingQty}).`);
          return;
        }
      }
    }
    if (fullyInvoiced) { toast.error('This challan is already fully invoiced.'); return; }
    if (wouldExceed)   { toast.error(`Invoice exceeds remaining ₹${remaining.toFixed(2)} for this challan.`); return; }
    setLoading(true);
    try {
      const payload = { ...form, items: lineItems };
      if (!payload.challanId) delete payload.challanId;
      const r = await api.post('/invoices', payload);
      toast.success(`Invoice ${r.data.data.invoiceNo} created!`);
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating invoice.');
    } finally { setLoading(false); }
  };

  const PAY_BADGE = { PENDING:'bg-orange-100 text-orange-700', PARTIAL:'bg-sky-100 text-sky-700', PAID:'bg-emerald-100 text-emerald-700' };

  return (
    <div className="page-stack w-full min-w-0 max-w-5xl 3xl:max-w-6xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to="/invoices"
            className="w-9 h-9 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 font-headline">New Tax Invoice</h2>
            <p className="text-xs text-slate-400 mt-0.5">GST Invoice under CGST Act</p>
            <p className="text-xs text-slate-500 mt-1 break-words">Flow ref: 5 (Tax Invoice). Related image: <span className="font-mono">all\\5.jpeg</span></p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          <button type="button" onClick={fillFromImage} className="btn-outline w-full sm:w-auto">
            <span className="material-symbols-outlined text-sm">file_upload</span> Load sample data
          </button>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-[12px]">receipt_long</span> Tax Invoice
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="section-title">Lookup by Run Sheet</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="form-label">VHT Run Sheet No</label>
              <input
                type="text"
                value={runsheetNumber}
                onChange={(e) => setRunsheetNumber(e.target.value)}
                placeholder="Enter VHT run sheet number"
                className="form-input"
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button
                type="button"
                onClick={lookupRunsheetByNumber}
                disabled={runsheetLookupLoading}
                className="btn-secondary w-full"
              >
                {runsheetLookupLoading ? 'Looking up…' : 'Find Challan'}
              </button>
            </div>
          </div>
          {runsheetLookupMessage && (
            <p className="text-sm text-slate-600">{runsheetLookupMessage}</p>
          )}
        </div>

        <ChallanSelectionSection 
          form={form} 
          handleChallanChange={handleChallanChange} 
          challans={challans} 
          loadingChallan={loadingChallan} 
          challanInfo={challanInfo} 
          fullyInvoiced={fullyInvoiced} 
          wouldExceed={wouldExceed} 
          challanHistory={challanHistory} 
          alreadyInvoiced={alreadyInvoiced} 
          subtotal={subtotal} 
          grandTotal={grandTotal} 
          remaining={remaining} 
          PAY_BADGE={PAY_BADGE} 
        />

        <InvoiceDetailsSection form={form} setForm={setForm} parties={parties} />

        <InvoicedItemsSection 
          lineItems={lineItems} 
          setLineItems={setLineItems} 
          processes={processes} 
          updateLine={updateLine} 
          challanInfo={challanInfo} 
          EMPTY_LINE={EMPTY_LINE} 
          remainingByChallanItem={remainingByChallanItem} 
        />

        <InvoiceTaxTotalsSection 
          form={form} 
          setForm={setForm} 
          subtotal={subtotal} 
          cgst={cgst} 
          sgst={sgst} 
          igst={igst} 
          tcsAmt={tcsAmt} 
          grandTotal={grandTotal} 
        />

        <datalist id="desc-suggestions">
          {processes.map(p => <option key={p.id} value={p.name} />)}
          <option value="Vacuum Hardening" />
          <option value="Vacuum Hardening + Tempering" />
          <option value="Nitriding" />
          <option value="Deep Cryogenic Treatment" />
          <option value="Stress Relieving" />
          <option value="Annealing" />
        </datalist>

        {/* Actions stack */}
        <div className="flex gap-3 items-center pb-4">
          <button type="submit" disabled={loading || fullyInvoiced || loadingChallan} className="btn-primary">
            {loading
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Creating...</>
              : <><span className="material-symbols-outlined text-sm">receipt_long</span> Create Invoice</>
            }
          </button>
          {fullyInvoiced && (
            <span className="text-sm text-rose-600 font-semibold">⛔ Fully invoiced — cannot create new bill</span>
          )}
          {wouldExceed && !fullyInvoiced && (
            <span className="text-sm text-amber-600 font-semibold">⚠️ Amount exceeds remaining balance</span>
          )}
          <Link to="/invoices" className="ml-auto btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
