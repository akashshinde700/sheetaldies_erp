import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

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

const CB = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group py-0.5">
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'
      }`}>
      {checked && <span className="material-symbols-outlined text-white text-[11px] leading-none">check</span>}
    </button>
    <span className="text-xs text-slate-700 font-medium">{label}</span>
  </label>
);

export default function InspectionForm() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [jobCard,   setJobCard]   = useState(null);
  const [processes, setProcesses] = useState([]);
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
    api.get('/processes').then(r => setProcesses(r.data.data.filter(p => p.isActive)));
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
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'distortionBefore' || k === 'distortionAfter') {
          fd.append(k, JSON.stringify(v.map((val, i) => ({ pt: i + 1, val: Number(val) || 0 }))));
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

        {/* Categorization | Process | Hardness */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Categorization */}
          <div className="card p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-violet-500 text-[14px]">fact_check</span>
              </div>
              <p className="section-title">Categorization</p>
            </div>
            <div className="space-y-1.5">
              <CB label="Normal"              checked={form.catNormal}            onChange={v => set('catNormal', v)} />
              <CB label="Welded"              checked={form.catWelded}            onChange={v => set('catWelded', v)} />
              <CB label="Crack or Crack Risk" checked={form.catCrackRisk}         onChange={v => set('catCrackRisk', v)} />
              <CB label="Distortion Risk"     checked={form.catDistortionRisk}    onChange={v => set('catDistortionRisk', v)} />
              <CB label="Initial Finishing"   checked={form.catCriticalFinishing} onChange={v => set('catCriticalFinishing', v)} />
              <CB label="Dent / Damage"       checked={form.catDentDamage}        onChange={v => set('catDentDamage', v)} />
              <CB label="Rusty"               checked={form.catRusty}             onChange={v => set('catRusty', v)} />
              <CB label="Cavity"              checked={form.catCavity}            onChange={v => set('catCavity', v)} />
              <CB label="Others"              checked={form.catOthers}            onChange={v => set('catOthers', v)} />
            </div>
            {form.catOthers && (
              <input value={form.otherDefects} onChange={e => set('otherDefects', e.target.value)}
                className="form-input mt-2 text-xs" placeholder="Describe other defects..." />
            )}
          </div>

          {/* Process */}
          <div className="card p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-[14px]">local_fire_department</span>
              </div>
              <p className="section-title">Process</p>
            </div>
            <div className="mb-3">
              <label className="form-label">Primary Process</label>
              <select value={form.processTypeId} onChange={e => set('processTypeId', e.target.value)} className="form-input">
                <option value="">— Select —</option>
                {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <CB label="Stress Relieving" checked={form.procStressRelieving} onChange={v => set('procStressRelieving', v)} />
              <CB label="Hardening"        checked={form.procHardening}       onChange={v => set('procHardening', v)} />
              <CB label="Tempering"        checked={form.procTempering}       onChange={v => set('procTempering', v)} />
              <CB label="Annealing"        checked={form.procAnnealing}       onChange={v => set('procAnnealing', v)} />
              <CB label="Brazing"          checked={form.procBrazing}         onChange={v => set('procBrazing', v)} />
              <CB label="Plasma Nitriding" checked={form.procPlasmaNitriding} onChange={v => set('procPlasmaNitriding', v)} />
              <CB label="Nitriding"        checked={form.procNitriding}       onChange={v => set('procNitriding', v)} />
              <CB label="Sub Zero"         checked={form.procSubZero}         onChange={v => set('procSubZero', v)} />
              <CB label="Soak Clean"       checked={form.procSoakClean}       onChange={v => set('procSoakClean', v)} />
              <CB label="Slow Cool"        checked={form.procSlowCool}        onChange={v => set('procSlowCool', v)} />
            </div>
          </div>

          {/* Inspection Methods + Hardness */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-500 text-[14px]">verified</span>
              </div>
              <p className="section-title">Inspection & Hardness</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Visual Inspection</p>
              <div className="space-y-1.5">
                <CB label="Before" checked={form.visualBefore} onChange={v => set('visualBefore', v)} />
                <CB label="After"  checked={form.visualAfter}  onChange={v => set('visualAfter', v)} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">MPI Inspection</p>
              <div className="space-y-1.5">
                <CB label="Before" checked={form.mpiBefore} onChange={v => set('mpiBefore', v)} />
                <CB label="After"  checked={form.mpiAfter}  onChange={v => set('mpiAfter', v)} />
                <CB label="NIL"    checked={form.mpiNil}    onChange={v => set('mpiNil', v)} />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Required Hardness</p>
              <div className="flex items-center gap-2">
                <input type="number" value={form.requiredHardnessMin}
                  onChange={e => set('requiredHardnessMin', e.target.value)}
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  placeholder="Min" />
                <span className="text-slate-400 font-bold">–</span>
                <input type="number" value={form.requiredHardnessMax}
                  onChange={e => set('requiredHardnessMax', e.target.value)}
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  placeholder="Max" />
                <select value={form.hardnessUnit} onChange={e => set('hardnessUnit', e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300">
                  <option>HRC</option><option>HRB</option><option>HV</option><option>HB</option>
                </select>
              </div>
            </div>

            <div className={`rounded-xl p-3 border ${inRange ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${inRange ? 'text-emerald-700' : 'text-slate-500'}`}>Achieved Hardness</p>
              <div className="flex items-center gap-2">
                <input type="number" value={form.achievedHardness}
                  onChange={e => set('achievedHardness', e.target.value)}
                  className={`w-24 border rounded-lg px-2 py-2 text-lg font-extrabold text-center bg-white ${inRange ? 'border-emerald-200 text-emerald-800' : 'border-slate-200 text-slate-800'} focus:outline-none focus:ring-1 focus:ring-indigo-300`}
                  placeholder="56" />
                <span className={`text-sm font-bold ${inRange ? 'text-emerald-700' : 'text-slate-600'}`}>{form.hardnessUnit}</span>
                {form.achievedHardness && form.requiredHardnessMin && form.requiredHardnessMax && (
                  <span className={`text-xs font-extrabold px-2 py-1 rounded-full ml-auto ${inRange ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                    {inRange ? '✓ IN RANGE' : '✗ OUT OF RANGE'}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Hardness After (4 readings)</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  ['hardnessAfter1','1'],
                  ['hardnessAfter2','2'],
                  ['hardnessAfter3','3'],
                  ['hardnessAfter4','4'],
                ].map(([k, lbl]) => (
                  <input key={k} type="number" value={form[k]}
                    onChange={e => set(k, e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-center bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    placeholder={lbl} />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-xs font-bold text-slate-600">Urgent</span>
              <button type="button" onClick={() => set('urgent', !form.urgent)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-colors ${
                  form.urgent ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600'
                }`}>
                {form.urgent ? 'YES' : 'NO'}
              </button>
            </div>

            <div>
              <label className="form-label">Final Status</label>
              <select value={form.inspectionStatus} onChange={e => set('inspectionStatus', e.target.value)} className="form-input">
                <option value="PENDING">Pending</option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
                <option value="CONDITIONAL">Conditional</option>
              </select>
            </div>
          </div>
        </div>

        {/* Distortion Table */}
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
                        className="w-16 border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-center focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200" />
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
            <p className="text-xs text-slate-400 text-center py-6">No heat treatment records. Click "Add Row" to add.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
                    {['Equipment','Process','Cycle','Temp/Time','Temp From°C','Temp To°C','Hold (min)','Start Time','End Time','Date','Loading By','Atmosphere','UOM','Result','Sign',''].map(h => (
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
                        <td className="px-1 py-2">
                          <select value={row.processTypeId} onChange={e=>upd('processTypeId',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                            <option value="">—</option>
                            {processes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-2"><input type="number" value={row.cycleNo} onChange={e=>upd('cycleNo',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-14 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="1" /></td>
                        <td className="px-1 py-2"><input value={row.tempTime} onChange={e=>upd('tempTime',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-28 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="e.g. 1020°C / 30m" /></td>
                        <td className="px-1 py-2"><input type="number" value={row.tempFrom} onChange={e=>upd('tempFrom',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-20 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="800" /></td>
                        <td className="px-1 py-2"><input type="number" value={row.tempTo} onChange={e=>upd('tempTo',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-20 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="900" /></td>
                        <td className="px-1 py-2"><input type="number" value={row.holdTimeMin} onChange={e=>upd('holdTimeMin',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-16 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="60" /></td>
                        <td className="px-1 py-2"><input type="datetime-local" value={row.startTime} onChange={e=>upd('startTime',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" /></td>
                        <td className="px-1 py-2"><input type="datetime-local" value={row.endTime} onChange={e=>upd('endTime',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-300" /></td>
                        <td className="px-1 py-2"><input type="date" value={row.processDate} onChange={e=>upd('processDate',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300" /></td>
                        <td className="px-1 py-2"><input value={row.loadingBy} onChange={e=>upd('loadingBy',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Name" /></td>
                        <td className="px-1 py-2"><input value={row.atmosphere} onChange={e=>upd('atmosphere',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 w-20 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Vacuum" /></td>
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

        {/* Part Photos */}
        <div className="card p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500 text-[14px]">photo_library</span>
            </div>
            <p className="section-title">Part Photos</p>
            <span className="text-[10px] text-slate-400 ml-auto">Up to 5 images · JPG/PNG/WebP · Max 5MB each</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => (
              <ImageUploadSlot key={i} index={i}
                value={typeof images[i] === 'string' ? images[i] : null}
                onChange={handleImageChange} />
            ))}
          </div>
        </div>

        {/* Inspector Details */}
        <div className="card p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-500 text-[14px]">badge</span>
            </div>
            <p className="section-title">Inspector Details</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Incoming Inspection By</label>
              <input value={form.incomingInspectionBy} onChange={e => set('incomingInspectionBy', e.target.value)} className="form-input" placeholder="Inspector name" />
            </div>
            <div>
              <label className="form-label">Final Inspection By</label>
              <input value={form.finalInspectionBy} onChange={e => set('finalInspectionBy', e.target.value)} className="form-input" placeholder="Inspector name" />
            </div>
            <div>
              <label className="form-label">Inspected By</label>
              <input value={form.inspectedBy} onChange={e => set('inspectedBy', e.target.value)} className="form-input" placeholder="Inspector name" />
            </div>
            <div>
              <label className="form-label">Packed Qty</label>
              <input type="number" value={form.packedQty} onChange={e => set('packedQty', e.target.value)} className="form-input" placeholder="0" />
            </div>
            <div>
              <label className="form-label">Packed By</label>
              <input value={form.packedBy} onChange={e => set('packedBy', e.target.value)} className="form-input" placeholder="Packer name" />
            </div>
            <div>
              <label className="form-label">Inspection Date</label>
              <input type="date" value={form.inspectionDate} onChange={e => set('inspectionDate', e.target.value)} className="form-input" />
            </div>
            <div className="col-span-3">
              <label className="form-label">Remarks</label>
              <input value={form.remarks} onChange={e => set('remarks', e.target.value)} className="form-input" placeholder="Any remarks..." />
            </div>
          </div>
        </div>

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
