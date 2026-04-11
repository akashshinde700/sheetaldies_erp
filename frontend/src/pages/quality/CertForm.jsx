import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toNum } from '../../utils/normalize';

// Master Data Hooks
import { useParties, useMasterJobCards, useProcesses } from '../../hooks/useMasterData';

// Form Subcomponents
import CertHeaderSection from './components/CertHeaderSection';
import CertTechnicalSection from './components/CertTechnicalSection';
import CertCategorizationSection from './components/CertCategorizationSection';
import CertHardnessSection from './components/CertHardnessSection';
import CertPackingSection from './components/CertPackingSection';
import CertPhotosSection from './components/CertPhotosSection';

// Shared Components
import CertItemsTable from './components/CertItemsTable';
import DistortionTable from './components/DistortionTable';
import HeatProcessLog from './components/HeatProcessLog';
import InspectionResultsTable from './components/InspectionResultsTable';
import TemperatureCurve from './components/TemperatureCurve';

export default function CertForm() {
  const navigate = useNavigate();
  const { data: parties = [] } = useParties();
  const { data: jobCards = [] } = useMasterJobCards();
  const { data: processes = [] } = useProcesses();

  const [images,    setImages]    = useState({});
  const [loading,   setLoading]   = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    jobCardId: '', yourPoNo: '', yourPoDate: '', yourRefNo: '',
    issueNo: '', issueDate: today, checkedBy: '',
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
    specialInstruction: '',
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

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
    } catch { /* fall back */ }
    return false;
  };

  const updateTemperatureCycle = (treatmentType) => {
    const cycles = {
      'HARDEN AND TEMPER': [
        { time: '0', temp: '50' }, { time: '10', temp: '550' }, { time: '30', temp: '750' }, { time: '50', temp: '950' },
        { time: '80', temp: '1030' }, { time: '110', temp: '1030' }, { time: '130', temp: '750' }, { time: '150', temp: '550' }, { time: '170', temp: '50' }
      ],
      'D2': [
        { time: '0', temp: '50' }, { time: '10', temp: '550' }, { time: '30', temp: '750' }, { time: '50', temp: '950' },
        { time: '80', temp: '1040' }, { time: '110', temp: '500' }, { time: '130', temp: '500' }, { time: '250', temp: '50' }
      ],
      'HSS': [
        { time: '0', temp: '50' }, { time: '10', temp: '650' }, { time: '25', temp: '850' }, { time: '40', temp: '1050' },
        { time: '70', temp: '1195' }, { time: '90', temp: '540' }, { time: '210', temp: '540' }, { time: '330', temp: '50' }
      ],
      'D3': [
        { time: '0', temp: '50' }, { time: '10', temp: '500' }, { time: '30', temp: '750' }, { time: '50', temp: '850' },
        { time: '140', temp: '990' }, { time: '160', temp: '200' }, { time: '280', temp: '200' }, { time: '330', temp: '50' }
      ],
      'STRESS RELIEVING': [
        { time: '0', temp: '50' }, { time: '50', temp: '650' }, { time: '170', temp: '650' }, { time: '220', temp: '50' }
      ],
      'ANNEALING': [
        { time: '0', temp: '50' }, { time: '50', temp: '590' }, { time: '200', temp: '590' }, { time: '250', temp: '50' }
      ]
    };
    setTempRows(cycles[treatmentType] || cycles['HARDEN AND TEMPER']);
  };

  useEffect(() => {
    if (!form.jobCardId || !jobCards.length) return;
    const selectedJobCard = jobCards.find((jc) => String(jc.id) === form.jobCardId);
    if (!selectedJobCard) return;

    const hardnessMin = selectedJobCard.hardnessMin || (selectedJobCard.hrcRange && selectedJobCard.hrcRange.split(/[–-]/)[0]?.trim()) || '61';
    const hardnessMax = selectedJobCard.hardnessMax || (selectedJobCard.hrcRange && selectedJobCard.hrcRange.split(/[–-]/)[1]?.trim()) || '63';
    const heatTreatment = selectedJobCard.treatmentType || selectedJobCard.operationMode || 'HARDEN AND TEMPER';

    setForm(p => ({
      ...p,
      dieMaterial: selectedJobCard.dieMaterial || 'D2',
      operatorMode: heatTreatment,
      hardnessMin,
      hardnessMax
    }));

    loadTempCycleFromRunsheet(form.jobCardId).then(ok => {
      if (!ok) updateTemperatureCycle(heatTreatment);
    });
  }, [form.jobCardId, jobCards]);

  const handleImageChange = (i, file) => setImages(p => ({ ...p, [i]: file }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jobCardId || !form.customerId) { toast.error('Job Card and Customer are required.'); return; }
    
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
      fd.append('items', JSON.stringify(certItems.filter(it => it.description?.trim())));
      fd.append('inspectionResults', JSON.stringify(inspResults));
      fd.append('tempCycleData', JSON.stringify(tempRows.filter(r => r.time !== '' && r.temp !== '')));
      fd.append('certHeatProcesses', JSON.stringify(heatRows.filter(r => r.equipment || r.processName)));
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
      <div className="flex items-center gap-3 mb-6">
        <Link to="/quality/certificates" className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">New Test Certificate</h2>
          <p className="text-xs text-slate-400 mt-0.5">Sheetal Vacuum Heat Pvt. Ltd.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <CertHeaderSection form={form} set={set} parties={parties} jobCards={jobCards} />
        <CertTechnicalSection form={form} set={set} updateTemperatureCurve={updateTemperatureCycle} />
        <CertCategorizationSection form={form} set={set} />
        
        <CertItemsTable certItems={certItems} setCertItems={setCertItems} />
        <CertHardnessSection form={form} set={set} />
        <DistortionTable form={form} setForm={setForm} set={set} />
        <HeatProcessLog heatRows={heatRows} setHeatRows={setHeatRows} emptyHeatRow={emptyHeatRow} />
        <InspectionResultsTable inspResults={inspResults} setInspResults={setInspResults} />
        <TemperatureCurve tempRows={tempRows} setTempRows={setTempRows} form={form} loadTempCycleFromRunsheet={loadTempCycleFromRunsheet} />
        <CertPhotosSection handleImageChange={handleImageChange} />
        <CertPackingSection form={form} set={set} />

        <div className="flex gap-3 pb-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Certificate'}
          </button>
          <Link to="/quality/certificates" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
