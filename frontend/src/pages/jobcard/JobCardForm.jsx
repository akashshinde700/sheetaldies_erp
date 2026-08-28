import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { useMachines, useParties } from '../../hooks/useMasterData';
import toast from 'react-hot-toast';
import { Printer, Plus, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/ui/status-pill';
import { Stepper, useStepper } from '@/components/ui/stepper';
import { FormErrorSummary, focusField } from '@/components/ui/field';

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
import { Input } from '@/components/ui/input';

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
  const [formErrors, setFormErrors] = useState({});

  // Minimal required-field validation. Runs on submit; shows inline messages
  // next to the field plus a focusable summary. Does not touch the save path
  // or the inspection / item flush that follows.
  const validate = () => {
    const errs = {};
    const qty = Number(form.quantity);
    if (!form.quantity || Number.isNaN(qty) || qty < 1) errs.quantity = 'Enter a quantity of 1 or more.';
    if (!form.customerId && !form.customerNameSnapshot?.trim()) {
      errs.customerId = 'Pick a party or type a customer name.';
    }
    return errs;
  };
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
    // Coming in from the Inwards register "Create Job Card" action — pull the
    // challan straight away so Quantity / Total Weight / customer are filled.
    if (ref) selectInward(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const errs = validate();
    setFormErrors(errs);
    if (Object.keys(errs).length) {
      const firstKey = Object.keys(errs)[0];
      if (isEdit) {
        const stepByKey = { customerId: 0, customerNameSnapshot: 0, quantity: 1 };
        wiz.goto(stepByKey[firstKey] ?? 0);
      }
      setTimeout(() => focusField(firstKey), 0);
      toast.error('Please fix the highlighted fields before saving.');
      return;
    }
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

  const linkedItemCount = cardData
    ? (cardData.challanItemLinks?.length
      || cardData.challans?.reduce((n, c) => n + (c.items?.length || 0), 0)
      || 0)
    : 0;

  const JC_STEPS = [
    { key: 'customer', label: 'Customer & job' },
    { key: 'production', label: 'Production' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'items', label: linkedItemCount ? `Items (${linkedItemCount})` : 'Items' },
    { key: 'docs', label: 'Document control' },
  ];
  const wiz = useStepper(JC_STEPS.length);
  const LAST = JC_STEPS.length - 1;

  const stepCustomer = (
    <>
      <FormErrorSummary
        errors={Object.fromEntries(Object.entries(formErrors).map(([k, v]) => [k, { message: v }]))}
        labels={{ customerId: 'Party / customer', quantity: 'Quantity' }}
      />
      <CustomerSection
        form={form}
        setForm={setForm}
        customers={customers}
        applyCustomerFromParty={applyCustomerFromParty}
        errors={formErrors}
      />
      <JobCardHeaderInfoSection form={form} setForm={setForm} cardData={cardData} />
      <IssueInstructionsSection form={form} setForm={setForm} />
    </>
  );

  const stepProduction = (
    <>
      <ProductionSection form={form} setForm={setForm} weightSummary={cardData?.weightSummary} errors={formErrors} />
      <StatusRemarksSection form={form} setForm={setForm} />
      <PhotoSection handleImageChange={handleImageChange} existingImages={cardData} savingSlot={savingSlot} />
    </>
  );

  const docControlSection = (
    <Card>
      <CardHeader><CardTitle>Document control</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-2 text-xs text-slate-500">
          These fields appear in the printed job-card header. Change only when the quality form revision changes.
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4">
          <FormField label="Document No" htmlFor="jc-documentNo">
            <Input id="jc-documentNo" value={form.documentNo}
              onChange={e => setForm(p => ({ ...p, documentNo: e.target.value }))} className="font-app-mono" />
          </FormField>
          <FormField label="Revision No" htmlFor="jc-revisionNo">
            <Input id="jc-revisionNo" value={form.revisionNo}
              onChange={e => setForm(p => ({ ...p, revisionNo: e.target.value }))} className="font-app-mono" />
          </FormField>
          <FormField label="Revision Date" htmlFor="jc-revisionDate">
            <Input id="jc-revisionDate" type="date" value={form.revisionDate}
              onChange={e => setForm(p => ({ ...p, revisionDate: e.target.value }))} />
          </FormField>
          <FormField label="Page No" htmlFor="jc-pageNo">
            <Input id="jc-pageNo" value={form.pageNo}
              onChange={e => setForm(p => ({ ...p, pageNo: e.target.value }))} className="font-app-mono" />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="font-app flex flex-col h-full min-h-0">
      <PageHeader
        title={isEdit ? `Edit Job Card ${cardData?.jobCardNo ?? ''}`.trim() : 'Create Job Card'}
        backTo={isEdit && id ? `/jobcards/${id}` : '/jobcards'}
        breadcrumbs={
          isEdit
            ? [
                { label: 'Job Cards', to: '/jobcards' },
                { label: cardData?.jobCardNo || 'Job card', to: id ? `/jobcards/${id}` : undefined },
                { label: 'Edit' },
              ]
            : [{ label: 'Job Cards', to: '/jobcards' }, { label: 'New' }]
        }
        meta={
          isEdit && cardData ? (
            <>
              <StatusPill status={cardData.status} />
              {linkedChallan?.inwardNo && (
                <span>
                  Inward{' '}
                  {linkedChallan.id ? (
                    <Link to={`/jobwork/${linkedChallan.id}`} className="font-app-mono font-semibold text-sky-700 hover:underline">
                      {linkedChallan.inwardNo}
                    </Link>
                  ) : (
                    <span className="font-app-mono font-semibold text-slate-700">{linkedChallan.inwardNo}</span>
                  )}
                </span>
              )}
              {cardData.partName && <span className="text-slate-600">{cardData.partName}</span>}
              {cardData.updatedAt && <span className="text-slate-400">Updated {cardData.updatedAt.split('T')[0]}</span>}
            </>
          ) : null
        }
        actions={
          isEdit && cardData ? (
            <Button asChild variant="outline">
              <Link to={`/jobcards/${id}/print`}><Printer /> Print</Link>
            </Button>
          ) : null
        }
      />

      {isEdit && (
        <div className="mt-2 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
          <Stepper steps={JC_STEPS} current={wiz.current} completed={wiz.completed} onStepClick={(i) => wiz.goto(i)} />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 pr-0.5 space-y-3">

      {/* ── Create from inward (create mode) ── */}
      {!isEdit && (
        <Card className="mb-3">
          <CardHeader>
            <CardTitle>Create from Inward</CardTitle>
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

      {isEdit ? (
        <>
          <form id="job-card-form" onSubmit={handleSubmit} className="space-y-3">
            <div hidden={wiz.current !== 0} className="space-y-3">{stepCustomer}</div>
            <div hidden={wiz.current !== 1} className="space-y-3">{stepProduction}</div>
            <div hidden={wiz.current !== 4} className="space-y-3">{docControlSection}</div>
          </form>

          <div hidden={wiz.current !== 2} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-600">
                Quick categorization &amp; required-hardness edits — use <strong>Save Inspection</strong> here, or they are also saved with <strong>Save job card</strong>.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={`/jobcards/${id}/inspection`}><ExternalLink className="h-3.5 w-3.5" /> Full final inspection</Link>
              </Button>
            </div>
            {cardData && (
              <InspectionEditSection ref={inspectionRef} id={id} inspection={cardData.inspection} hrcRange={form.hrcRange} />
            )}
          </div>

          <div hidden={wiz.current !== 3} className="space-y-3">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Each item row saves with its own <strong>Save</strong>. Total weight can also be set on <strong>Production</strong> — both write the same field.
            </p>
            <LinkedDataSection
              ref={linkedDataRef}
              isEdit={isEdit}
              cardData={cardData}
              id={id}
              onRefresh={loadCard}
              onTotalWeightSaved={(w) => setForm(prev => ({ ...prev, totalWeight: String(w) }))}
            />
          </div>

          {/* Sticky nav + save */}
          <div className="sticky bottom-0 z-30 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur sm:px-5">
            <span className="font-app-mono text-xs text-slate-400">Step {wiz.current + 1} of {JC_STEPS.length}</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost"><Link to={`/jobcards/${id}`}>Cancel</Link></Button>
              <Button asChild variant="outline"><Link to={`/jobcards/${id}/print`}><Printer /> Print</Link></Button>
              <Button type="submit" form="job-card-form" loading={loading} disabled={loading}>
                {loading ? 'Saving…' : 'Save job card'}
              </Button>
              <Button type="button" variant="ghost" disabled={wiz.isFirst} onClick={wiz.back}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {wiz.current < LAST && (
                <Button type="button" onClick={wiz.next}>Next <ChevronRight className="h-4 w-4" /></Button>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <form id="job-card-form" onSubmit={handleSubmit} className="space-y-3">
            {stepCustomer}
            {stepProduction}
            {docControlSection}
          </form>
          <div className="sticky bottom-0 z-30 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur sm:px-5">
            <Button asChild variant="ghost"><Link to="/jobcards">Cancel</Link></Button>
            <Button type="submit" form="job-card-form" loading={loading} disabled={loading} className="ml-auto">
              {loading ? 'Creating…' : 'Create Job Card'}
            </Button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
