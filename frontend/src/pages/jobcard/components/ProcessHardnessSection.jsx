import React from 'react';

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

export default function ProcessHardnessSection({ form, set, processes, inRange }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-orange-500 text-[14px]">local_fire_department</span>
        </div>
        <p className="section-title">Process & Inspection</p>
      </div>

      <div>
        <label className="form-label">Primary Process</label>
        <select value={form.processTypeId} onChange={e => set('processTypeId', e.target.value)} className="form-input">
          <option value="">— Select —</option>
          {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
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

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Visual</p>
          <div className="space-y-1.5">
            <CB label="Before" checked={form.visualBefore} onChange={v => set('visualBefore', v)} />
            <CB label="After"  checked={form.visualAfter}  onChange={v => set('visualAfter', v)} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">MPI</p>
          <div className="space-y-1.5">
            <CB label="Before" checked={form.mpiBefore} onChange={v => set('mpiBefore', v)} />
            <CB label="After"  checked={form.mpiAfter}  onChange={v => set('mpiAfter', v)} />
            <CB label="NIL"    checked={form.mpiNil}    onChange={v => set('mpiNil', v)} />
          </div>
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
  );
}
