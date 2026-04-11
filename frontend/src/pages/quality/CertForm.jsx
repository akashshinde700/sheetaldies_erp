import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toNum } from '../../utils/normalize';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CB = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer group py-0.5">
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'
      }`}>
      {checked && <span className="material-symbols-outlined text-white text-[11px] leading-none">check</span>}
    </button>
    <span className="text-xs text-slate-700 font-medium">{label}</span>
  </label>
);

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
      <button type="button" onClick={() => !preview && inputRef.current.click()}
        className={`w-full aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
          preview ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
        }`}>
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover rounded-xl" />
          : <div className="text-center">
              <span className="material-symbols-outlined text-slate-300 text-2xl block">add_photo_alternate</span>
              <span className="text-[10px] text-slate-400 mt-1 block">Photo {index}</span>
            </div>
        }
      </button>
      {preview && (
        <button type="button" onClick={() => { setPreview(null); onChange(index, null); inputRef.current.value = ''; }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow hover:bg-rose-600">✕</button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

export default function CertForm() {
  const navigate = useNavigate();
  const [parties,   setParties]   = useState([]);
  const [jobCards,  setJobCards]  = useState([]);
  const [processes, setProcesses] = useState([]);
  const [images,    setImages]    = useState({});
  const [loading,   setLoading]   = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    jobCardId: '', yourPoNo: '', yourPoDate: '', yourRefNo: '',
    issueNo: '', issueDate: new Date().toISOString().split('T')[0], checkedBy: '',
    customerId: '', issuedByPartyId: '',
    dieMaterial: '', operatorMode: '', 
    specInstrCertificate: true, specInstrMpiReport: false, specInstrProcessGraph: false,
    deliveryDate: '', specialRequirements: '', precautions: '',
    catNormal: false, catCrackRisk: false, catDistortionRisk: false,
    catCriticalFinishing: false, catDentDamage: false, catCavity: false, catOthers: false,
    procStressRelieving: false, procHardening: false, procTempering: false, procAnnealing: false,
    procBrazing: false, procPlasmaNitriding: false, procSubZero: false, procSoakClean: false,
    hardnessMin: '', hardnessMax: '', hardnessUnit: 'HRC',
    distortionBefore: Array(8).fill(''), distortionAfter: Array(8).fill(''),
    packedQty: '', packedBy: '', approvedBy: '',
    issuedTo: '', heatNo: '', dispatchMode: '', dispatchChallanNo: '', dispatchChallanDate: '', dispatchedThrough: '',
  });

  const [certItems, setCertItems] = useState([
    { description: '', quantity: '1', weightPerPc: '', totalWeight: '', samplingPlan: '', remarks: '' },
  ]);

  const emptyHeatRow = () => ({ equipment: '', processName: '', cycleNo: '', startTime: '', endTime: '', uom: '', result: '', signedBy: '' });
  const [heatRows, setHeatRows] = useState([]);

  const [inspResults, setInspResults] = useState([
    { inspectionType: 'Visual',    parameter: 'Surface Finish', requiredValue: 'OK', achievedValue: '', result: 'OK', finalInspection: '' },
    { inspectionType: 'Hardness',  parameter: 'Core Hardness',  requiredValue: '',   achievedValue: '', result: 'OK', finalInspection: '' },
    { inspectionType: 'Distortion',parameter: 'Dimensional',    requiredValue: '',   achievedValue: '', result: 'OK', finalInspection: '' },
  ]);

  const [tempRows, setTempRows] = useState([{ time: '', temp: '' }]);

  useEffect(() => {
    api.get('/parties').then(r => setParties(r.data.data));
    api.get('/jobcards?limit=100').then(r => setJobCards(r.data.data));
    api.get('/processes').then(r => setProcesses(r.data.data?.filter(p => p.isActive) || []));
  }, []);

  const loadTempCycleFromRunsheet = async (jobCardId) => {
    if (!jobCardId) return false;
    try {
      const r = await api.get('/quality/certificates/suggested-temp-cycle', { params: { jobCardId } });
      const cycle = r.data.data?.tempCycleData;
      if (cycle?.length) {
        setTempRows(cycle.map((p) => ({ time: String(p.time ?? ''), temp: String(p.temp ?? '') })));
        const rn = r.data.data.runsheet?.runsheetNumber;
        toast.success(rn ? `Curve loaded from VHT Run Sheet ${rn}` : 'Curve loaded from VHT Run Sheet', { duration: 3500 });
        return true;
      }
    } catch {
      /* fall back below */
    }
    return false;
  };

  // Auto-fill certificate when job card is selected: prefer VHT Run Sheet graph (execution), else template (Excel “Graphs” style)
  useEffect(() => {
    if (!form.jobCardId || !jobCards.length) return;
    const selectedJobCard = jobCards.find((jc) => String(jc.id) === form.jobCardId);
    if (!selectedJobCard) return;

    const hardnessMin =
      selectedJobCard.hardnessMin || (selectedJobCard.hrcRange && selectedJobCard.hrcRange.split(/[–-]/)[0]?.trim()) || '61';
    const hardnessMax =
      selectedJobCard.hardnessMax || (selectedJobCard.hrcRange && selectedJobCard.hrcRange.split(/[–-]/)[1]?.trim()) || '63';
    const heatTreatment =
      selectedJobCard.treatmentType || selectedJobCard.operationMode || 'HARDEN AND TEMPER';

    set('dieMaterial', selectedJobCard.dieMaterial || 'D2');
    set('operatorMode', heatTreatment);
    set('hardnessMin', hardnessMin);
    set('hardnessMax', hardnessMax);

    let cancelled = false;
    (async () => {
      const ok = await loadTempCycleFromRunsheet(form.jobCardId);
      if (cancelled) return;
      if (!ok) updateTemperatureCycle(heatTreatment);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.jobCardId, jobCards]);

  // Function to update temperature cycle based on heat treatment type
  const updateTemperatureCycle = (treatmentType) => {
    let tempCycle = [];
    
    if (treatmentType === 'HARDEN AND TEMPER' || treatmentType === 'HDS') {
      // HDS CYCLE: 50→550(10min)→750(20min)→950(20min)→1030(30min)→750→550→50
      tempCycle = [
        { time: '0', temp: '50' },
        { time: '10', temp: '550' },
        { time: '30', temp: '750' },
        { time: '50', temp: '950' },
        { time: '80', temp: '1030' },
        { time: '110', temp: '1030' },
        { time: '130', temp: '750' },
        { time: '150', temp: '550' },
        { time: '170', temp: '50' },
      ];
    } else if (treatmentType === 'D2') {
      // D2 CYCLE: 50→550(10min)→750(20min)→950(20min)→1040(30min)→500→500(120min)→50
      tempCycle = [
        { time: '0', temp: '50' },
        { time: '10', temp: '550' },
        { time: '30', temp: '750' },
        { time: '50', temp: '950' },
        { time: '80', temp: '1040' },
        { time: '110', temp: '500' },
        { time: '130', temp: '500' },
        { time: '250', temp: '50' },
      ];
    } else if (treatmentType === 'HSS') {
      // HSS CYCLE: 50→650(10min)→850(15min)→1050(15min)→1195(30min)→540(120min)→540(120min)→50
      tempCycle = [
        { time: '0', temp: '50' },
        { time: '10', temp: '650' },
        { time: '25', temp: '850' },
        { time: '40', temp: '1050' },
        { time: '70', temp: '1195' },
        { time: '90', temp: '540' },
        { time: '210', temp: '540' },
        { time: '330', temp: '50' },
      ];
    } else if (treatmentType === 'D3') {
      // D3 CYCLE: 50→500(10min)→750(20min)→850(20min)→990(90min)→200(120min)→200→50
      tempCycle = [
        { time: '0', temp: '50' },
        { time: '10', temp: '500' },
        { time: '30', temp: '750' },
        { time: '50', temp: '850' },
        { time: '140', temp: '990' },
        { time: '160', temp: '200' },
        { time: '280', temp: '200' },
        { time: '330', temp: '50' },
      ];
    } else if (treatmentType === 'STRESS RELIEVING') {
      // STRESS RELIEVING CYCLE: 50→650(50min)→650(120min)→50(50min)
      tempCycle = [
        { time: '0', temp: '50' },
        { time: '50', temp: '650' },
        { time: '170', temp: '650' },
        { time: '220', temp: '50' },
      ];
    } else if (treatmentType === 'ANNEALING') {
      // ANNEALING CYCLE: 50→590(50min)→590(150min)→50
      tempCycle = [
        { time: '0', temp: '50' },
        { time: '50', temp: '590' },
        { time: '200', temp: '590' },
        { time: '250', temp: '50' },
      ];
    } else {
      // Default HDS cycle
      tempCycle = [
        { time: '0', temp: '50' },
        { time: '10', temp: '550' },
        { time: '30', temp: '750' },
        { time: '50', temp: '950' },
        { time: '80', temp: '1030' },
        { time: '110', temp: '1030' },
        { time: '130', temp: '750' },
        { time: '150', temp: '550' },
        { time: '170', temp: '50' },
      ];
    }
    
    setTempRows(tempCycle);
  };

  const handleImageChange = (i, file) => setImages(p => ({ ...p, [i]: file }));
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const updateCertItem = (i, k, v) => setCertItems(p => p.map((it, j) => j === i ? { ...it, [k]: v } : it));
  const updateTempRow = (i, k, v) => setTempRows(p => p.map((it, j) => j === i ? { ...it, [k]: v } : it));
  const updateHeatRow = (i, k, v) => setHeatRows(p => p.map((it, j) => j === i ? { ...it, [k]: v } : it));
  const updateInspResult = (i, k, v) => setInspResults(p => p.map((it, j) => j === i ? { ...it, [k]: v } : it));

  const fillFromImage = () => {
    const jobCard = jobCards[0] || {};
    const customer = parties.find(x => x.partyType === 'CUSTOMER' || x.partyType === 'BOTH') || {};
    const vendor = parties.find(x => x.partyType === 'VENDOR' || x.partyType === 'BOTH') || {};
    setForm(p => ({
      ...p,
      jobCardId: jobCard.id ? String(jobCard.id) : '',
      yourPoNo: jobCard.jobCardNo ? `PO-${jobCard.jobCardNo}` : '',
      yourPoDate: today,
      yourRefNo: jobCard.jobCardNo ? `REF-${jobCard.jobCardNo}` : '',
      issueNo: jobCard.jobCardNo ? `IC-${jobCard.jobCardNo}` : '',
      issueDate: today,
      checkedBy: p.checkedBy || 'Inspector 1',
      customerId: customer.id ? String(customer.id) : '',
      issuedByPartyId: vendor.id ? String(vendor.id) : '',
      dieMaterial: jobCard.dieMaterial || '',
      operatorMode: 'HDS',
      specialInstruction: 'Standard treatment: HDS/D2/HSS - Hardness per specification',
      catNormal: true,
      procStressRelieving: !!jobCard.processType,
      procHardening: !!jobCard.processType,
      procTempering: !!jobCard.processType,
      hardnessMin: jobCard.hardnessMin || '52',
      hardnessMax: jobCard.hardnessMax || '54',
      hardnessUnit: 'HRC',
      packedQty: jobCard.quantity ? String(jobCard.quantity) : '0',
      packedBy: vendor.name || '',
      approvedBy: 'QA Dept',
      issuedTo: customer.name || '',
      heatNo: jobCard.heatNo || '',
      dispatchMode: 'Courier',
      dispatchChallanNo: '',
      dispatchChallanDate: today,
      dispatchedThrough: 'Transporter',
    }));
    const baseItem = certItems[0] || {};
    setCertItems([{ ...baseItem,
      description: jobCard.part?.description || 'Part-1',
      quantity: jobCard.quantity ? String(jobCard.quantity) : '1',
      weightPerPc: '0.8',
      totalWeight: jobCard.totalWeight ? String(jobCard.totalWeight) : '0.8',
      samplingPlan: 'AQL 1.5',
      remarks: 'OK',
    }]);
    setInspResults([{ inspectionType: 'Visual', parameter: 'Surface Finish', requiredValue: 'OK', achievedValue: 'OK', result: 'OK', finalInspection: p.checkedBy || 'Inspector 1'}]);
    
    // Excel Graphs - HDS CYCLE: Temperature progression
    setTempRows([
      { time: '10:00', temp: '50' },
      { time: '10:15', temp: '550' },
      { time: '10:30', temp: '750' },
      { time: '10:45', temp: '950' },
      { time: '11:00', temp: '1030' },
      { time: '11:15', temp: '1030' },
      { time: '11:30', temp: '750' },
      { time: '11:45', temp: '550' },
      { time: '12:00', temp: '50' },
    ]);
    
    setHeatRows([{ equipment: 'Furnace-1', processName: 'Hardening', cycleNo: '1', startTime: `${today}T08:00`, endTime: `${today}T12:00`, uom: 'Hrs', result: 'OK', signedBy: p.checkedBy || 'Inspector 1' }]);
    toast.success('Certificate values loaded from DB-backed sample.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jobCardId) { toast.error('Job Card is required.'); return; }
    if (!form.customerId) { toast.error('Customer is required.'); return; }
    
    // Validate certificate items
    const validItems = certItems.filter(it => it.description?.trim() && toNum(it.quantity, 0) > 0);
    if (!validItems.length) {
      toast.error('At least one item with description and quantity is required.'); 
      return;
    }

    // Validate heat rows - must have complete data if provided
    const validHeatRows = heatRows.filter(r => {
      if (!r.equipment && !r.processName) return false; // Skip empty rows
      // If partially filled, enforce complete data
      if (r.equipment || r.processName) {
        if (!r.startTime || !r.endTime) {
          toast.error(`Heat process row: "${r.equipment || r.processName}" is missing start or end time.`);
          return false;
        }
      }
      return true;
    });

    // Validate distortion arrays have at least some data
    const beforeHasData = form.distortionBefore.some((v) => v !== '' && toNum(v, 0) !== 0);
    const afterHasData = form.distortionAfter.some((v) => v !== '' && toNum(v, 0) !== 0);
    if (!beforeHasData || !afterHasData) {
      toast.error('Enter distortion measurements for at least one point before and after heat treatment.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'distortionBefore' || k === 'distortionAfter') {
          fd.append(k, JSON.stringify(v.map((val, i) => ({ pt: i + 1, val: toNum(val, 0) }))));
        } else {
          fd.append(k, v);
        }
      });
      fd.append('items', JSON.stringify(validItems));
      fd.append('inspectionResults', JSON.stringify(inspResults));
      const validTempRows = tempRows.filter(r => r.time !== '' && r.temp !== '');
      if (validTempRows.length) fd.append('tempCycleData', JSON.stringify(validTempRows));
      if (validHeatRows.length) fd.append('certHeatProcesses', JSON.stringify(validHeatRows));
      for (let i = 1; i <= 5; i++) { if (images[i] instanceof File) fd.append(`image${i}`, images[i]); }
      const r = await api.post('/quality/certificates', fd);
      toast.success(`Certificate ${r.data.data.certNo} created!`);
      navigate('/quality/certificates');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating certificate.');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-stack w-full animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/quality/certificates"
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">New Test Certificate</h2>
          <p className="text-xs text-slate-400 mt-0.5">Sheetal Vacuum Heat Pvt. Ltd.</p>
          <p className="text-xs text-slate-500 mt-1">Flow ref: 4 (Test Certificate). Related images: <span className="font-mono">all\\4.1.jpeg, all\\4.2.jpeg, all\\4.3.jpeg, all\\4.4.jpeg</span></p>
        </div>
        <button type="button" onClick={fillFromImage} className="btn-outline ml-auto mr-2">
          <span className="material-symbols-outlined text-sm">file_upload</span> Load sample data
        </button>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <span className="material-symbols-outlined text-[12px]">verified</span> Quality Certificate
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Header Info */}
        <div className="card p-5 space-y-4">
          <p className="section-title border-b border-slate-100 pb-2">Certificate Details</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="Customer's">
              <select value={form.customerId} onChange={e => set('customerId', e.target.value)} required className="form-input">
                <option value="">— Select —</option>
                {parties.filter(p => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </F>
            <F label="Certificate No.">
              <input value={form.issueNo} onChange={e => set('issueNo', e.target.value)} className="form-input" placeholder="e.g. IC-001" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Job Card No.">
              <select value={form.jobCardId} onChange={e => set('jobCardId', e.target.value)} className="form-input">
                <option value="">— Select Job Card —</option>
                {jobCards.map(jc => (
                  <option key={jc.id} value={jc.id}>{jc.jobCardNo} — {jc.part?.partNo || jc.part?.description}</option>
                ))}
              </select>
            </F>
            <F label="Your PO No.">
              <input value={form.yourPoNo} onChange={e => set('yourPoNo', e.target.value)} className="form-input" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Your DC No.">
              <input value={form.yourRefNo} onChange={e => set('yourRefNo', e.target.value)} className="form-input" />
            </F>
            <F label="Issue Date">
              <input type="date" value={form.issueDate} onChange={e => set('issueDate', e.target.value)} className="form-input" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Issue By">
              <input value={form.checkedBy} onChange={e => set('checkedBy', e.target.value)} className="form-input" placeholder="Inspector name" />
            </F>
            <F label="DISPATCH MODE:-">
              <input value={form.dispatchMode} onChange={e => set('dispatchMode', e.target.value)} className="form-input" placeholder="DISPATCH MODE:-" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Material">
              <input value={form.dieMaterial} onChange={e => set('dieMaterial', e.target.value)} className="form-input" placeholder="D2" />
            </F>
            <F label="Heat Treatment Specification">
              <select value={form.operatorMode} onChange={e => {
                set('operatorMode', e.target.value);
                updateTemperatureCycle(e.target.value);
              }} className="form-input">
                <option value="">— Select Heat Treatment —</option>
                <option value="HDS">HDS Cycle</option>
                <option value="D2">D2 Cycle</option>
                <option value="HSS">HSS Cycle</option>
                <option value="D3">D3 Cycle</option>
                <option value="STRESS RELIEVING">Stress Relieving</option>
                <option value="ANNEALING">Annealing</option>
              </select>
            </F>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <F label="Special Instructions:">
              <div className="space-y-2">
                <CB label="CERTIFICATE" checked={form.specInstrCertificate} onChange={v => set('specInstrCertificate', v)} />
                <CB label="MPI REPORT" checked={form.specInstrMpiReport} onChange={v => set('specInstrMpiReport', v)} />
                <CB label="PROCESS GRAPH" checked={form.specInstrProcessGraph} onChange={v => set('specInstrProcessGraph', v)} />
              </div>
            </F>
            <F label="Delivery Date">
              <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} className="form-input" />
            </F>
            <F label="Special Requirements">
              <textarea value={form.specialRequirements} onChange={e => set('specialRequirements', e.target.value)} className="form-input text-xs" rows="3" placeholder="Any special instructions..." />
            </F>
          </div>
          <div>
            <F label="Precautions During Production & Final Inspection">
              <textarea value={form.precautions} onChange={e => set('precautions', e.target.value)} className="form-input text-xs" rows="3" placeholder="Safety precautions, handling instructions, etc." />
            </F>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <F label="Special Instruction">
              <textarea value={form.specialInstruction} onChange={e => set('specialInstruction', e.target.value)} rows={2} className="form-input resize-none" placeholder="Special Instruction"></textarea>
            </F>
          </div>
          <p className="text-xs text-slate-500">Suggested treatment: D2 - HARDEN AND TEMPER - 61-63 HRC</p>

          {/* Hardness */}
          <div className="border-t border-slate-100 pt-4">
            <p className="section-title mb-3">Hardness Specification</p>
            <div className="flex gap-4 items-end">
              <F label="Min" className="w-28">
                <input type="number" value={form.hardnessMin} onChange={e => set('hardnessMin', e.target.value)} className="form-input" placeholder="48" />
              </F>
              <F label="Max" className="w-28">
                <input type="number" value={form.hardnessMax} onChange={e => set('hardnessMax', e.target.value)} className="form-input" placeholder="52" />
              </F>
              <F label="Unit" className="w-24">
                <select value={form.hardnessUnit} onChange={e => set('hardnessUnit', e.target.value)} className="form-input">
                  <option>HRC</option><option>HRB</option><option>HV</option><option>HB</option>
                </select>
              </F>
            </div>
          </div>
        </div>

        {/* Categorization & Process */}
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-4">Categorization & Process</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Categorization</p>
              <div className="space-y-1.5">
                <CB label="Normal"              checked={form.catNormal}            onChange={v => set('catNormal', v)} />
                <CB label="Crack or Crack Risk" checked={form.catCrackRisk}         onChange={v => set('catCrackRisk', v)} />
                <CB label="Distortion Risk"     checked={form.catDistortionRisk}    onChange={v => set('catDistortionRisk', v)} />
                <CB label="Initial Finishing"   checked={form.catCriticalFinishing} onChange={v => set('catCriticalFinishing', v)} />
                <CB label="Dent / Damage"       checked={form.catDentDamage}        onChange={v => set('catDentDamage', v)} />
                <CB label="Cavity"              checked={form.catCavity}            onChange={v => set('catCavity', v)} />
                <CB label="Others"              checked={form.catOthers}            onChange={v => set('catOthers', v)} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Process</p>
              <div className="space-y-1.5">
                <CB label="Stress Relieving" checked={form.procStressRelieving} onChange={v => set('procStressRelieving', v)} />
                <CB label="Hardening"        checked={form.procHardening}       onChange={v => set('procHardening', v)} />
                <CB label="Tempering"        checked={form.procTempering}       onChange={v => set('procTempering', v)} />
                <CB label="Annealing"        checked={form.procAnnealing}       onChange={v => set('procAnnealing', v)} />
                <CB label="Brazing"          checked={form.procBrazing}         onChange={v => set('procBrazing', v)} />
                <CB label="Plasma Nitriding" checked={form.procPlasmaNitriding} onChange={v => set('procPlasmaNitriding', v)} />
                <CB label="Sub Zero"         checked={form.procSubZero}         onChange={v => set('procSubZero', v)} />
                <CB label="Soak Clean"       checked={form.procSoakClean}       onChange={v => set('procSoakClean', v)} />
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card p-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
            <p className="section-title">Items / Parts</p>
            <button type="button"
              onClick={() => setCertItems(p => [...p, { description: '', quantity: '1', weightPerPc: '', totalWeight: '', remarks: '' }])}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Add Row
            </button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                {['#', 'Part Description', 'Qty', 'Wt/Pc (kg)', 'Total Wt (kg)', 'Sampling Plan', 'Remarks', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80">
              {certItems.map((it, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-1 py-2">
                    <input value={it.description} onChange={e => { const a = [...certItems]; a[i].description = e.target.value; setCertItems(a); }}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Part name" />
                  </td>
                  <td className="px-1 py-2">
                    <input type="number" value={it.quantity}
                      onChange={e => { const a = [...certItems]; a[i].quantity = e.target.value; setCertItems(a); }}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-16 text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                  </td>
                  <td className="px-1 py-2">
                    <input type="number" step="0.001" value={it.weightPerPc}
                      onChange={e => { const a = [...certItems]; a[i].weightPerPc = e.target.value; a[i].totalWeight = (Number(e.target.value || 0) * Number(a[i].quantity || 0)).toFixed(3); setCertItems(a); }}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 text-right focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                  </td>
                  <td className="px-1 py-2">
                    <input type="number" step="0.001" value={it.totalWeight} readOnly
                      className="border border-slate-100 rounded-lg px-2 py-1.5 text-xs w-20 text-right bg-slate-50 text-slate-500" />
                  </td>
                  <td className="px-1 py-2">
                    <input value={it.samplingPlan} onChange={e => { const a = [...certItems]; a[i].samplingPlan = e.target.value; setCertItems(a); }}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="e.g. AQL 1.5" />
                  </td>
                  <td className="px-1 py-2">
                    <input value={it.remarks} onChange={e => { const a = [...certItems]; a[i].remarks = e.target.value; setCertItems(a); }}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                  </td>
                  <td className="px-1 py-2">
                    {certItems.length > 1 && (
                      <button type="button" onClick={() => setCertItems(p => p.filter((_, j) => j !== i))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Distortion Measurements */}
        <div className="card p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-500 text-[14px]">straighten</span>
            </div>
            <p className="section-title">Distortion Measurements (8 Points)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                  <th className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase text-left w-24">Measurement</th>
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <th key={n} className="py-2.5 px-2 text-[10px] font-bold text-slate-400">Pt. {n}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                <tr>
                  <td className="py-2.5 px-3 text-xs font-bold text-slate-700 text-left">Before HT</td>
                  {form.distortionBefore.map((val, i) => (
                    <td key={i} className="py-2 px-1">
                      <input type="number" step="0.001" value={val}
                        onChange={e => { const arr=[...form.distortionBefore]; arr[i]=e.target.value; set('distortionBefore', arr); }}
                        className="w-16 border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-center focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200" placeholder="NA" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-xs font-bold text-emerald-700 text-left">After HT</td>
                  {form.distortionAfter.map((val, i) => (
                    <td key={i} className="py-2 px-1">
                      <input type="number" step="0.001" value={val}
                        onChange={e => { const arr=[...form.distortionAfter]; arr[i]=e.target.value; set('distortionAfter', arr); }}
                        className="w-16 border border-emerald-200 rounded-lg px-1 py-1.5 text-xs text-center bg-emerald-50 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200" />
                    </td>
                  ))}
                </tr>
                <tr className="bg-slate-50/80">
                  <td className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase text-left">Δ Diff</td>
                  {form.distortionBefore.map((before, i) => {
                    const diff = Number(form.distortionAfter[i] || 0) - Number(before || 0);
                    return (
                      <td key={i} className={`py-2 px-1 text-xs font-bold ${
                        Math.abs(diff) > 0.05 ? 'text-rose-500' : diff !== 0 ? 'text-amber-500' : 'text-slate-300'
                      }`}>
                        {before || form.distortionAfter[i] ? (diff >= 0 ? '+' : '') + diff.toFixed(3) : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Heat Treatment Process Log */}
        <div className="card p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-rose-500 text-[14px]">thermostat</span>
              </div>
              <p className="section-title">Heat Treatment Process Log</p>
            </div>
            <button type="button" onClick={() => setHeatRows(p => [...p, emptyHeatRow()])}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Add Row
            </button>
          </div>
          {heatRows.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No records. Click "Add Row" to add.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                    {['Equipment','Process','Cycle No','Start Time','End Time','UOM','Result','Loading By',''].map(h => (
                      <th key={h} className="px-2 py-2.5 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80">
                  {heatRows.map((row, i) => {
                    const upd = (field, val) => setHeatRows(prev => { const a=[...prev]; a[i]={...a[i],[field]:val}; return a; });
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-1 py-2"><input value={row.equipment} onChange={e=>upd('equipment',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Furnace" /></td>
                        <td className="px-1 py-2"><input value={row.processName} onChange={e=>upd('processName',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-28 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Hardening" /></td>
                        <td className="px-1 py-2"><input type="number" value={row.cycleNo} onChange={e=>upd('cycleNo',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-14 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="1" /></td>
                        <td className="px-1 py-2"><input type="datetime-local" value={row.startTime} onChange={e=>upd('startTime',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" /></td>
                        <td className="px-1 py-2"><input type="datetime-local" value={row.endTime} onChange={e=>upd('endTime',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" /></td>
                        <td className="px-1 py-2"><input value={row.uom} onChange={e=>upd('uom',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-16 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="KGS" /></td>
                        <td className="px-1 py-2">
                          <select value={row.result} onChange={e=>upd('result',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                            <option value="">—</option>
                            <option value="OK">OK</option>
                            <option value="NOT OK">NOT OK</option>
                          </select>
                        </td>
                        <td className="px-1 py-2"><input value={row.signedBy} onChange={e=>upd('signedBy',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-20 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Name" /></td>
                        <td className="px-1 py-2">
                          <button type="button" onClick={() => setHeatRows(p=>p.filter((_,j)=>j!==i))}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Inspection Results */}
        <div className="card p-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
            <p className="section-title">Inspection Results</p>
            <button type="button"
              onClick={() => setInspResults(p => [...p, { inspectionType: '', parameter: '', requiredValue: '', achievedValue: '', result: 'OK', finalInspection: '' }])}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Add Row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                  {['Type', 'Parameter', 'Required', 'Achieved', 'Result', 'Final Inspection By', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {inspResults.map((ir, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-1 py-2">
                      <input value={ir.inspectionType} onChange={e => { const a = [...inspResults]; a[i].inspectionType = e.target.value; setInspResults(a); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                    </td>
                    <td className="px-1 py-2">
                      <input value={ir.parameter} onChange={e => { const a = [...inspResults]; a[i].parameter = e.target.value; setInspResults(a); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                    </td>
                    <td className="px-1 py-2">
                      <input value={ir.requiredValue} onChange={e => { const a = [...inspResults]; a[i].requiredValue = e.target.value; setInspResults(a); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                    </td>
                    <td className="px-1 py-2">
                      <input value={ir.achievedValue} onChange={e => { const a = [...inspResults]; a[i].achievedValue = e.target.value; setInspResults(a); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                    </td>
                    <td className="px-1 py-2">
                      <select value={ir.result} onChange={e => { const a = [...inspResults]; a[i].result = e.target.value; setInspResults(a); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300">
                        <option value="OK">OK</option>
                        <option value="NOT OK">NOT OK</option>
                        <option value="NA">NA</option>
                      </select>
                    </td>
                    <td className="px-1 py-2">
                      <input value={ir.finalInspection} onChange={e => { const a = [...inspResults]; a[i].finalInspection = e.target.value; setInspResults(a); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Inspector name" />
                    </td>
                    <td className="px-1 py-2">
                      {inspResults.length > 1 && (
                        <button type="button" onClick={() => setInspResults(p => p.filter((_, j) => j !== i))}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Temperature Cycle Data */}
        <div className="card p-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-[15px]">show_chart</span>
              </div>
              <div>
                <p className="section-title">Temperature Cycle Data</p>
                <p className="text-[10px] text-slate-400">Edit values to update the heat treatment curve</p>
              </div>
            </div>
            <div className="text-right flex flex-col gap-1 items-end">
              <div className="flex flex-wrap gap-1 justify-end">
                <button
                  type="button"
                  disabled={!form.jobCardId}
                  onClick={async () => {
                    const ok = await loadTempCycleFromRunsheet(form.jobCardId);
                    if (!ok) toast.error('No VHT Run Sheet with graph found for this job card.');
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors border border-amber-200"
                  title="Uses the latest VHT Run Sheet that includes this job card and has cycle segments"
                >
                  <span className="material-symbols-outlined text-sm">thermostat</span> From VHT run sheet
                </button>
                <button type="button" onClick={() => setTempRows(p => [...p, { time: '', temp: '' }])}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-sm">add</span> Add Point
                </button>
              </div>
              <p className="text-[9px] text-slate-500 italic">Current cycle: {form.operatorMode || 'Auto-loaded'}</p>
            </div>
          </div>
          
          {/* Editable Temperature Table */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-slate-200">
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-600 uppercase w-8 text-left">#</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-600 uppercase text-center">Time (min)</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-orange-600 uppercase text-center">Temperature (°C)</th>
                  <th className="px-3 py-2.5 text-[10px] font-bold text-slate-600 uppercase w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tempRows.map((row, i) => (
                  <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-3 py-2 text-slate-400 font-mono text-center">{i + 1}</td>
                    <td className="px-2 py-2 text-center">
                      <input type="number" value={row.time}
                        onChange={e => { const a = [...tempRows]; a[i].time = e.target.value; setTempRows(a); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-20 text-center focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 font-mono" 
                        placeholder="0" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input type="number" value={row.temp}
                        onChange={e => { const a = [...tempRows]; a[i].temp = e.target.value; setTempRows(a); }}
                        className="border border-orange-300 rounded-lg px-2 py-1.5 text-xs w-20 text-center bg-orange-50 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 font-mono font-bold" 
                        placeholder="50" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      {tempRows.length > 1 && (
                        <button type="button" onClick={() => setTempRows(p => p.filter((_, j) => j !== i))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Temperature Graph Visualization - Live Update */}
          {tempRows.length > 0 && (
            <div className="p-3 bg-gradient-to-b from-slate-50 to-orange-50/30 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">↗</span>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Heat Treatment Curve (Real-time)</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={tempRows.map((r, i) => ({
                  ...r,
                  index: i + 1,
                  time: r.time || 'T' + (i + 1),
                  temp: Number(r.temp) || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b" 
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Time (Minutes) →', position: 'right', offset: 10, fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                    domain={[0, 'dataMax + 100']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#f8fafc', border: '2px solid #fb923c', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(value) => [`${value}°C`, 'Temperature']}
                    labelFormatter={(label) => `Time: ${label} min`}
                    labelStyle={{ color: '#0f172a' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Temperature"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-3">
            <p className="text-[10px] text-blue-700 leading-relaxed">
              <strong>💡 Tip:</strong> Edit any <strong>Time (min)</strong> or <strong>Temperature (°C)</strong> value above. The heat treatment curve updates <strong>in real-time</strong> as you type. Select a predefined heat treatment cycle from the selection above to auto-populate standard values.
            </p>
          </div>
        </div>

        {/* Photos */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500 text-[15px]">add_photo_alternate</span>
            </div>
            <p className="section-title">Part Photos</p>
            <span className="text-[10px] text-slate-400">up to 5 images</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => <ImageSlot key={i} index={i} onChange={handleImageChange} />)}
          </div>
        </div>

        {/* Packed / Approved */}
        <div className="card p-5">
          <p className="section-title border-b border-slate-100 pb-2 mb-4">Packing & Approval</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Packed Qty</label>
              <input type="number" value={form.packedQty} onChange={e => set('packedQty', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Packed By</label>
              <input value={form.packedBy} onChange={e => set('packedBy', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Approved By</label>
              <input value={form.approvedBy} onChange={e => set('approvedBy', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="form-label">Issued To</label>
              <input value={form.issuedTo} onChange={e => set('issuedTo', e.target.value)} className="form-input" placeholder="Customer contact / name" />
            </div>
            <div>
              <label className="form-label">Heat No</label>
              <input value={form.heatNo} onChange={e => set('heatNo', e.target.value)} className="form-input" placeholder="HT-001" />
            </div>
            <div>
              <label className="form-label">Dispatch Mode</label>
              <input value={form.dispatchMode} onChange={e => set('dispatchMode', e.target.value)} className="form-input" placeholder="By Hand / Courier / Transport" />
            </div>
            <div>
              <label className="form-label">Dispatch Challan No</label>
              <input value={form.dispatchChallanNo} onChange={e => set('dispatchChallanNo', e.target.value)} className="form-input" placeholder="DC-001" />
            </div>
            <div>
              <label className="form-label">Dispatch Challan Date</label>
              <input type="date" value={form.dispatchChallanDate} onChange={e => set('dispatchChallanDate', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Dispatched Through</label>
              <input value={form.dispatchedThrough} onChange={e => set('dispatchedThrough', e.target.value)} className="form-input" placeholder="Transport company name" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Creating...</>
              : <><span className="material-symbols-outlined text-sm">verified</span> Create Certificate</>
            }
          </button>
          <Link to="/quality/certificates" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
