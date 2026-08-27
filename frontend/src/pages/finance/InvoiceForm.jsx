import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toInt, toNum } from '../../utils/normalize';
import { useParties, useProcesses, useChallans } from '../../hooks/useMasterData';
import { ArrowLeft, Ban, AlertTriangle, FileUp, ReceiptText, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

// Subcomponents
import ChallanSelectionSection from './components/ChallanSelectionSection';
import InvoiceDetailsSection from './components/InvoiceDetailsSection';
import InvoicedItemsSection from './components/InvoicedItemsSection';
import InvoiceTaxTotalsSection from './components/InvoiceTaxTotalsSection';

const newEmptyLine = () => ({ _id: Math.random(), description:'', material:'', hrc:'', woNo:'', hsnSac:'998898', quantity:'', unit:'KGS', billingType:'KGS', weight:'', rate:'', amount:'', processTypeId:'', sourceChallanItemId:'' });

// Billing-type helpers — a process can be priced per Kg, per Pc, or per Lot.
// Auto-detect the type from whichever rate is set (prefer Kg → Pc → Lot),
// and read the matching rate value for a chosen type.
const UNIT_FOR_TYPE = { KGS: 'KGS', PCS: 'PCS', LOT: 'LOT' };
const detectBillingType = (rateObj) => {
  if (!rateObj) return 'KGS';
  if (rateObj.pricePerKg != null) return 'KGS';
  if (rateObj.pricePerPc != null) return 'PCS';
  if (rateObj.lotPrice   != null) return 'LOT';
  return 'KGS';
};
const rateForType = (rateObj, type) => {
  if (!rateObj) return null;
  if (type === 'KGS') return rateObj.pricePerKg;
  if (type === 'PCS') return rateObj.pricePerPc;
  if (type === 'LOT') return rateObj.lotPrice;
  return null;
};

export default function InvoiceForm() {
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const { id }      = useParams();
  const isEdit      = Boolean(id);
  const [editInvoiceNo, setEditInvoiceNo] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const { data: parties = [] } = useParties();
  const { data: processes = [] } = useProcesses();
  const { data: challans = [], isSuccess: challansLoaded } = useChallans();

  const [challanInfo,    setChallanInfo]    = useState(null);
  const [challanHistory, setChallanHistory] = useState([]);
  const [billingStatus,  setBillingStatus]  = useState(null);
  const [loadingChallan, setLoadingChallan] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [invoiceSeries,  setInvoiceSeries]  = useState([]);

  useEffect(() => {
    api.get('/invoices/series').then(r => {
      const list = r.data.data || [];
      setInvoiceSeries(list);
      if (list.length === 1) setForm(p => ({ ...p, invoiceSeriesId: p.invoiceSeriesId || String(list[0].id) }));
    }).catch(() => setInvoiceSeries([]));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    invoiceDate: today,
    dispatchDate: '',
    fromPartyId: '', toPartyId: '',
    invoiceSeriesId: '',
    challanId: '',
    challanRef: '', poRef: '', jobCardRef: '', otherReferences: '',
    dispatchDocNo: '', eWayBillNo: '',
    cgstRate: '9', sgstRate: '9', igstRate: '0',
    transportFreight: '0', tcsRate: '0', extraAmt: '0',
    // Print the customer's part name under the process on the invoice.
    showPartName: true,
  });

  const [lineItems, setLineItems] = useState([newEmptyLine()]);
  const [partyRates, setPartyRates] = useState({}); // { [processTypeId]: { pricePerKg, pricePerPc, lotPrice } }
  const [jobCardNoInput, setJobCardNoInput] = useState('');
  const [jobCardLookupLoading, setJobCardLookupLoading] = useState(false);
  const [jobCardLookupMessage, setJobCardLookupMessage] = useState('');

  // ── Edit mode: maujooda invoice form me bharna ──
  useEffect(() => {
    if (!isEdit) return;
    setEditLoading(true);
    api.get(`/invoices/${id}`)
      .then((r) => {
        const d = r.data.data;
        if (!d) return;
        setEditInvoiceNo(d.invoiceNo || '');
        const dateOnly = (v) => (v ? String(v).split('T')[0] : '');
        setForm({
          invoiceDate:      dateOnly(d.invoiceDate),
          dispatchDate:     dateOnly(d.dispatchDate),
          fromPartyId:      d.fromPartyId ? String(d.fromPartyId) : '',
          toPartyId:        d.toPartyId   ? String(d.toPartyId)   : '',
          invoiceSeriesId:  d.invoiceSeriesId ? String(d.invoiceSeriesId) : '',
          challanId:        d.challanId ? String(d.challanId) : '',
          challanRef:       d.challanRef      || '',
          poRef:            d.poRef           || '',
          jobCardRef:       d.jobCardRef      || '',
          otherReferences:  d.otherReferences || '',
          dispatchDocNo:    d.dispatchDocNo   || '',
          eWayBillNo:       d.eWayBillNo      || '',
          cgstRate:         String(d.cgstRate ?? '9'),
          sgstRate:         String(d.sgstRate ?? '9'),
          igstRate:         String(d.igstRate ?? '0'),
          transportFreight: String(d.transportFreight ?? '0'),
          tcsRate:          String(d.tcsRate ?? '0'),
          extraAmt:         String(d.extraAmt ?? '0'),
          showPartName:     d.showPartName !== false,
        });
        setLineItems((d.items || []).map((it) => ({
          _id: it.id,
          description:  it.description  || '',
          material:     it.material     || '',
          hrc:          it.hrc          || '',
          woNo:         it.woNo         || '',
          hsnSac:       it.hsnSac       || '998898',
          quantity:     it.quantity != null ? String(it.quantity) : '',
          unit:         it.unit         || 'KGS',
          billingType:  it.unit         || 'KGS',
          weight:       it.weight != null ? String(it.weight) : '',
          rate:         it.rate   != null ? String(it.rate)   : '',
          amount:       it.amount != null ? String(it.amount) : '',
          processTypeId: it.processTypeId ? String(it.processTypeId) : '',
          sourceChallanItemId: it.sourceChallanItemId ? String(it.sourceChallanItemId) : '',
        })));
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Invoice load nahi ho payi.'))
      .finally(() => setEditLoading(false));
  }, [isEdit, id]);

  useEffect(() => {
    if (parties.length > 0 && !form.fromPartyId) {
      // Invoice: fromParty = our company (BOTH), toParty = customer
      const ourCompany   = parties.find(x => x.partyType === 'BOTH');
      const firstCustomer = parties.find(x => x.partyType === 'CUSTOMER');
      setForm(p => ({
        ...p,
        fromPartyId: ourCompany   ? String(ourCompany.id)    : String(parties[0].id),
        // Don't clobber a toParty already set from a ?customerId= prefill or an
        // in-flight challan load — only default it when still empty.
        toPartyId:   p.toPartyId || (firstCustomer ? String(firstCustomer.id) : ''),
      }));
    }
  }, [parties, form.fromPartyId]);

  useEffect(() => {
    if (!form.toPartyId) { setPartyRates({}); return; }
    api.get(`/parties/${form.toPartyId}/process-rates`).then(r => {
      const m = {};
      for (const row of r.data.data || []) m[String(row.processTypeId)] = row;
      setPartyRates(m);
    }).catch(() => setPartyRates({}));
    // CGST/SGST default to 9%/9% (set in initial form state) and stay there
    // regardless of customer — no automatic switch to IGST. Switch manually
    // for interstate customers; the rate fields are always editable.
  }, [form.toPartyId]);

  // Auto-load challan when navigated from a job card link
  useEffect(() => {
    const jcId = searchParams.get('jobCardId');
    if (!jcId) return;
    api.get(`/jobcards/${jcId}`).then(r => {
      const jc = r.data.data;
      // Always carry the job card number into the invoice's Job Card Ref,
      // even when no challan is linked (e.g. invoicing straight off a cert).
      if (jc.jobCardNo) {
        setForm(p => ({ ...p, jobCardRef: jc.jobCardNo }));
        // Show it in the lookup box too, so arriving from a job card or a
        // certificate looks the same as typing the number in by hand — an
        // empty box next to an already-loaded challan reads like nothing
        // was picked up.
        setJobCardNoInput(jc.jobCardNo);
      }
      // challanItemLinks reflects each item's actual current challan
      // assignment; jc.challans[0] is a direct relation that can be empty
      // or point to a stale/wrong challan, so it's the last resort.
      const challanId = jc.challanItemLinks?.[0]?.challan?.id || jc.challans?.[0]?.id;
      if (challanId) handleChallanChange(String(challanId));
    }).catch(() => {});
  }, []);

  // When navigated from a certificate with no linked job card, at least
  // pre-select the customer as the invoice's To Party.
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (!customerId) return;
    setForm(p => ({ ...p, toPartyId: String(customerId) }));
  }, []);

  // Auto-load when navigated from the invoice list's "no results" search
  // (the search text could be a challan no or a job card no — try challan first)
  const refLookupDone = useRef(false);
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || refLookupDone.current || !challansLoaded) return;
    refLookupDone.current = true;
    const matchedChallan = challans.find(c => String(c.challanNo).toLowerCase() === ref.toLowerCase());
    if (matchedChallan) {
      handleChallanChange(String(matchedChallan.id));
    } else {
      setJobCardNoInput(ref);
      lookupByJobCardNo(ref);
    }
  }, [challansLoaded]);

  const handleChallanChange = async (val) => {
    setJobCardLookupMessage('');
    setChallanInfo(null);
    setChallanHistory([]);
    setBillingStatus(null);
    setForm(p => ({ ...p, challanId: val, challanRef: '' }));
    if (!val) { setLineItems([newEmptyLine()]); return; }

    setLoadingChallan(true);
    try {
      const [detailRes, histRes, billRes] = await Promise.all([
        api.get(`/jobwork/${val}`),
        api.get('/invoices', { params: { challanId: val } }),
        // Edit me apni hi invoice ko ginti se bahar rakho, warna wo khud ko
        // "already fully invoiced" bata kar save block kar degi.
        api.get(`/invoices/challan/${val}/billing-status`, {
          params: isEdit ? { excludeInvoiceId: id } : undefined,
        }),
      ]);
      const ch = detailRes.data.data;
      setChallanInfo(ch);
      setChallanHistory(histRes.data.data || []);
      setBillingStatus(billRes.data.data || null);
      // Challan: fromParty=customer, toParty=processor
      // Invoice: fromParty=processor (bills), toParty=customer (pays) — reversed
      const invoiceToPartyId = String(ch.fromPartyId || form.toPartyId);
      setForm(p => ({
        ...p,
        challanId:   val,
        challanRef:  ch.challanNo,
        fromPartyId: String(ch.toPartyId   || p.fromPartyId),
        toPartyId:   invoiceToPartyId || p.toPartyId,
      }));

      // Fetch this customer's per-process rates directly — don't rely on the
      // toPartyId-driven effect, which fires after this async load and would
      // still be holding rates for the previous party.
      let rateMap = {};
      if (invoiceToPartyId) {
        try {
          const rateRes = await api.get(`/parties/${invoiceToPartyId}/process-rates`);
          for (const row of rateRes.data.data || []) rateMap[String(row.processTypeId)] = row;
          setPartyRates(rateMap);
        } catch { /* keep rates empty, fall back to challan item rate */ }
      }

      if (ch.items?.length > 0) {
        setLineItems(ch.items.map(it => {
          const line = (billRes.data.data?.lineStatus || []).find(x => x.challanItemId === it.id);
          const origQty = toNum(it.quantity, 0);
          const dispatchQty = line ? line.remainingQty : origQty;
          // Resolve the customer's effective rate for this process (party
          // override → process master) and auto-detect its billing type.
          const partyRate = it.processTypeId ? rateMap[String(it.processTypeId)] : null;
          const procMaster = it.processTypeId ? processes.find(p => p.id === toInt(it.processTypeId)) : null;
          const pick = (a, b) => (a != null ? a : (b != null ? b : null));
          const eff = (partyRate || procMaster) ? {
            pricePerKg: pick(partyRate?.pricePerKg, procMaster?.pricePerKg),
            pricePerPc: pick(partyRate?.pricePerPc, procMaster?.pricePerPc),
            lotPrice:   pick(partyRate?.lotPrice,   procMaster?.lotPrice),
          } : null;
          const billingType = eff ? detectBillingType(eff) : (it.uom && UNIT_FOR_TYPE[it.uom] ? it.uom : 'KGS');
          const typedRate = eff ? rateForType(eff, billingType) : null;
          const rate = typedRate != null ? String(typedRate) : String(it.rate);
          const unit = UNIT_FOR_TYPE[billingType] || it.uom || 'KGS';
          // LOT is a flat charge — default to 1 lot so a 250-piece challan line
          // bills 1 × lotPrice, not 250 × lotPrice. Kg/Pc lines bill the actual
          // dispatched quantity.
          const lineQty = billingType === 'LOT' ? 1 : dispatchQty;
          // Prorate weight to the quantity actually being invoiced (dispatchQty
          // may be less than the challan item's original qty on a partial bill).
          const origWeight = toNum(it.weight, 0);
          const proratedWeight = (billingType === 'KGS' && origQty > 0 && origWeight > 0)
            ? (origWeight * dispatchQty / origQty)
            : origWeight;
          return {
            _id:           it.id ?? Math.random(),
            description:   it.partName || it.description || it.item?.name || '',
            material:      it.material    || '',
            hrc:           it.hrc         || '',
            woNo:          it.woNo        || '',
            hsnSac:        it.processType?.hsnSacCode || it.hsnCode || it.item?.hsnSacCode || '998898',
            quantity:      String(lineQty),
            unit,
            billingType,
            weight:        proratedWeight ? String(proratedWeight.toFixed(3)) : '',
            rate,
            amount:        calcLineAmount({ unit, billingType, quantity: lineQty, rate, weight: proratedWeight }),
            processTypeId: it.processTypeId ? String(it.processTypeId) : '',
            sourceChallanItemId: String(it.id),
          }
        }));
      } else {
        setLineItems([newEmptyLine()]);
      }
    } catch {
      toast.error('Could not load challan details.');
      setLineItems([newEmptyLine()]);
    } finally {
      setLoadingChallan(false);
    }
  };

  const lookupByJobCardNo = async (numberOverride) => {
    const number = (numberOverride ?? jobCardNoInput).trim();
    if (!number) {
      toast.error('Enter a job card number to lookup.');
      return;
    }
    setJobCardLookupLoading(true);
    setJobCardLookupMessage('');
    try {
      const res = await api.get('/jobcards', { params: { search: number, limit: 10 } });
      const rows = res.data.data || [];
      if (!rows.length) {
        toast.error('Job card not found.');
        return;
      }
      const found = rows.find(r => String(r.jobCardNo).toLowerCase() === number.toLowerCase()) || rows[0];
      const cardRes = await api.get(`/jobcards/${found.id}`);
      const jobCard = cardRes.data.data;
      // challanItemLinks reflects each item's actual current challan assignment;
      // jobCard.challans is a direct relation that can be empty or point to a
      // stale/wrong challan, so it's only used as a last-resort fallback.
      const challan = jobCard.challanItemLinks?.[0]?.challan || jobCard.challans?.[0];
      if (!challan) {
        toast.error('No challan linked to this job card.');
        return;
      }
      handleChallanChange(String(challan.id));
      setJobCardLookupMessage(`Job card ${jobCard.jobCardNo} mapped to challan ${challan.challanNo}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to lookup job card.');
    } finally {
      setJobCardLookupLoading(false);
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
      setLineItems([{ ...newEmptyLine(),
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
      setLineItems([newEmptyLine()]);
    }
    toast.success('Invoice values loaded from DB-backed sample.');
  };

  // Effective per-process rate for the currently selected customer: prefer the
  // party-specific override, then fall back to the process master's own rate.
  // Returns { pricePerKg, pricePerPc, lotPrice } (any may be null).
  const effectiveRateFor = (processTypeId) => {
    if (!processTypeId) return null;
    const party = partyRates[String(processTypeId)] || {};
    const proc  = processes.find(p => p.id === toInt(processTypeId)) || {};
    const pick = (a, b) => (a != null ? a : (b != null ? b : null));
    return {
      pricePerKg: pick(party.pricePerKg, proc.pricePerKg),
      pricePerPc: pick(party.pricePerPc, proc.pricePerPc),
      lotPrice:   pick(party.lotPrice,   proc.lotPrice),
    };
  };

  // Amount basis follows the line's billingType — KGS bills by weight,
  // PCS/NOS by pieces (quantity), LOT by number of lots (quantity). This
  // matches how the challan item itself was priced at inward time, so a
  // full-quantity invoice reproduces the challan's own subtotal.
  const calcLineAmount = (it) => {
    const qty    = toNum(it.quantity, 0);
    const rate   = toNum(it.rate, 0);
    const weight = toNum(it.weight, 0);
    const type   = it.billingType || it.unit || 'KGS';
    const base = (type === 'KGS') ? (weight > 0 ? weight : qty) : qty;
    return (base * rate).toFixed(2);
  };

  const updateLine = (i, field, val) => {
    setLineItems(prev => {
      const arr = [...prev];
      arr[i] = { ...arr[i], [field]: val };
      if (field === 'quantity' || field === 'rate' || field === 'weight') {
        arr[i].amount = calcLineAmount(arr[i]);
      }
      // Selecting a process auto-fills description, SAC, and — crucially —
      // auto-detects the billing type (Kg→Pc→Lot) from the customer's rate
      // and fills the matching rate + unit. User can still switch billing type.
      if (field === 'processTypeId' && val) {
        const proc = processes.find(p => p.id === toInt(val));
        if (proc) {
          arr[i].description = proc.name;
          arr[i].hsnSac      = proc.hsnSacCode || '998898';
          const eff  = effectiveRateFor(val);
          const type = detectBillingType(eff);
          const rate = rateForType(eff, type);
          arr[i].billingType = type;
          arr[i].unit        = UNIT_FOR_TYPE[type] || 'KGS';
          arr[i].rate        = rate != null ? String(rate) : '';
          if (type === 'LOT' && (!arr[i].quantity || toNum(arr[i].quantity, 0) === 0)) arr[i].quantity = '1';
          arr[i].amount = calcLineAmount(arr[i]);
        }
      }
      // Switching billing type re-picks the matching rate for this process and
      // keeps the display unit in sync, then recomputes the amount.
      if (field === 'billingType') {
        arr[i].unit = UNIT_FOR_TYPE[val] || arr[i].unit;
        const eff  = effectiveRateFor(arr[i].processTypeId);
        const rate = rateForType(eff, val);
        if (rate != null) arr[i].rate = String(rate);
        if (val === 'LOT' && (!arr[i].quantity || toNum(arr[i].quantity, 0) === 0)) arr[i].quantity = '1';
        arr[i].amount = calcLineAmount(arr[i]);
      }
      // Changing the unit dropdown keeps billingType aligned (KGS/PCS/LOT).
      if (field === 'unit' && UNIT_FOR_TYPE[val]) {
        arr[i].billingType = val;
        arr[i].amount = calcLineAmount(arr[i]);
      }
      return arr;
    });
  };

  // Process Summary: when several invoice lines share the same process (e.g.
  // 5 challan items all "Hardening & Tempering"), let the user type ONE
  // combined weight/qty for the whole group instead of editing every line —
  // the total is redistributed across the group's lines proportional to
  // their current share, so each line's own amount (and the existing
  // per-challan-item remaining-qty validation) keeps working unchanged.
  const applyGroupTotal = (processTypeId, newTotal) => {
    setLineItems(prev => {
      const idxs = prev
        .map((it, i) => ({ it, i }))
        .filter(x => x.it.processTypeId && String(x.it.processTypeId) === String(processTypeId));
      if (!idxs.length) return prev;
      const type  = idxs[0].it.billingType || 'KGS';
      const field = type === 'KGS' ? 'weight' : 'quantity';
      const currentTotal = idxs.reduce((s, x) => s + toNum(x.it[field], 0), 0);
      const newTotalNum = toNum(newTotal, 0);
      const arr = [...prev];
      if (currentTotal > 0) {
        idxs.forEach(({ it, i }) => {
          const share = toNum(it[field], 0) / currentTotal;
          arr[i] = { ...arr[i], [field]: (newTotalNum * share).toFixed(3) };
          arr[i].amount = calcLineAmount(arr[i]);
        });
      } else {
        // No existing basis to split proportionally (all zero) — put the
        // whole total on the first line in the group.
        const { i } = idxs[0];
        arr[i] = { ...arr[i], [field]: newTotalNum.toFixed(3) };
        arr[i].amount = calcLineAmount(arr[i]);
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
  // Billing is gated by remaining QUANTITY (billingStatus, checked per-line
  // below), not by rupee amount — a line's rate can legitimately differ from
  // what was recorded on the challan (e.g. the party's per-process rate was
  // updated after the inward challan was created), so an amount-based
  // "exceeds remaining" check would incorrectly block a valid re-priced
  // invoice. `remaining`/`wouldExceed` below are informational only now.
  const fullyInvoiced   = challanInfo && (billingStatus ? billingStatus.isFullyInvoiced : remaining <= 0.01);
  const wouldExceed     = challanInfo && subtotal > remaining + 0.01;

  const remainingByChallanItem = new Map((billingStatus?.lineStatus || []).map(x => [String(x.challanItemId), x]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromPartyId || !form.toPartyId) { toast.error('From and To party are required.'); return; }
    if (!form.invoiceSeriesId) { toast.error('Invoice series is required.'); return; }
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
    setLoading(true);
    try {
      const payload = { ...form, items: lineItems };
      if (!payload.challanId) delete payload.challanId;

      if (isEdit) {
        const r = await api.put(`/invoices/${id}`, payload);
        toast.success(`Invoice ${r.data.data.invoiceNo} update ho gayi.`);
        navigate(`/invoices/${id}`);
      } else {
        const r = await api.post('/invoices', payload);
        toast.success(`Invoice ${r.data.data.invoiceNo} created!`);
        navigate('/invoices');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isEdit ? 'Invoice update nahi hui.' : 'Error creating invoice.'));
    } finally { setLoading(false); }
  };

  const PAY_BADGE = { PENDING:'bg-orange-100 text-orange-700', PARTIAL:'bg-sky-100 text-sky-700', PAID:'bg-emerald-100 text-emerald-700' };

  return (
    <div className="page-stack w-full min-w-0 max-w-5xl 3xl:max-w-6xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to="/invoices"
            className="w-11 h-11 shrink-0 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="space-y-2 min-w-0">
            <h1 className="page-title">{isEdit ? 'Edit Tax Invoice' : 'Create Tax Invoice'}</h1>
            {isEdit ? (
              <p className="page-subtitle max-w-2xl">
                Invoice No.: <span className="font-semibold text-slate-700 font-mono">{editInvoiceNo || '…'}</span>
                <span className="text-slate-400"> · number nahi badalta</span>
              </p>
            ) : (
              <p className="page-subtitle max-w-2xl">Generate a GST invoice linked to challans, job cards, and customer parties.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={fillFromImage} className="w-full sm:w-auto">
            <FileUp /> Load sample data
          </Button>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-full">
            <ReceiptText className="h-3 w-3" /> Tax Invoice
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Lookup by Job Card No</CardTitle>
            <CardDescription>Find the linked challan by typing a job card number.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-3">
              <FormField label="Job Card No" htmlFor="jobCardNoLookup" className="sm:col-span-2">
                <Input
                  id="jobCardNoLookup"
                  type="text"
                  value={jobCardNoInput}
                  onChange={(e) => setJobCardNoInput(e.target.value)}
                  placeholder="Enter job card number"
                />
              </FormField>
              <div className="sm:col-span-1 flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => lookupByJobCardNo()}
                  loading={jobCardLookupLoading}
                  className="w-full"
                >
                  {!jobCardLookupLoading && <Search />}
                  {jobCardLookupLoading ? 'Looking up…' : 'Lookup Job Card'}
                </Button>
              </div>
            </div>
            {jobCardLookupMessage && (
              <p className="text-sm text-slate-600">{jobCardLookupMessage}</p>
            )}
          </CardContent>
        </Card>

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

        <InvoiceDetailsSection form={form} setForm={setForm} parties={parties} invoiceSeries={invoiceSeries} />

        <InvoicedItemsSection
          lineItems={lineItems}
          setLineItems={setLineItems}
          processes={processes}
          updateLine={updateLine}
          challanInfo={challanInfo}
          newEmptyLine={newEmptyLine}
          remainingByChallanItem={remainingByChallanItem}
          applyGroupTotal={applyGroupTotal}
          showPartName={form.showPartName}
          setShowPartName={v => setForm(f => ({ ...f, showPartName: v }))}
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
        <div className="flex flex-wrap gap-3 items-center pb-4">
          <Button type="submit" loading={loading} disabled={loading || editLoading || fullyInvoiced || loadingChallan}>
            {!loading && <ReceiptText />}
            {loading
              ? (isEdit ? 'Saving...' : 'Creating...')
              : (isEdit ? 'Save Changes' : 'Create Invoice')}
          </Button>
          {fullyInvoiced && (
            <span className="inline-flex items-center gap-1.5 text-sm text-rose-600 font-semibold">
              <Ban className="h-4 w-4 shrink-0" /> Fully invoiced — cannot create new bill
            </span>
          )}
          {wouldExceed && !fullyInvoiced && (
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Amount exceeds remaining balance
            </span>
          )}
          <Button variant="ghost" asChild className="ml-auto">
            <Link to="/invoices">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
