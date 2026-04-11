import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { useItems, useMachines, useParties } from '../../hooks/useMasterData';
import toast from 'react-hot-toast';

// Subcomponents
import CustomerSection from './components/CustomerSection';
import JobCardHeaderInfoSection from './components/JobCardHeaderInfoSection';
import IssueInstructionsSection from './components/IssueInstructionsSection';
import ProductionSection from './components/ProductionSection';
import JobDatesSection from './components/JobDatesSection';
import StatusRemarksSection from './components/StatusRemarksSection';
import DocControlSection from './components/DocControlSection';
import PhotoSection from './components/PhotoSection';
import LinkedDataSection from './components/LinkedDataSection';

export default function JobCardForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);

  const [form, setForm] = useState({
    partId: '', operationNo: '', drawingNo: '', machineId: '',
    operatorName: '', quantity: '', startDate: '', endDate: '', remarks: '', status: 'CREATED',
    dieNo: '', yourNo: '', heatNo: '', dieMaterial: '', customerId: '',
    receivedDate: '', dueDate: '', totalWeight: '', dispatchMode: '', operationMode: 'NORMAL',
    issueDate: '', issueBy: '',
    specInstrCert: false, specInstrMPIRep: false, specInstrGraph: false,
    certificateNo: '', customerNameSnapshot: '', customerAddressSnapshot: '',
    factoryName: 'SHITAL VACUUM TREAT PVT LTD.', factoryAddress: 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune',
    contactEmail: 'info@shitalgroup.com',
    dispatchByOurVehicle: false, dispatchByCourier: false, collectedByCustomer: false,
    hrcRange: '', specialRequirements: '', precautions: '',
    documentNo: 'QF-PD-01', revisionNo: '01', revisionDate: '', pageNo: '1 OF 2',
  });
  const queryClient = useQueryClient();
  const { data: parts = [] } = useItems();
  const { data: machines = [] } = useMachines();
  const { data: customers = [] } = useParties();
  const [loading,   setLoading]   = useState(false);
  const [cardData,  setCardData]  = useState(null);
  const [images,    setImages]    = useState({});

  // Part quick-add state
  const [partOpen,     setPartOpen]     = useState(false);
  const [partQuery,    setPartQuery]    = useState('');
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [newPart,      setNewPart]      = useState({ partNo: '', description: '' });
  const [savingPart,   setSavingPart]   = useState(false);
  const partWrapRef = useRef(null);
  const partInputRef = useRef(null);

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
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  // Close part dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (partWrapRef.current && !partWrapRef.current.contains(e.target)) {
        setPartOpen(false); setPartQuery(''); setShowAddForm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredParts = partQuery.trim()
    ? parts.filter(p => `${p.partNo} ${p.description}`.toLowerCase().includes(partQuery.toLowerCase()))
    : parts;

  const openPartDropdown = () => {
    setPartOpen(true); setPartQuery(''); setShowAddForm(false);
    setTimeout(() => partInputRef.current?.focus(), 0);
  };

  const selectPart = (part) => {
    setForm((p) => ({
      ...p,
      partId: String(part.id),
      drawingNo: part.drawingNo != null ? String(part.drawingNo) : '',
    }));
    setPartOpen(false); setPartQuery(''); setShowAddForm(false);
  };

  const clearPart = (e) => {
    e.stopPropagation();
    setForm(p => ({ ...p, partId: '', drawingNo: '' }));
    setPartOpen(false); setPartQuery('');
  };

  const initQuickAdd = () => {
    setShowAddForm(true);
    setNewPart({ partNo: '', description: partQuery.trim() });
  };

  const handleQuickAddPart = async (e) => {
    e.preventDefault();
    if (!newPart.description.trim()) { toast.error('Description is required.'); return; }
    setSavingPart(true);
    try {
      const r = await api.post('/items', {
        partNo:      newPart.partNo.trim() || `P-${Date.now()}`,
        description: newPart.description.trim(),
      });
      const created = r.data.data;
      queryClient.setQueryData(['items'], (old) => old ? [...old, created].sort((a, b) => a.partNo.localeCompare(b.partNo)) : [created]);
      setForm(p => ({ ...p, partId: String(created.id) }));
      setPartOpen(false); setPartQuery(''); setShowAddForm(false);
      toast.success(`Part "${created.description}" added & selected!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add part.');
    } finally {
      setSavingPart(false);
    }
  };

  const handleImageChange = (i, file) => setImages(p => ({ ...p, [i]: file }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.partId || !form.quantity) {
      toast.error('Part and quantity are required.');
      return;
    }
    setLoading(true);
    try {
      let customerIdOut = form.customerId?.trim() || '';
      if (!customerIdOut) {
        const cname = form.customerNameSnapshot?.trim();
        const caddr = form.customerAddressSnapshot?.trim();
        if (cname && caddr) {
          try {
            const pr = await api.post('/parties/quick', {
              name: cname,
              address: caddr,
              email: form.contactEmail?.trim() || undefined,
            });
            customerIdOut = String(pr.data.data.id);
            setForm((p) => ({ ...p, customerId: customerIdOut }));
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

  const fillFromImage = () => {
    const selectedPart = parts[0] || {};
    const selectedMachine = machines[0] || {};
    const selectedCustomer = customers[0] || {};
    setForm({
      partId: selectedPart.id ? String(selectedPart.id) : '',
      dieNo: selectedPart.partNo || '',
      yourNo: selectedCustomer.name ? `REF-${selectedCustomer.id || ''}` : '',
      heatNo: selectedPart.heatNo || '',
      dieMaterial: selectedPart.material || '',
      customerId: selectedCustomer.id ? String(selectedCustomer.id) : '',
      operationNo: selectedPart.operationNo || '',
      drawingNo: selectedPart.drawingNo || '',
      machineId: selectedMachine.id ? String(selectedMachine.id) : '',
      operatorName: selectedMachine.operatorName || '',
      quantity: selectedPart.quantity ? String(selectedPart.quantity) : '0',
      totalWeight: selectedPart.totalWeight ? String(selectedPart.totalWeight) : '',
      startDate: selectedPart.startDate ? selectedPart.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      receivedDate: selectedPart.receivedDate ? selectedPart.receivedDate.split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: selectedPart.dueDate ? selectedPart.dueDate.split('T')[0] : new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      endDate: selectedPart.endDate ? selectedPart.endDate.split('T')[0] : '',
      remarks: selectedPart.remarks || 'Follow drawing and tolerance',
      status: 'CREATED',
      operationMode: selectedPart.operationMode || 'NORMAL',
      certificateNo: '',
      customerNameSnapshot: selectedCustomer.name || '',
      customerAddressSnapshot: buildPartyAddress(selectedCustomer) || selectedCustomer.address || '',
      factoryName: 'SHITAL VACUUM TREAT PVT LTD.',
      factoryAddress: 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune',
      contactEmail: 'info@shitalgroup.com',
      dispatchByOurVehicle: true,
      dispatchByCourier: false,
      collectedByCustomer: false,
      hrcRange: '54-56 HRC',
      specialRequirements: '',
      precautions: '',
      documentNo: 'QF-PD-01',
      revisionNo: '01',
      revisionDate: '',
      pageNo: '1 OF 2',
    });
    toast.success('Job card values loaded from DB-backed sample.');
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

  const STATUS_COLOR = {
    CREATED: 'bg-slate-100 text-slate-600', IN_PROGRESS: 'bg-blue-100 text-blue-700',
    SENT_FOR_JOBWORK: 'bg-amber-100 text-amber-700', INSPECTION: 'bg-violet-100 text-violet-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700', ON_HOLD: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="page-stack w-full animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/jobcards"
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">
            {isEdit ? 'Edit Job Card' : 'New Job Card'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Customer, Certificate/PO, Dispatch, Material/Process, Item/Qty/Weight, Instructions, Document Control</p>
          {isEdit && cardData && (
            <p className="text-xs text-slate-400 mt-0.5 font-mono">Job Card No.: {cardData.jobCardNo}</p>
          )}
        </div>
        {isEdit && cardData && (
          <div className="ml-auto flex items-center gap-2">
            <Link to={`/jobcards/${id}/print`} className="btn-outline bg-white">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print
            </Link>
            <span className={`badge ${STATUS_COLOR[cardData.status] || 'bg-slate-100 text-slate-600'}`}>
              {cardData.status?.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          parts={parts} 
          partOpen={partOpen} 
          partWrapRef={partWrapRef} 
          openPartDropdown={openPartDropdown} 
          clearPart={clearPart} 
          partInputRef={partInputRef} 
          partQuery={partQuery} 
          setPartQuery={setPartQuery} 
          setShowAddForm={setShowAddForm} 
          filteredParts={filteredParts} 
          selectPart={selectPart} 
          showAddForm={showAddForm} 
          initQuickAdd={initQuickAdd} 
          handleQuickAddPart={handleQuickAddPart} 
          newPart={newPart} 
          setNewPart={setNewPart} 
          savingPart={savingPart} 
          setPartOpen={setPartOpen}
        />

        <IssueInstructionsSection form={form} setForm={setForm} />

        <ProductionSection form={form} setForm={setForm} machines={machines} />

        <JobDatesSection form={form} setForm={setForm} />

        <StatusRemarksSection 
          isEdit={isEdit} 
          form={form} 
          setForm={setForm} 
          moveToNextStatus={moveToNextStatus} 
        />

        <DocControlSection form={form} setForm={setForm} />

        <PhotoSection handleImageChange={handleImageChange} existingImages={cardData} />

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={fillFromImage} className="btn-outline">
            <span className="material-symbols-outlined text-sm">file_upload</span> Load from image sample
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Saving...</> : <><span className="material-symbols-outlined text-sm">save</span> {isEdit ? 'Update' : 'Create Job Card'}</>}
          </button>
          {isEdit && (
            <Link to={`/jobcards/${id}/inspection`} className="btn-ghost" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', border: 'none' }}>
              <span className="material-symbols-outlined text-sm">fact_check</span> Inspection →
            </Link>
          )}
          <Link to="/jobcards" className="btn-ghost">Cancel</Link>
        </div>
      </form>

      <LinkedDataSection isEdit={isEdit} cardData={cardData} id={id} />
    </div>
  );
}
