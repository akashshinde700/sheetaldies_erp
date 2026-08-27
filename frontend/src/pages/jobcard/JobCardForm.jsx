import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { useMachines, useParties } from '../../hooks/useMasterData';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, Save, Plus } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';

// Subcomponents
import CustomerSection from './components/CustomerSection';
import JobCardHeaderInfoSection from './components/JobCardHeaderInfoSection';
import IssueInstructionsSection from './components/IssueInstructionsSection';
import ProductionSection from './components/ProductionSection';
import StatusRemarksSection from './components/StatusRemarksSection';
import PhotoSection from './components/PhotoSection';
import LinkedDataSection from './components/LinkedDataSection';
import InspectionEditSection from './components/InspectionEditSection';
import SearchSelect from '../../components/SearchSelect';

export default function JobCardForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);

  const [form, setForm] = useState({
    partId: '', operationNo: '', drawingNo: '', showDrawingNoInPrint: true, showDrawingNoLabelInPrint: true, woNo: '', machineId: '',
    operatorName: '', quantity: '', startDate: '', endDate: '', remarks: '', status: 'CREATED',
    dieNo: '', yourNo: '', heatNo: '', dieMaterial: '', customerId: '',
    receivedDate: '', dueDate: '', totalWeight: '', dispatchMode: '', operationMode: 'NORMAL',
    issueDate: '', issueBy: '',
    specInstrCert: false, specInstrMPIRep: false, specInstrGraph: false,
    certificateNo: '', customerNameSnapshot: '', customerAddressSnapshot: '',
    factoryName: 'SHEETAL DIES & TOOLS PVT. LTD.', factoryAddress: 'OM Sai Industrial Premises Co.Op.Soc., Plot No. 84/2, Sector No. 10, PCNTDA, Bhosari, Pune – 411026',
    contactEmail: 'info@sheetaldies.in',
    dispatchByOurVehicle: false, dispatchByCourier: false, collectedByCustomer: false,
    hrcRange: '', specialRequirements: '', precautions: '',
    documentNo: 'QF-PD-01', revisionNo: '01', revisionDate: '', pageNo: '1 OF 2',
    controlPlanNo: '', specification: '',
  });
  const queryClient = useQueryClient();
  const { data: machines = [] } = useMachines();
  const { data: customers = [] } = useParties();
  const [loading,    setLoading]   = useState(false);
  const [cardData,   setCardData]  = useState(null);
  const [images,     setImages]    = useState({});
  const [savingSlot, setSavingSlot] = useState(null);
  const [challanNoLookup, setChallanNoLookup] = useState('');
  // Typing a bare number like "0004" should surface the whole inward, the way
  // the inward register does — a plain text box gave no hint of what existed.
  const [inwardOptions, setInwardOptions] = useState([]);
  const [pickedChallan, setPickedChallan] = useState(null);
  const [pickedItemIds, setPickedItemIds] = useState(new Set());
  // Arriving from an inward's "Create" link — prefill the number so the user
  // does not have to copy it across.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setChallanNoLookup(ref);
  }, []);

  useEffect(() => {
    if (isEdit) return;
    api.get('/jobwork', { params: { limit: 200 } })
      .then(r => setInwardOptions(r.data.data || []))
      .catch(() => {});
  }, [isEdit]);
  const [creatingFromChallan, setCreatingFromChallan] = useState(false);
  // Ref to LinkedDataSection so the main "Update" button can flush any item
  // row still open in edit mode before saving the job card header.
  const linkedDataRef = useRef(null);
  // Ref to InspectionEditSection so the main "Update" button also persists
  // any page-2 inspection edits (categorization, process, hardness,
  // distortion, etc.) the user made without clicking "Save Inspection".
  const inspectionRef = useRef(null);

  const buildPartyAddress = (p) => {
    if (!p) return '';
    const line = [p.address, p.city, p.state, p.pinCode].filter(Boolean).join(', ');
    return line || p.address || '';
  };

  const applyCustomerFromParty = (partyIdStr) => {
    const idStr = partyIdStr === '' ? '' : String(partyIdStr);
    if (!idStr) {
      setForm((prev) => ({ ...prev, customerId: '' }));
      return;
    }
    const p = customers.find((c) => String(c.id) === idStr);
    setForm((prev) => ({
      ...prev,
      customerId: idStr,
      ...(p
        ? {
            customerNameSnapshot: p.name || '',
            customerAddressSnapshot: buildPartyAddress(p),
            contactEmail: p.email || prev.contactEmail,
          }
        : {}),
    }));
  };

  const loadCard = async () => {
    if (!isEdit) return;
    const jr = await api.get(`/jobcards/${id}`);
    setCardData(jr.data.data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isEdit) {
          const jr = await api.get(`/jobcards/${id}`);
          if (cancelled) return;
          const d = jr.data.data;
          setCardData(d);

          setForm({
            partId:       d.partId       || '',
            dieNo:        d.dieNo        || '',
            yourNo:       d.yourNo       || '',
            heatNo:       d.heatNo       || '',
            dieMaterial:  d.dieMaterial  || '',
            customerId:   d.customerId   ? String(d.customerId) : '',
            operationNo:  d.operationNo  || '',
            drawingNo:    d.drawingNo    || '',
            showDrawingNoInPrint: d.showDrawingNoInPrint !== false,
            showDrawingNoLabelInPrint: d.showDrawingNoLabelInPrint !== false,
            woNo:         d.woNo         || '',
            machineId:    d.machineId    || '',
            operatorName: d.operatorName || '',
            quantity:     d.quantity     || '',
            totalWeight:  d.totalWeight  || '',
            startDate:    d.startDate    ? d.startDate.split('T')[0]    : '',
            receivedDate: d.receivedDate ? d.receivedDate.split('T')[0] : '',
            dueDate:      d.dueDate      ? d.dueDate.split('T')[0]      : '',
            endDate:      d.endDate      ? d.endDate.split('T')[0]      : '',
            issueDate:    d.issueDate    ? d.issueDate.split('T')[0]    : '',
            issueBy:      d.issueBy      || '',
            certificateNo: d.certificateNo || '',
            customerNameSnapshot: d.customerNameSnapshot || '',
            customerAddressSnapshot: d.customerAddressSnapshot || '',
            factoryName: d.factoryName || 'SHITAL VACUUM TREAT PVT LTD.',
            factoryAddress: d.factoryAddress || 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune',
            contactEmail: d.contactEmail || 'info@shitalgroup.com',
            dispatchByOurVehicle: d.dispatchByOurVehicle || false,
            dispatchByCourier: d.dispatchByCourier || false,
            collectedByCustomer: d.collectedByCustomer || false,
            hrcRange: d.hrcRange || '',
            specialRequirements: d.specialRequirements || '',
            precautions: d.precautions || '',
            documentNo: d.documentNo || 'QF-PD-01',
            revisionNo: d.revisionNo || '01',
            revisionDate: d.revisionDate ? d.revisionDate.split('T')[0] : '',
            pageNo: d.pageNo || '1 OF 2',
            remarks:       d.remarks       || '',
            dispatchMode: d.dispatchMode || '',
            status:        d.status        || 'CREATED',
            operationMode: d.operationMode || 'NORMAL',
            specInstrCert: d.specInstrCert || false,
            specInstrMPIRep: d.specInstrMPIRep || false,
            specInstrGraph: d.specInstrGraph || false,
            controlPlanNo: d.controlPlanNo || '',
            specification: d.specification || '',
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  // Keep form.totalWeight in sync with the saved job card weight. The linked
  // items table (LinkedDataSection) saves totalWeight on its own via a
  // separate PUT; without this the parent form keeps a stale value and the
  // main "Update" button would overwrite the DB weight with null on submit.
  useEffect(() => {
    if (cardData?.totalWeight != null) {
      setForm(prev => ({ ...prev, totalWeight: String(Number(cardData.totalWeight)) }));
    }
  }, [cardData?.totalWeight]);

  // Auto-populate address when customerId is set but address is empty (e.g. customers load after form fill)
  useEffect(() => {
    if (!form.customerId || form.customerAddressSnapshot) return;
    const p = customers.find(c => String(c.id) === String(form.customerId));
    if (p) {
      setForm(prev => ({
        ...prev,
        customerNameSnapshot: prev.customerNameSnapshot || p.name || '',
        customerAddressSnapshot: buildPartyAddress(p),
      }));
    }
  }, [form.customerId, customers]);

  const handleCreateFromChallan = async (e) => {
      e.preventDefault();
      const challanNo = challanNoLookup.trim();
      if (!challanNo) {
        toast.error('Enter challan number to create job card.');
        return;
      }
      setCreatingFromChallan(true);
      try {
        const r = await api.post('/jobwork/jobcard-from-challan', { challanNo });
        const jobCard = r.data.data.jobCard;
        toast.success(`Job card ${jobCard.jobCardNo} created from challan ${r.data.data.challan.challanNo}.`);
        navigate(`/jobcards/${jobCard.id}/edit`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not create job card from challan.');
      } finally {
        setCreatingFromChallan(false);
      }
    };

  // Picking from the dropdown fills the form and lists the challan's items, so
  // a partly job-carded inward can be finished a few items at a time — the same
  // way it works from the inward itself.
  const selectInward = async (ref) => {
    setChallanNoLookup(ref);
    setPickedChallan(null);
    setPickedItemIds(new Set());
    if (!ref) return;
    try {
      const r = await api.get('/jobwork/challan-lookup', { params: { ref } });
      const challan = r.data.data;
      setPickedChallan(challan);
      const open = (challan.items || []).filter(it => !it.jobCardId).map(it => it.id);
      setPickedItemIds(new Set(open));
      applyChallanToForm(challan);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not fetch inward.');
    }
  };

  const applyChallanToForm = (challan) => {
    setForm((prev) => ({
      ...prev,
      customerId: challan.fromPartyId ? String(challan.fromPartyId) : prev.customerId,
      customerNameSnapshot: challan.fromParty?.name || prev.customerNameSnapshot,
      customerAddressSnapshot: buildPartyAddress(challan.fromParty) || prev.customerAddressSnapshot,
      receivedDate: challan.challanDate ? challan.challanDate.split('T')[0] : prev.receivedDate,
      quantity: challan.items?.length ? String(challan.items.reduce((sum, it) => sum + (it.quantity || 0), 0)) : prev.quantity,
      totalWeight: challan.items?.length ? String(challan.items.reduce((sum, it) => sum + (Number(it.weight) || 0), 0)) : prev.totalWeight,
      issueBy: challan.issuedBy || prev.issueBy,
    }));
  };

  const createFromPickedItems = async () => {
    if (!pickedItemIds.size) { toast.error('Select at least one item.'); return; }
    setCreatingFromChallan(true);
    try {
      const r = await api.post('/jobwork/jobcard-from-items', { itemIds: [...pickedItemIds] });
      const jobCard = r.data.data.jobCard;
      toast.success(`Job card ${jobCard.jobCardNo} created from ${pickedItemIds.size} item(s).`);
      navigate(`/jobcards/${jobCard.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create job card.');
    } finally {
      setCreatingFromChallan(false);
    }
  };

  const fillFromChallan = async () => {
    const challanNo = challanNoLookup.trim();
    if (!challanNo) {
      toast.error('Enter challan number to fill the form.');
      return;
    }
    setCreatingFromChallan(true);
    try {
      // Query string, not a path segment: an inward no like "INW/26-27/0002"
      // has slashes, and nginx turns %2F back into / so the route stops
      // matching entirely.
      const r = await api.get('/jobwork/challan-lookup', { params: { ref: challanNo } });
      const challan = r.data.data;
      // Pre-fill form with challan data
      setForm((prev) => ({
        ...prev,
        customerId: challan.fromPartyId ? String(challan.fromPartyId) : prev.customerId,
        customerNameSnapshot: challan.fromParty?.name || prev.customerNameSnapshot,
        customerAddressSnapshot: buildPartyAddress(challan.fromParty) || prev.customerAddressSnapshot,
        receivedDate: challan.challanDate ? challan.challanDate.split('T')[0] : prev.receivedDate,
        quantity: challan.items?.length ? String(challan.items.reduce((sum, it) => sum + (it.quantity || 0), 0)) : prev.quantity,
        totalWeight: challan.items?.length ? String(challan.items.reduce((sum, it) => sum + (Number(it.weight) || 0), 0)) : prev.totalWeight,
        issueBy: challan.issuedBy || prev.issueBy,
      }));
      toast.success(`Form filled from challan ${challan.challanNo}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not fetch challan.');
    } finally {
      setCreatingFromChallan(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let customerIdOut = form.customerId ? Number(form.customerId) : null;
    try {
      // Commit any open item-row edits in the linked items table first, so the
      // main "Update" button also persists inline item changes the user made
      // without clicking the row-level Save.
      // Holds the total weight the linked-items section currently has, so the
      // header PUT below uses it instead of the (async, possibly stale)
      // form.totalWeight — otherwise the header PUT would overwrite a
      // just-flushed weight with an old value.
      let effectiveTotalWeight;
      if (isEdit && linkedDataRef.current?.flushPendingEdits) {
        const flushed = await linkedDataRef.current.flushPendingEdits();
        if (!flushed.ok) {
          toast.error('Could not save one or more item edits. Please review the items table.');
          setLoading(false);
          return;
        }
        if (flushed.totalWeight != null) effectiveTotalWeight = flushed.totalWeight;
      }
      // Also commit any page-2 inspection edits so the single "Update" button
      // saves the whole page even if the user never clicked "Save Inspection".
      if (isEdit && inspectionRef.current?.flushPendingEdits) {
        const inspFlushed = await inspectionRef.current.flushPendingEdits();
        if (!inspFlushed) {
          toast.error('Could not save inspection details. Please review the inspection section.');
          setLoading(false);
          return;
        }
      }
      if (!customerIdOut && form.customerNameSnapshot?.trim()) {
        const existing = customers.find(c => c.name.toLowerCase() === form.customerNameSnapshot.trim().toLowerCase());
        if (!existing) {
          try {
            const pr = await api.post('/parties', {
              name: form.customerNameSnapshot.trim(),
              partyType: 'CUSTOMER',
              address: form.customerAddressSnapshot || '',
            });
            customerIdOut = pr.data.data.id;
            queryClient.setQueryData(['parties'], (old) => old ? [...old, pr.data.data].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : [pr.data.data]);
            toast.success(pr.data.reused ? 'Existing customer in master linked.' : 'Customer added to party master.');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not add customer to parties.');
            setLoading(false);
            return;
          }
        }
      }

      const payload = { ...form, customerId: customerIdOut };
      // Prefer the weight the linked-items section just flushed, so we never
      // clobber it with a stale value from the async form state.
      if (effectiveTotalWeight != null) payload.totalWeight = effectiveTotalWeight;
      const fd = new FormData();
      Object.keys(payload).forEach((k) => {
        const v = payload[k];
        if (v === undefined || v === null) fd.append(k, '');
        else fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : v);
      });
      for (let i = 1; i <= 5; i++) { if (images[i] instanceof File) fd.append(`image${i}`, images[i]); }
      if (isEdit) {
        await api.put(`/jobcards/${id}`, fd);
        toast.success('Job card updated.');
        const refreshed = await api.get(`/jobcards/${id}`);
        setCardData(refreshed.data.data);
      } else {
        const r = await api.post('/jobcards', fd);
        toast.success(`Job card ${r.data.data.jobCardNo} created!`);
        navigate('/jobcards');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving job card.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (index, file) => {
    setImages(prev => ({ ...prev, [index]: file }));

    if (!isEdit) return;

    setSavingSlot(index);
    try {
      if (file === null) {
        // Remove image: delete file from disk + clear DB field
        await api.delete(`/jobcards/${id}/image/${index}`);
        toast.success(`Image ${index} removed.`);
      } else {
        // Upload new image — use api (axios) so X-Request-ID header is sent,
        // which is required by the backend CSRF middleware for cookie-auth PUT requests.
        const fd = new FormData();
        fd.append(`image${index}`, file);
        await api.put(`/jobcards/${id}`, fd);
        toast.success(`Image ${index} saved.`);
      }
      setImages(prev => ({ ...prev, [index]: null }));
      const r = await api.get(`/jobcards/${id}`);
      setCardData(r.data.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update image.');
      setImages(prev => ({ ...prev, [index]: null }));
    } finally {
      setSavingSlot(null);
    }
  };

  const STATUS_TRANSITIONS = {
    CREATED: 'IN_PROGRESS',
    IN_PROGRESS: 'SENT_FOR_JOBWORK',
    SENT_FOR_JOBWORK: 'INSPECTION',
    INSPECTION: 'COMPLETED',
  };

  const moveToNextStatus = () => {
    setForm(p => ({ ...p, status: STATUS_TRANSITIONS[p.status] || p.status }));
  };

  // Jis inward challan se ye job card bana — header me dikhane ke liye
  const linkedChallan = cardData
    ? (cardData.challanItemLinks?.[0]?.challan || cardData.challans?.[0] || null)
    : null;

  const STATUS_COLOR = {
    CREATED: 'bg-slate-100 text-slate-600', IN_PROGRESS: 'bg-blue-100 text-blue-700',
    SENT_FOR_JOBWORK: 'bg-amber-100 text-amber-700', INSPECTION: 'bg-violet-100 text-violet-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700', ON_HOLD: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="page-stack w-full animate-slide-up">
      {/* ── Page header ── */}
      <div className="page-header">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon" className="rounded-xl shrink-0 text-slate-500 hover:text-slate-900">
            <Link to="/jobcards" aria-label="Back to job cards">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="space-y-2">
            <h1 className="page-title">{isEdit ? 'Edit Job Card' : 'Create Job Card'}</h1>
            {isEdit && cardData && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
                <span className="font-medium">Job Card No.: <span className="font-semibold text-slate-700">{cardData.jobCardNo}</span></span>
                <span className={`badge ${STATUS_COLOR[cardData.status] || 'bg-slate-100 text-slate-600'}`}>{cardData.status?.replace(/_/g, ' ')}</span>
                {linkedChallan?.inwardNo && (
                  <span className="text-slate-400">·<span className="ml-3 font-medium">Inward No.: </span>
                    {linkedChallan.id ? (
                      <Link to={`/jobwork/${linkedChallan.id}`} className="font-mono font-semibold text-sky-700 hover:text-sky-900 hover:underline">
                        {linkedChallan.inwardNo}
                      </Link>
                    ) : (
                      <span className="font-mono font-semibold text-slate-700">{linkedChallan.inwardNo}</span>
                    )}
                  </span>
                )}
                {cardData.partName && (
                  <span className="text-slate-400">·<span className="ml-3 text-slate-600">{cardData.partName}</span></span>
                )}
                {cardData.updatedAt && (
                  <span className="text-slate-400">·<span className="ml-3">Updated {cardData.updatedAt.split('T')[0]}</span></span>
                )}
              </div>
            )}
          </div>
        </div>

        {isEdit && cardData ? (
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <Button asChild variant="outline">
              <Link to={`/jobcards/${id}/print`}>
                <Printer />
                Print
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {/* ── Create from inward (create mode) ── */}
      {!isEdit && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Create from Inward</CardTitle>
            <CardDescription>Poore inward ka job card banao, ya neeche se items chuno.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_auto] gap-x-4 gap-y-3 items-end">
              <FormField label="Inward No / Challan No">
                <SearchSelect
                  value={challanNoLookup}
                  onChange={selectInward}
                  options={inwardOptions.map(c => ({
                    value: c.inwardNo || c.challanNo,
                    label: [c.inwardNo, c.challanNo, c.fromParty?.name].filter(Boolean).join('  ·  ')
                      + (c.jobCardStatus === 'DONE' ? '   (job card ban chuka)' : ''),
                  }))}
                  placeholder="Type 0004, INW/26-27/0004 ya party ka naam"
                  useFixed
                />
              </FormField>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillFromChallan}
                  disabled={creatingFromChallan}
                >
                  {creatingFromChallan ? 'Loading...' : 'Fill Form'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateFromChallan}
                  disabled={creatingFromChallan}
                >
                  {creatingFromChallan ? 'Creating...' : 'Create Job Card'}
                </Button>
              </div>
            </div>

            {pickedChallan && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      {pickedChallan.inwardNo || pickedChallan.challanNo}
                      <span className="text-slate-400 font-normal"> · {pickedChallan.fromParty?.name || '—'}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Jin items ka job card banana hai wo chuno — baaki baad me bana sakte ho.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setPickedItemIds(prev => {
                      const open = (pickedChallan.items || []).filter(it => !it.jobCardId).map(it => it.id);
                      return prev.size === open.length ? new Set() : new Set(open);
                    })}
                    className="text-xs font-bold"
                  >
                    Select All / None
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {(pickedChallan.items || []).map((it, i) => {
                    const taken = !!it.jobCardId;
                    return (
                      <label key={it.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-colors ${
                          taken ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                                : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 cursor-pointer'}`}>
                        <input type="checkbox" disabled={taken}
                          checked={pickedItemIds.has(it.id)}
                          onChange={e => setPickedItemIds(prev => {
                            const n = new Set(prev);
                            e.target.checked ? n.add(it.id) : n.delete(it.id);
                            return n;
                          })}
                          className="accent-sky-600 w-4 h-4" />
                        <span className="text-slate-400 font-mono w-5 tabular-nums">{i + 1}</span>
                        <span className="font-semibold text-slate-700 flex-1 truncate">
                          {it.partName || it.description || 'Item'}
                        </span>
                        <span className="text-slate-500">{it.material || '—'}</span>
                        <span className="text-slate-500 font-mono tabular-nums">{it.quantity} {it.uom || ''}</span>
                        {taken && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">job card ban chuka</span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                  <p className="text-[11px] text-slate-500">
                    <strong>{pickedItemIds.size}</strong> item chune
                    {' '}({(pickedChallan.items || []).filter(it => it.jobCardId).length} pehle se job card me)
                  </p>
                  <Button
                    type="button"
                    onClick={createFromPickedItems}
                    disabled={creatingFromChallan || !pickedItemIds.size}
                  >
                    <Plus />
                    {creatingFromChallan ? 'Creating...' : `Create Job Card (${pickedItemIds.size})`}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <form id="job-card-form" onSubmit={handleSubmit} className="space-y-4">
        <CustomerSection
          form={form}
          setForm={setForm}
          customers={customers}
          applyCustomerFromParty={applyCustomerFromParty}
        />

        <JobCardHeaderInfoSection
          form={form}
          setForm={setForm}
          cardData={cardData}
        />

        <IssueInstructionsSection form={form} setForm={setForm} />

        <ProductionSection form={form} setForm={setForm} weightSummary={cardData?.weightSummary} />

        <StatusRemarksSection form={form} setForm={setForm} />

        <PhotoSection handleImageChange={handleImageChange} existingImages={cardData} savingSlot={savingSlot} />

        {/* Actions */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">Ready to save?</p>
              <p className="text-xs text-slate-500">Use the buttons below after reviewing the job details.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={loading} loading={loading}>
                {!loading && <Save />}
                {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create Job Card')}
              </Button>
              {isEdit && (
                <Button asChild variant="outline">
                  <Link to={`/jobcards/${id}/print`}>
                    <Printer /> Print
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link to="/jobcards">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {isEdit && cardData && (
        <InspectionEditSection ref={inspectionRef} id={id} inspection={cardData.inspection} hrcRange={form.hrcRange} />
      )}

      <LinkedDataSection
        ref={linkedDataRef}
        isEdit={isEdit}
        cardData={cardData}
        id={id}
        onRefresh={loadCard}
        onTotalWeightSaved={(w) => setForm(prev => ({ ...prev, totalWeight: String(w) }))}
      />

      {/* Bottom actions — same Update/Print as the top bar, reachable without
          scrolling back up after editing the Inspection/Linked Data sections below the form. */}
      <div className="flex flex-wrap gap-3 pt-1 pb-4">
        <Button type="submit" form="job-card-form" disabled={loading} loading={loading}>
          {!loading && <Save />}
          {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create Job Card')}
        </Button>
        {isEdit && (
          <Button asChild variant="outline">
            <Link to={`/jobcards/${id}/print`}>
              <Printer /> Print
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link to="/jobcards">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
