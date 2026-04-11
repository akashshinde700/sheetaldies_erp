import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import SearchSelect from '../../components/SearchSelect';
import { toInt, toNum } from '../../utils/normalize';

const EMPTY_LINE = { description:'', material:'', hrc:'', woNo:'', hsnSac:'998898', quantity:'', unit:'KGS', weight:'', rate:'', amount:'', processTypeId:'', sourceChallanItemId:'' };

// ✅ FIXED: Moved F component OUTSIDE to prevent remounting on every keystroke
const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function InvoiceForm() {
  const navigate    = useNavigate();
  const [parties,   setParties]   = useState([]);
  const [processes, setProcesses] = useState([]);
  const [challans,  setChallans]  = useState([]);

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

  useEffect(() => {
    api.get('/parties').then(r => {
      const list = r.data.data || [];
      setParties(list);
      if (list.length > 0) setForm(p => ({ ...p, fromPartyId: String(list[0].id) }));
      const customer = list.find(x => x.partyType === 'CUSTOMER' || x.partyType === 'BOTH');
      if (customer) setForm(p => ({ ...p, toPartyId: String(customer.id) }));
    });
    api.get('/processes').then(r => setProcesses(r.data.data.filter(p => p.isActive)));
    api.get('/jobwork?limit=200').then(r => setChallans(r.data.data || []));
  }, []);

  const handleChallanChange = async (val) => {
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
        }}));
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

  const remainingByChallanItem = new Map((billingStatus?.lineStatus || []).map(x => [String(x.challanItemId), x]));

  const PAY_BADGE = { PENDING:'bg-orange-100 text-orange-700', PARTIAL:'bg-sky-100 text-sky-700', PAID:'bg-emerald-100 text-emerald-700' };

  return (
    <div className="page-stack w-full min-w-0 max-w-5xl 3xl:max-w-6xl mx-auto animate-slide-up">
      {/* Header — stacks on narrow screens / phones */}
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

        {/* Challan Selection */}
        <div className="card p-4 sm:p-5 3xl:p-6 space-y-4 min-w-0">
          <p className="section-title border-b border-slate-100 pb-2">Link to Challan</p>
          <div>
            <label className="form-label">
              Select Challan
              <span className="ml-2 font-normal normal-case text-slate-400">— auto-fills items & checks for duplicate billing</span>
            </label>
            <SearchSelect
              value={form.challanId}
              onChange={v => handleChallanChange(v)}
              options={challans.map(c => ({
                value: c.id,
                label: `${c.challanNo} · ${c.toParty?.name || ''} · ${new Date(c.challanDate).toLocaleDateString('en-IN')} · ₹${toNum(c.totalValue, 0).toLocaleString('en-IN')}`,
              }))}
              placeholder="— No Challan (manual entry) —"
            />
            {loadingChallan && <p className="text-xs text-slate-400 mt-1.5">Loading challan details...</p>}
          </div>

          {/* Billing progress */}
          {challanInfo && (
            <div className={`rounded-xl p-4 border ${fullyInvoiced ? 'bg-rose-50 border-rose-200' : wouldExceed ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className={fullyInvoiced ? 'text-rose-700' : wouldExceed ? 'text-amber-700' : 'text-emerald-700'}>
                  {fullyInvoiced
                    ? '⛔ Fully Invoiced — No new bill allowed'
                    : wouldExceed
                    ? '⚠️ This invoice would exceed remaining amount'
                    : challanHistory.length > 0
                    ? `✅ Partial Billing — ${challanHistory.length} invoice(s) already created`
                    : '✅ First invoice for this challan'}
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-2 mb-3 overflow-hidden border border-slate-200">
                <div className={`h-2 rounded-full transition-all ${fullyInvoiced || wouldExceed ? 'bg-rose-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, challanSubtotal > 0 ? ((alreadyInvoiced + subtotal) / challanSubtotal) * 100 : 0)}%` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Challan Total',    value: challanSubtotal, cls: 'text-slate-700' },
                  { label: 'Already Billed',   value: alreadyInvoiced, cls: 'text-amber-600' },
                  { label: 'This Invoice',     value: grandTotal,      cls: wouldExceed ? 'text-rose-600' : 'text-slate-700' },
                  { label: 'Remaining After',  value: Math.max(0, remaining - subtotal), cls: remaining - subtotal < -0.01 ? 'text-rose-600' : 'text-emerald-700' },
                ].map(({ label, value, cls }) => (
                  <div key={label}>
                    <p className="text-slate-400">{label}</p>
                    <p className={`font-bold ${cls}`}>₹ {value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
              {challanHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/60 space-y-1">
                  {challanHistory.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 text-[11px]">
                      <span className="font-mono text-slate-600">{inv.invoiceNo}</span>
                      <span className="text-slate-500">₹ {toNum(inv.subtotal, 0).toLocaleString('en-IN')}</span>
                      <span className={`badge text-[10px] ${PAY_BADGE[inv.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{inv.paymentStatus}</span>
                      {inv.sentToTally && <span className="badge text-[10px] bg-violet-100 text-violet-700">TALLY</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* From / To / Refs */}
        <div className="card p-4 sm:p-5 3xl:p-6 space-y-4 min-w-0">
          <p className="section-title border-b border-slate-100 pb-2">Invoice Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 3xl:gap-5">
            <F label="Invoice Date">
              <input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} className="form-input" />
            </F>
            <F label="Dispatch Date">
              <input type="date" value={form.dispatchDate} onChange={e => setForm(p => ({ ...p, dispatchDate: e.target.value }))} className="form-input" />
            </F>
            <F label="From Party *">
              <SearchSelect
                value={form.fromPartyId}
                onChange={v => setForm(p => ({ ...p, fromPartyId: v }))}
                options={parties.map(p => ({ value: p.id, label: p.name }))}
                placeholder="— Select —"
                required
              />
            </F>
            <F label="To Party *">
              <SearchSelect
                value={form.toPartyId}
                onChange={v => setForm(p => ({ ...p, toPartyId: v }))}
                options={parties.map(p => ({ value: p.id, label: p.name }))}
                placeholder="— Select —"
                required
              />
            </F>
            <F label="Challan Ref">
              <input value={form.challanRef} onChange={e => setForm(p => ({ ...p, challanRef: e.target.value }))} className="form-input" placeholder="Auto-filled from challan" />
            </F>
            <F label="PO Ref">
              <input value={form.poRef} onChange={e => setForm(p => ({ ...p, poRef: e.target.value }))} className="form-input" />
            </F>
            <F label="Job Card Ref">
              <input value={form.jobCardRef} onChange={e => setForm(p => ({ ...p, jobCardRef: e.target.value }))} className="form-input" />
            </F>
            <F label="Other References" className="col-span-1 sm:col-span-2">
              <input value={form.otherReferences} onChange={e => setForm(p => ({ ...p, otherReferences: e.target.value }))} className="form-input" placeholder="Any additional reference..." />
            </F>
            <F label="Dispatch Doc No">
              <input value={form.dispatchDocNo} onChange={e => setForm(p => ({ ...p, dispatchDocNo: e.target.value }))} className="form-input" placeholder="DD-001" />
            </F>
            <F label="E-Way Bill No">
              <input value={form.eWayBillNo} onChange={e => setForm(p => ({ ...p, eWayBillNo: e.target.value }))} className="form-input" placeholder="EWB-XXXXXXXXXXXX" />
            </F>
          </div>
        </div>

        {/* Line Items */}
        <div className="card p-4 sm:p-5 3xl:p-6 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-2 mb-4">
            <div>
              <p className="section-title">Services / Items</p>
              {challanInfo && <p className="text-[10px] text-slate-400 mt-0.5">Auto-filled from challan — edit if partial delivery</p>}
            </div>
            <button type="button" onClick={() => setLineItems(p => [...p, { ...EMPTY_LINE }])}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Add Row
            </button>
          </div>

          {/* Column Headers — hidden on mobile */}
          <div className="hidden sm:grid grid-cols-[2rem_1fr_1.6fr_5rem_4.5rem_5rem_6rem_1.5rem] gap-2 px-3 pb-1.5">
            {['Sr.','Process','Description','Qty / UOM','Rate (₹)','Weight (kg)','Amount (₹)',''].map(h => (
              <p key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          <div className="space-y-2">
            {lineItems.map((it, i) => (
              <div key={i} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 hover:border-indigo-200 transition-colors">

                {/* Primary Row — hidden on mobile */}
                <div className="hidden sm:grid grid-cols-[2rem_1fr_1.6fr_5rem_4.5rem_5rem_6rem_1.5rem] gap-2 items-center">
                  <span className="text-[11px] text-slate-400 font-mono text-center">{i+1}</span>

                  <SearchSelect
                    value={it.processTypeId}
                    onChange={v => updateLine(i, 'processTypeId', v)}
                    options={processes.map(p => ({ value: p.id, label: p.name }))}
                    placeholder="— None —"
                  />

                  <input value={it.description} onChange={e => updateLine(i, 'description', e.target.value)}
                    list="desc-suggestions" required placeholder="Description"
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />

                  <div className="flex gap-1">
                    <input type="number" min="0" value={it.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
                      required placeholder="Qty"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 w-0 flex-1 min-w-0" />
                    <select value={it.unit} onChange={e => updateLine(i, 'unit', e.target.value)}
                      className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300">
                      <option>KGS</option><option>NOS</option><option>LOT</option><option>PCS</option>
                    </select>
                  </div>

                  <input type="number" value={it.rate} onChange={e => updateLine(i, 'rate', e.target.value)}
                    required placeholder="Rate"
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />

                  <input type="number" min="0" step="0.001" value={it.weight} onChange={e => updateLine(i, 'weight', e.target.value)}
                    placeholder="0.000"
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />

                  <p className="text-xs font-bold text-indigo-700 text-right whitespace-nowrap">
                    {it.amount ? `₹ ${toNum(it.amount, 0).toLocaleString('en-IN')}` : '—'}
                  </p>

                  <div className="flex justify-center">
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => setLineItems(p => p.filter((_, j) => j !== i))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile primary row — only shown below sm */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono w-5 text-center flex-shrink-0">{i+1}</span>
                    <SearchSelect
                      value={it.processTypeId}
                      onChange={v => updateLine(i, 'processTypeId', v)}
                      options={processes.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="— Process —"
                    />
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => setLineItems(p => p.filter((_, j) => j !== i))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                  <input value={it.description} onChange={e => updateLine(i, 'description', e.target.value)}
                    list="desc-suggestions" required placeholder="Description"
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Qty</label>
                      <div className="flex gap-1">
                        <input type="number" min="0" value={it.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} required placeholder="Qty"
                          className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 w-0 flex-1 min-w-0" />
                        <select value={it.unit} onChange={e => updateLine(i, 'unit', e.target.value)}
                          className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300">
                          <option>KGS</option><option>NOS</option><option>LOT</option><option>PCS</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Rate (₹)</label>
                      <input type="number" value={it.rate} onChange={e => updateLine(i, 'rate', e.target.value)} required placeholder="Rate"
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Wt (kg)</label>
                      <input type="number" min="0" step="0.001" value={it.weight} onChange={e => updateLine(i, 'weight', e.target.value)} placeholder="0.000"
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <p className="text-xs font-bold text-indigo-700">{it.amount ? `₹ ${toNum(it.amount, 0).toLocaleString('en-IN')}` : '—'}</p>
                  </div>
                </div>

                {/* Secondary Row — matches challan column names exactly */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100/80">
                  {challanInfo?.items?.length > 0 && (
                    <div className="col-span-2 sm:col-span-4">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Source Challan Line</label>
                      <select
                        value={it.sourceChallanItemId || ''}
                        onChange={e => updateLine(i, 'sourceChallanItemId', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full"
                      >
                        <option value="">Select source challan line</option>
                        {challanInfo.items.map((cIt, idx) => (
                          <option key={cIt.id} value={cIt.id}>
                            {idx + 1}. {cIt.description || 'Item'} (Qty {cIt.quantity}, Rate {cIt.rate})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {it.sourceChallanItemId && remainingByChallanItem.has(String(it.sourceChallanItemId)) && (
                    <div className="col-span-2 sm:col-span-4">
                      {(() => {
                        const b = remainingByChallanItem.get(String(it.sourceChallanItemId));
                        return (
                          <p className="text-[10px] text-slate-500">
                            Challan Qty: <strong>{b.totalQty}</strong> | Already Invoiced: <strong>{b.invoicedQty}</strong> | Remaining: <strong>{b.remainingQty}</strong>
                          </p>
                        );
                      })()}
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Material</label>
                    <input value={it.material} onChange={e => updateLine(i, 'material', e.target.value)}
                      placeholder="H13, D2…"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">HRC</label>
                    <input value={it.hrc} onChange={e => updateLine(i, 'hrc', e.target.value)}
                      placeholder="52-54"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">WO No</label>
                    <input value={it.woNo} onChange={e => updateLine(i, 'woNo', e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">SAC No</label>
                    <input value={it.hsnSac} onChange={e => updateLine(i, 'hsnSac', e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-300 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GST + Totals */}
        <div className="card p-4 sm:p-5 3xl:p-6 min-w-0">
          <div className="flex justify-end">
            <div className="w-full max-w-sm 3xl:max-w-md space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-700">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits:2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Transport / Freight</span>
                <input type="number" min="0" value={form.transportFreight}
                  onChange={e => setForm(p => ({ ...p, transportFreight: e.target.value }))}
                  className="w-28 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-300" />
              </div>
              {[
                { label:'CGST', key:'cgstRate', amt: cgst },
                { label:'SGST', key:'sgstRate', amt: sgst },
                { label:'IGST', key:'igstRate', amt: igst },
                { label:'TCS',  key:'tcsRate',  amt: tcsAmt },
              ].map(({ label, key, amt }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-slate-500">{label} %</span>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" step="0.01" value={form[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                    <span className="text-slate-500 w-28 text-right">₹ {amt.toLocaleString('en-IN', { minimumFractionDigits:2 })}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Extra Amt</span>
                <input type="number" min="0" value={form.extraAmt}
                  onChange={e => setForm(p => ({ ...p, extraAmt: e.target.value }))}
                  className="w-28 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-300" />
              </div>
              <div className="flex justify-between font-extrabold text-base border-t border-slate-200 pt-2.5">
                <span className="text-slate-800">Grand Total</span>
                <span className="text-indigo-700">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits:2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <datalist id="desc-suggestions">
          {processes.map(p => <option key={p.id} value={p.name} />)}
          <option value="Vacuum Hardening" />
          <option value="Vacuum Hardening + Tempering" />
          <option value="Nitriding" />
          <option value="Deep Cryogenic Treatment" />
          <option value="Stress Relieving" />
          <option value="Annealing" />
        </datalist>

        {/* Actions */}
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
