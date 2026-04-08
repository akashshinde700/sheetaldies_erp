import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import SearchSelect from '../../components/SearchSelect';

function ImageSlot({ index, onChange }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange(index, file);
  };
  return (
    <div className="relative">
      <div onClick={() => !preview && inputRef.current.click()}
        className={`w-full aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
          preview ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-300'
        }`}>
        {preview ? (
          <img src={preview} className="w-full h-full object-cover rounded-md" />
        ) : (
          <div className="text-center">
            <span className="material-symbols-outlined text-2xl text-slate-300">add_photo_alternate</span>
            <p className="text-[10px] text-slate-400 mt-1">Photo {index}</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" onChange={handleFile} accept="image/*"
        className="hidden" />
      {preview && (
        <button type="button" onClick={() => { setPreview(null); onChange(index, null); }}
          className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-rose-600 transition-colors">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  );
}

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
  const [parts,     setParts]     = useState([]);
  const [machines,  setMachines]  = useState([]);
  const [customers, setCustomers] = useState([]);
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

  useEffect(() => {
    api.get('/items').then(r => setParts(r.data.data));
    api.get('/machines').then(r => setMachines(r.data.data));
    api.get('/parties').then(r => setCustomers(r.data.data || [])).catch(() => {});
    if (isEdit) {
      api.get(`/jobcards/${id}`).then(r => {
        const d = r.data.data;
        setCardData(d);
        setForm({
          partId:       d.partId       || '',
          dieNo:        d.dieNo        || '',
          yourNo:       d.yourNo       || '',
          heatNo:       d.heatNo       || '',
          dieMaterial:  d.dieMaterial  || '',
          customerId:   d.customerId   || '',
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
      });
    }
  }, [id]);

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

  const selectedPartLabel = parts.find(p => String(p.id) === String(form.partId))
    ? `${parts.find(p => String(p.id) === String(form.partId)).partNo} – ${parts.find(p => String(p.id) === String(form.partId)).description}`
    : '';

  const openPartDropdown = () => {
    setPartOpen(true); setPartQuery(''); setShowAddForm(false);
    setTimeout(() => partInputRef.current?.focus(), 0);
  };

  const selectPart = (part) => {
    setForm(p => ({ ...p, partId: String(part.id) }));
    setPartOpen(false); setPartQuery(''); setShowAddForm(false);
  };

  const clearPart = (e) => {
    e.stopPropagation();
    setForm(p => ({ ...p, partId: '' }));
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
      setParts(prev => [...prev, created].sort((a, b) => a.partNo.localeCompare(b.partNo)));
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
      const fd = new FormData();
      Object.keys(form).forEach(k => fd.append(k, form[k]));
      for (let i = 1; i <= 5; i++) { if (images[i] instanceof File) fd.append(`image${i}`, images[i]); }
      if (isEdit) {
        await api.put(`/jobcards/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Job card updated.');
      } else {
        const r = await api.post('/jobcards', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(`Job card ${r.data.data.jobCardNo} created!`);
        navigate('/jobcards');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving job card.');
    } finally {
      setLoading(false);
    }
  };

  const F = ({ label, children, className = '' }) => (
    <div className={className}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );

  const STATUS_OPTS = ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION', 'COMPLETED', 'ON_HOLD'];
  const STATUS_COLOR = {
    CREATED: 'bg-slate-100 text-slate-600', IN_PROGRESS: 'bg-blue-100 text-blue-700',
    SENT_FOR_JOBWORK: 'bg-amber-100 text-amber-700', INSPECTION: 'bg-violet-100 text-violet-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700', ON_HOLD: 'bg-rose-100 text-rose-700',
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
      customerAddressSnapshot: selectedCustomer.address || '',
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

  return (
    <div className="max-w-2xl animate-slide-up">
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
          <span className={`ml-auto badge ${STATUS_COLOR[cardData.status] || 'bg-slate-100 text-slate-600'}`}>
            {cardData.status?.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Part + Customer */}
        <div className="card p-5 space-y-4">
          <p className="section-title border-b border-slate-100 pb-2">Company & Customer Details</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Customer Name">
              <input value={form.customerNameSnapshot} onChange={e => setForm(p => ({ ...p, customerNameSnapshot: e.target.value }))} className="form-input" />
            </F>
            <F label="Contact Email">
              <input value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} className="form-input" />
            </F>
            <F label="Customer Address" className="col-span-2">
              <textarea value={form.customerAddressSnapshot} onChange={e => setForm(p => ({ ...p, customerAddressSnapshot: e.target.value }))} rows={2} className="form-input resize-none" />
            </F>
            <F label="Factory Name">
              <input value={form.factoryName} onChange={e => setForm(p => ({ ...p, factoryName: e.target.value }))} className="form-input" />
            </F>
            <F label="Factory Address">
              <input value={form.factoryAddress} onChange={e => setForm(p => ({ ...p, factoryAddress: e.target.value }))} className="form-input" />
            </F>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <p className="section-title border-b border-slate-100 pb-2">Job Card Info</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Customer's</label>
              <div ref={partWrapRef} className="relative">

                {/* Trigger */}
                {!partOpen ? (
                  <button type="button" onClick={openPartDropdown}
                    className={`form-input w-full text-left flex items-center justify-between gap-2 ${!form.partId ? 'text-slate-400' : 'text-slate-800'}`}>
                    <span className="truncate text-sm">{form.partId ? selectedPartLabel : '— Select or Add Part —'}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {form.partId && <span onClick={clearPart} className="material-symbols-outlined text-[16px] text-slate-300 hover:text-rose-400 transition-colors">close</span>}
                      <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                    </div>
                  </button>
                ) : (
                  <div className="form-input flex items-center gap-2 p-0 overflow-hidden">
                    <span className="material-symbols-outlined text-slate-400 text-[16px] ml-3 flex-shrink-0">search</span>
                    <input ref={partInputRef} value={partQuery} onChange={e => { setPartQuery(e.target.value); setShowAddForm(false); }}
                      placeholder="Search or type new part name..."
                      className="flex-1 py-2 pr-3 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
                      onKeyDown={e => {
                        if (e.key === 'Escape') { setPartOpen(false); setPartQuery(''); }
                        if (e.key === 'Enter' && filteredParts.length === 1) { e.preventDefault(); selectPart(filteredParts[0]); }
                      }} />
                  </div>
                )}

                {/* Hidden required input for form validation */}
                <input tabIndex={-1} required value={form.partId || ''} onChange={() => {}}
                  className="absolute inset-0 opacity-0 pointer-events-none w-full" />

                {/* Dropdown */}
                {partOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      {filteredParts.length === 0 && !showAddForm ? (
                        <div className="px-4 py-3 text-center">
                          <p className="text-xs text-slate-400 mb-2">No part found{partQuery ? ` for "${partQuery}"` : ''}.</p>
                          <button type="button" onClick={initQuickAdd}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Add "{partQuery || 'new part'}"
                          </button>
                        </div>
                      ) : filteredParts.map(p => (
                        <button key={p.id} type="button" onClick={() => selectPart(p)}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2 ${String(p.id) === String(form.partId) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'}`}>
                          {String(p.id) === String(form.partId) && <span className="material-symbols-outlined text-[14px] text-indigo-500 flex-shrink-0">check</span>}
                          <span className={String(p.id) === String(form.partId) ? '' : 'ml-[22px]'}>{p.partNo} – {p.description}</span>
                        </button>
                      ))}
                      {/* Always show "Add new" at bottom when query has text and results exist */}
                      {filteredParts.length > 0 && partQuery.trim() && !showAddForm && (
                        <button type="button" onClick={initQuickAdd}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2 border-t border-slate-100">
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          Add "{partQuery}" as new part
                        </button>
                      )}
                    </div>

                    {/* Quick-add inline form */}
                    {showAddForm && (
                      <form onSubmit={handleQuickAddPart} className="border-t border-slate-100 p-3 space-y-2 bg-indigo-50/40">
                        <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Quick Add New Part</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Part No</label>
                            <input value={newPart.partNo} onChange={e => setNewPart(p => ({ ...p, partNo: e.target.value }))}
                              placeholder="e.g. P-001"
                              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-full bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Description *</label>
                            <input required value={newPart.description} onChange={e => setNewPart(p => ({ ...p, description: e.target.value }))}
                              placeholder="Part description"
                              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-full bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={savingPart}
                            className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                            <span className="material-symbols-outlined text-sm">{savingPart ? 'progress_activity' : 'save'}</span>
                            {savingPart ? 'Adding...' : 'Add & Select'}
                          </button>
                          <button type="button" onClick={() => setShowAddForm(false)}
                            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
            <F label="Job Card No.">
              <input value={cardData?.jobCardNo || 'Auto-generated'} disabled className="form-input bg-slate-50" />
            </F>
            <F label="Certificate No.">
              <input value={form.certificateNo} onChange={e => setForm(p => ({ ...p, certificateNo: e.target.value }))} className="form-input" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Your PO No.">
              <input value={form.yourNo} onChange={e => setForm(p => ({...p, yourNo: e.target.value}))} className="form-input" placeholder="Your PO No." />
            </F>
            <F label="Your DC No.">
              <input value={form.dieNo} onChange={e => setForm(p => ({...p, dieNo: e.target.value}))} className="form-input" placeholder="Your DC No." />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="DISPATCH MODE:-">
              <input value={form.dispatchMode} onChange={e => setForm(p => ({...p, dispatchMode: e.target.value}))} className="form-input" placeholder="DISPATCH MODE:-" />
            </F>
            <F label="Material">
              <input value={form.dieMaterial} onChange={e => setForm(p => ({...p, dieMaterial: e.target.value}))} className="form-input" placeholder="D2" />
            </F>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.dispatchByOurVehicle} onChange={e => setForm(p => ({ ...p, dispatchByOurVehicle: e.target.checked }))} /> By Our Vehicle</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.dispatchByCourier} onChange={e => setForm(p => ({ ...p, dispatchByCourier: e.target.checked }))} /> By Courier</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.collectedByCustomer} onChange={e => setForm(p => ({ ...p, collectedByCustomer: e.target.checked }))} /> Collected by Customer</label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Heat Treatment Specification">
              <select value={form.operationMode} onChange={e => setForm(p => ({...p, operationMode: e.target.value}))} className="form-input">
                <option value="NORMAL">NORMAL</option>
                <option value="REWORK">REWORK</option>
                <option value="HARDEN AND TEMPER">HARDEN AND TEMPER</option>
                <option value="STRESS RELIEVING">STRESS RELIEVING</option>
                <option value="ANNEALING">ANNEALING</option>
              </select>
            </F>
            <F label="Special Instruction">
              <input value={form.remarks} onChange={e => setForm(p => ({...p, remarks: e.target.value}))} className="form-input" placeholder="Special Instruction" />
            </F>
          </div>
          <div className="text-xs text-slate-500">Suggested treatment: D2 - HARDEN AND TEMPER - 61-63 HRC</div>
        </div>

        {/* Issue Details + Special Instructions */}
        <div className="card p-5 space-y-4">
          <p className="section-title border-b border-slate-100 pb-2">Issue Details & Special Instructions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Issue Date">
              <input type="date" value={form.issueDate} onChange={e => setForm(p => ({...p, issueDate: e.target.value}))} className="form-input" />
            </F>
            <F label="Issue By">
              <input value={form.issueBy} onChange={e => setForm(p => ({...p, issueBy: e.target.value}))} className="form-input" placeholder="Issue By" />
            </F>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Special Instructions (What to Include)</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={form.specInstrCert} onChange={e => setForm(p => ({...p, specInstrCert: e.target.checked}))}
                  className="w-4 h-4 rounded border-2 border-indigo-300 accent-indigo-600 cursor-pointer" />
                <span className="text-sm text-slate-700 font-medium">☑ CERTIFICATE</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={form.specInstrMPIRep} onChange={e => setForm(p => ({...p, specInstrMPIRep: e.target.checked}))}
                  className="w-4 h-4 rounded border-2 border-indigo-300 accent-indigo-600 cursor-pointer" />
                <span className="text-sm text-slate-700 font-medium">☐ MPI REPORT</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={form.specInstrGraph} onChange={e => setForm(p => ({...p, specInstrGraph: e.target.checked}))}
                  className="w-4 h-4 rounded border-2 border-indigo-300 accent-indigo-600 cursor-pointer" />
                <span className="text-sm text-slate-700 font-medium">☐ PROCESS GRAPH</span>
              </label>
            </div>
          </div>
        </div>

        {/* Production Details */}
        <div className="card p-5 space-y-4">
          <p className="section-title border-b border-slate-100 pb-2">Production Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <F label="Quantity *">
              <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({...p, quantity: e.target.value}))} required className="form-input" placeholder="1" />
            </F>
            <F label="Total Weight (kg)">
              <input type="number" step="0.001" value={form.totalWeight} onChange={e => setForm(p => ({...p, totalWeight: e.target.value}))} className="form-input" placeholder="0.000" />
            </F>
            <F label="HRC Range">
              <input value={form.hrcRange} onChange={e => setForm(p => ({ ...p, hrcRange: e.target.value }))} className="form-input" placeholder="54-56 HRC" />
            </F>
            <F label="Operation No">
              <input value={form.operationNo} onChange={e => setForm(p => ({...p, operationNo: e.target.value}))} className="form-input" placeholder="OP-01" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Drawing No">
              <input value={form.drawingNo} onChange={e => setForm(p => ({...p, drawingNo: e.target.value}))} className="form-input" placeholder="SDT-2309-V4" />
            </F>
            <F label="Machine">
              <SearchSelect
                value={form.machineId}
                onChange={v => setForm(p => ({...p, machineId: v}))}
                options={machines.map(m => ({ value: m.id, label: `${m.code} – ${m.name}` }))}
                placeholder="— Select Machine —"
              />
            </F>
          </div>
          <F label="Issue By">
            <input value={form.operatorName} onChange={e => setForm(p => ({...p, operatorName: e.target.value}))} className="form-input" placeholder="Issue By" />
          </F>
        </div>

        {/* Dates */}
        <div className="card p-5 space-y-4">
          <p className="section-title border-b border-slate-100 pb-2">Dates</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Issue Date">
              <input type="date" value={form.receivedDate} onChange={e => setForm(p => ({...p, receivedDate: e.target.value}))} className="form-input" />
            </F>
            <F label="Due Date">
              <input type="date" value={form.dueDate} onChange={e => setForm(p => ({...p, dueDate: e.target.value}))} className="form-input" />
            </F>
            <F label="Start Date">
              <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} className="form-input" />
            </F>
            <F label="End Date">
              <input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} className="form-input" />
            </F>
          </div>
        </div>

        {/* Status + Remarks */}
        <div className="card p-5 space-y-4">
          {isEdit && (
            <>
              <F label="Status">
                <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className="form-input">
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </F>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={moveToNextStatus}
                  className="btn-secondary text-xs px-3 py-1.5">
                  Move to {STATUS_TRANSITIONS[form.status]?.replace(/_/g, ' ') || '…'}
                </button>
                <button type="button" onClick={() => setForm(p => ({...p, status: 'ON_HOLD'}))}
                  className="btn-danger text-xs px-3 py-1.5">
                  Put on Hold
                </button>
              </div>
            </>
          )}
          <F label="Remarks">
            <textarea value={form.remarks} onChange={e => setForm(p => ({...p, remarks: e.target.value}))} rows={3} className="form-input resize-none" placeholder="Additional notes..." />
          </F>
          <F label="Special Requirements">
            <textarea value={form.specialRequirements} onChange={e => setForm(p => ({ ...p, specialRequirements: e.target.value }))} rows={2} className="form-input resize-none" />
          </F>
          <F label="Precautions During Production & Final Inspection">
            <textarea value={form.precautions} onChange={e => setForm(p => ({ ...p, precautions: e.target.value }))} rows={2} className="form-input resize-none" />
          </F>
        </div>

        {/* Document Control */}
        <div className="card p-5 space-y-4">
          <p className="section-title border-b border-slate-100 pb-2">Document Control</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <F label="Document No">
              <input value={form.documentNo} onChange={e => setForm(p => ({ ...p, documentNo: e.target.value }))} className="form-input" />
            </F>
            <F label="Revision No">
              <input value={form.revisionNo} onChange={e => setForm(p => ({ ...p, revisionNo: e.target.value }))} className="form-input" />
            </F>
            <F label="Revision Date">
              <input type="date" value={form.revisionDate} onChange={e => setForm(p => ({ ...p, revisionDate: e.target.value }))} className="form-input" />
            </F>
            <F label="Page No">
              <input value={form.pageNo} onChange={e => setForm(p => ({ ...p, pageNo: e.target.value }))} className="form-input" />
            </F>
          </div>
        </div>

        {/* Part Photos */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500 text-[15px]">add_photo_alternate</span>
            </div>
            <p className="section-title">Part Photos</p>
            <span className="text-[10px] text-slate-400">optional – up to 5 images</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => <ImageSlot key={i} index={i} onChange={handleImageChange} />)}
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Upload photos of the part before, during, or after machining for documentation.</p>
        </div>

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

      {/* Linked Info */}
      {isEdit && cardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Inspection */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-violet-500 text-[15px]">fact_check</span>
              </div>
              <h3 className="section-title">Inspection</h3>
            </div>
            {cardData.inspection ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Status</span>
                  <span className={`badge ${
                    cardData.inspection.inspectionStatus === 'PASS'  ? 'bg-emerald-100 text-emerald-700' :
                    cardData.inspection.inspectionStatus === 'FAIL'  ? 'bg-rose-100 text-rose-700' :
                    cardData.inspection.inspectionStatus === 'CONDITIONAL' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{cardData.inspection.inspectionStatus}</span>
                </div>
                {cardData.inspection.achievedHardness && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Achieved</span>
                    <span className="text-xs font-bold text-slate-700">{cardData.inspection.achievedHardness} {cardData.inspection.hardnessUnit}</span>
                  </div>
                )}
                <Link to={`/jobcards/${id}/inspection`}
                  className="block text-center text-xs text-indigo-600 font-semibold hover:underline mt-2 border border-indigo-100 rounded-xl py-1.5 bg-indigo-50/50 hover:bg-indigo-100/50 transition-colors">
                  Edit Inspection →
                </Link>
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-slate-400 mb-3">No inspection done yet.</p>
                <Link to={`/jobcards/${id}/inspection`}
                  className="btn-primary text-xs px-4 py-2">
                  <span className="material-symbols-outlined text-sm">add</span> Start Inspection
                </Link>
              </div>
            )}
          </div>

          {/* Challans */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-500 text-[15px]">engineering</span>
                </div>
                <h3 className="section-title">Challans</h3>
              </div>
              <Link to="/jobwork/new" className="text-[10px] text-indigo-600 font-bold hover:underline">+ New</Link>
            </div>
            {cardData.challans?.length ? (
              <div className="space-y-2">
                {cardData.challans.map(ch => (
                  <div key={ch.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-slate-700 font-mono">{ch.challanNo}</p>
                      <p className="text-[10px] text-slate-400">{new Date(ch.challanDate).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-[10px] ${
                        ch.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        ch.status === 'RECEIVED'  ? 'bg-blue-100 text-blue-700' :
                        ch.status === 'SENT'      ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{ch.status}</span>
                      <Link to={`/jobwork/${ch.id}`} className="text-[10px] text-indigo-600 font-bold hover:underline">View</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No challans linked yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
