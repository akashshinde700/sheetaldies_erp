import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { toNum } from '../../utils/normalize';
import { useProcesses } from '../../hooks/useMasterData';

// Subcomponents
import CategorizationSection from './components/CategorizationSection';
import ProcessHardnessSection from './components/ProcessHardnessSection';
import DistortionSection from './components/DistortionSection';
import ProcessLogSection from './components/ProcessLogSection';
import InspectionPhotosSection from './components/InspectionPhotosSection';
import InspectorDetailsSection from './components/InspectorDetailsSection';

function ImageUploadSlot({ index, value, onChange }) {
  const inputRef  = useRef();
  const [preview, setPreview] = useState(value || null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange(index, file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(index, null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => !preview && inputRef.current.click()}
        className={`w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all ${
          preview ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
        }`}>
        {preview
          ? <img src={preview} alt={`Part ${index}`} className="w-full h-full object-cover rounded-xl" />
          : <>
              <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1">Photo {index}</span>
            </>
        }
      </button>
      {preview && (
        <button type="button" onClick={handleRemove}
          className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow text-[11px] font-bold hover:bg-rose-600">✕</button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

export default function InspectionForm() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [jobCard,   setJobCard]   = useState(null);
  const { data: processes = [] } = useProcesses();
  const [loading,   setLoading]   = useState(false);
  const [images,    setImages]    = useState({ 1:null, 2:null, 3:null, 4:null, 5:null });
  const [heatRows,  setHeatRows]  = useState([]);

  const emptyHeatRow = () => ({ equipment:'', processTypeId:'', cycleNo:'', tempTime:'', tempFrom:'', tempTo:'', holdTimeMin:'', startTime:'', endTime:'', processDate:'', loadingBy:'', atmosphere:'', uom:'', result:'', signedBy:'' });

  const [form, setForm] = useState({
    catNormal:false, catWelded:false, catCrackRisk:false, catDistortionRisk:false,
    catCriticalFinishing:false, catDentDamage:false, catRusty:false, catCavity:false, catOthers:false,
    otherDefects:'',
    processTypeId:'',
    procStressRelieving:false, procHardening:false, procTempering:false, procAnnealing:false,
    procBrazing:false, procPlasmaNitriding:false, procNitriding:false, procSubZero:false, procSoakClean:false, procSlowCool:false,
    visualBefore:false, visualAfter:false,
    mpiBefore:false, mpiAfter:false, mpiNil:false,
    requiredHardnessMin:'', requiredHardnessMax:'', hardnessUnit:'HRC', achievedHardness:'',
    hardnessAfter1:'', hardnessAfter2:'', hardnessAfter3:'', hardnessAfter4:'',
    distortionBefore: Array(8).fill(''),
    distortionAfter:  Array(8).fill(''),
    urgent:false,
    packedQty:'', packedBy:'', incomingInspectionBy:'', finalInspectionBy:'',
    inspectedBy:'', inspectionDate: new Date().toISOString().split('T')[0],
    remarks:'', inspectionStatus:'PENDING',
  });

  useEffect(() => {
    api.get(`/jobcards/${id}`).then(r => setJobCard(r.data.data));
    api.get(`/quality/${id}/inspection`)
      .then(r => {
        const d = r.data.data;
        if (d.heatProcesses?.length) {
          setHeatRows(d.heatProcesses.map(h => ({
            equipment:     h.equipment     || '',
            processTypeId: h.processTypeId || '',
            cycleNo:       h.cycleNo       || '',
            tempTime:      h.tempTime      || '',
            tempFrom:      h.tempFrom      || '',
            tempTo:        h.tempTo        || '',
            holdTimeMin:   h.holdTimeMin   || '',
            startTime:     h.startTime ? h.startTime.slice(0,16) : '',
            endTime:       h.endTime   ? h.endTime.slice(0,16)   : '',
            processDate:   h.processDate ? h.processDate.split('T')[0] : '',
            loadingBy:     h.loadingBy     || '',
            atmosphere:    h.atmosphere    || '',
            uom:           h.uom           || '',
            result:        h.result        || '',
            signedBy:      h.signedBy      || '',
          })));
        }
        setForm(prev => ({
          ...prev,
          catNormal:            d.catNormal            || false,
          catWelded:            d.catWelded            || false,
          catCrackRisk:         d.catCrackRisk         || false,
          catDistortionRisk:    d.catDistortionRisk     || false,
          catCriticalFinishing: d.catCriticalFinishing  || false,
          catDentDamage:        d.catDentDamage         || false,
          catRusty:             d.catRusty             || false,
          catCavity:            d.catCavity             || false,
          catOthers:            d.catOthers             || false,
          otherDefects:         d.otherDefects          || '',
          processTypeId:        d.processTypeId         || '',
          procStressRelieving:  d.procStressRelieving   || false,
          procHardening:        d.procHardening         || false,
          procTempering:        d.procTempering         || false,
          procAnnealing:        d.procAnnealing         || false,
          procBrazing:          d.procBrazing           || false,
          procPlasmaNitriding:  d.procPlasmaNitriding   || false,
          procNitriding:        d.procNitriding         || false,
          procSubZero:          d.procSubZero           || false,
          procSoakClean:        d.procSoakClean         || false,
          procSlowCool:         d.procSlowCool          || false,
          visualBefore:         d.visualBefore          || false,
          visualAfter:          d.visualAfter           || false,
          mpiBefore:            d.mpiBefore             || false,
          mpiAfter:             d.mpiAfter              || false,
          mpiNil:               d.mpiNil                || false,
          requiredHardnessMin:  d.requiredHardnessMin   || '',
          requiredHardnessMax:  d.requiredHardnessMax   || '',
          hardnessUnit:         d.hardnessUnit          || 'HRC',
          achievedHardness:     d.achievedHardness      || '',
          hardnessAfter1:       d.hardnessAfter1        || '',
          hardnessAfter2:       d.hardnessAfter2        || '',
          hardnessAfter3:       d.hardnessAfter3        || '',
          hardnessAfter4:       d.hardnessAfter4        || '',
          distortionBefore:     d.distortionBefore ? d.distortionBefore.map(x => x.val ?? x) : Array(8).fill(''),
          distortionAfter:      d.distortionAfter  ? d.distortionAfter.map(x => x.val  ?? x) : Array(8).fill(''),
          urgent:               d.urgent                || false,
          packedQty:            d.packedQty            || '',
          packedBy:             d.packedBy             || '',
          incomingInspectionBy: d.incomingInspectionBy || '',
          finalInspectionBy:    d.finalInspectionBy    || '',
          inspectedBy:          d.inspectedBy          || '',
          inspectionDate:       d.inspectionDate ? d.inspectionDate.split('T')[0] : new Date().toISOString().split('T')[0],
          remarks:              d.remarks               || '',
          inspectionStatus:     d.inspectionStatus      || 'PENDING',
        }));
        const imgMap = {};
        for (let i = 1; i <= 5; i++) { if (d[`image${i}`]) imgMap[i] = d[`image${i}`]; }
        if (Object.keys(imgMap).length) setImages(prev => ({ ...prev, ...imgMap }));
      })
      .catch(() => {});
  }, [id]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const handleImageChange = (index, file) => setImages(prev => ({ ...prev, [index]: file }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const beforeHasData = form.distortionBefore.some(v => v !== '' && Number(v) !== 0);
    const afterHasData = form.distortionAfter.some(v => v !== '' && Number(v) !== 0);
    
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
      fd.append('heatProcesses', JSON.stringify(heatRows.filter(r => r.equipment || r.processTypeId)));
      for (let i = 1; i <= 5; i++) {
        if (images[i] instanceof File) fd.append(`image${i}`, images[i]);
      }
      await api.post(`/quality/${id}/inspection`, fd);
      toast.success('Inspection saved!');
      navigate(`/jobcards/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving inspection.');
    } finally {
      setLoading(false);
    }
  };

  const STATUS_COLOR = {
    PENDING:     'bg-slate-100 text-slate-600',
    PASS:        'bg-emerald-100 text-emerald-700',
    FAIL:        'bg-rose-100 text-rose-700',
    CONDITIONAL: 'bg-amber-100 text-amber-700',
  };

  const inRange = form.achievedHardness && form.requiredHardnessMin && form.requiredHardnessMax &&
    Number(form.achievedHardness) >= Number(form.requiredHardnessMin) &&
    Number(form.achievedHardness) <= Number(form.requiredHardnessMax);

  return (
    <div className="page-stack w-full animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/jobcards/${id}`}
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-slate-800 font-headline">Final Inspection</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Job Card: <span className="font-bold text-slate-600">{jobCard?.jobCardNo}</span>
            {jobCard?.part?.description && <> — {jobCard.part.description}</>}
          </p>
        </div>
        <span className={`badge ${STATUS_COLOR[form.inspectionStatus]}`}>{form.inspectionStatus}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CategorizationSection form={form} set={set} />
          <ProcessHardnessSection form={form} set={set} processes={processes} inRange={inRange} />
          <div className="space-y-4">
            <InspectorDetailsSection form={form} set={set} />
            <div className="card p-5 bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100">
               <p className="text-xs text-slate-500 leading-relaxed"> Ensure all distortion points are measured accurately. Achieved hardness must be within specified range for PASS status.</p>
            </div>
          </div>
        </div>

        <DistortionSection form={form} set={set} />
        <ProcessLogSection heatRows={heatRows} setHeatRows={setHeatRows} processes={processes} emptyHeatRow={emptyHeatRow} />
        <InspectionPhotosSection images={images} handleImageChange={handleImageChange} ImageUploadSlot={ImageUploadSlot} />

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Saving...</>
              : <><span className="material-symbols-outlined text-sm">save</span> Save Inspection</>
            }
          </button>
          <Link to={`/jobcards/${id}`} className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
