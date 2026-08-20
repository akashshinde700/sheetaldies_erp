import React from 'react';

const CB = ({ label, checked, onChange, locked }) => (
  <label className={`flex items-center gap-2 py-0.5 ${locked ? 'cursor-not-allowed' : 'cursor-pointer group'}`}>
    <button type="button" onClick={() => !locked && onChange(!checked)} disabled={locked}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked
          ? locked ? 'bg-indigo-400 border-indigo-400' : 'bg-indigo-600 border-indigo-600'
          : locked ? 'border-slate-200 bg-slate-50' : 'border-slate-300 group-hover:border-indigo-400'
      }`}>
      {checked && <span className="material-symbols-outlined text-white text-[11px] leading-none">check</span>}
    </button>
    <span className={`text-xs font-medium ${locked ? 'text-indigo-700' : 'text-slate-700'}`}>{label}</span>
  </label>
);

export default function CertCategorizationSection({ form, set, jcData }) {
  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2 mb-4">
        <p className="section-title">Categorization & Process</p>
        <p className="text-xs text-slate-500 max-w-xl">Choose the right certificate classification and inspection status for this item.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Categorization</p>
          <div className="space-y-1.5">
            <CB label="Normal"             checked={form.catNormal}            onChange={v => set('catNormal', v)} />
            <CB label="Welded"             checked={form.catWelded}            onChange={v => set('catWelded', v)} />
            <CB label="Crack or Crack Risk"checked={form.catCrackRisk}         onChange={v => set('catCrackRisk', v)} />
            <CB label="Distortion Risk"    checked={form.catDistortionRisk}    onChange={v => set('catDistortionRisk', v)} />
            <CB label="Critical Finishing" checked={form.catCriticalFinishing} onChange={v => set('catCriticalFinishing', v)} />
            <CB label="Dent / Damage"      checked={form.catDentDamage}        onChange={v => set('catDentDamage', v)} />
            <CB label="Rusty"              checked={form.catRusty}             onChange={v => set('catRusty', v)} />
            <CB label="Others"             checked={form.catOthers}            onChange={v => set('catOthers', v)} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Process</p>
          <div className="space-y-1.5">
            <CB label="Stress Relieving"checked={form.procStressRelieving} onChange={v => set('procStressRelieving', v)} />
            <CB label="Hardening"       checked={form.procHardening}       onChange={v => set('procHardening', v)} />
            <CB label="Tempering"       checked={form.procTempering}       onChange={v => set('procTempering', v)} />
            <CB label="Annealing"       checked={form.procAnnealing}       onChange={v => set('procAnnealing', v)} />
            <CB label="Brazing"         checked={form.procBrazing}         onChange={v => set('procBrazing', v)} />
            <CB label="Plasma Nitriding"checked={form.procPlasmaNitriding} onChange={v => set('procPlasmaNitriding', v)} />
            <CB label="Sub Zero"        checked={form.procSubZero}         onChange={v => set('procSubZero', v)} />
            <CB label="Soak Clean"      checked={form.procSoakClean}       onChange={v => set('procSoakClean', v)} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Inspection</p>
          <p className="text-[9px] font-bold text-slate-500 mb-1">Visual Inspection</p>
          <div className="space-y-1.5 mb-3">
            <CB label="Before" checked={form.visualBefore} onChange={v => set('visualBefore', v)} />
            <CB label="After"  checked={form.visualAfter}  onChange={v => set('visualAfter', v)} />
          </div>
          <p className="text-[9px] font-bold text-slate-500 mb-1">MPI Inspection</p>
          <div className="space-y-1.5">
            <CB label="Before" checked={form.mpiBefore} onChange={v => set('mpiBefore', v)} />
            <CB label="After"  checked={form.mpiAfter}  onChange={v => set('mpiAfter', v)} />
            <CB label="Nil"    checked={form.mpiNil}    onChange={v => set('mpiNil', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
