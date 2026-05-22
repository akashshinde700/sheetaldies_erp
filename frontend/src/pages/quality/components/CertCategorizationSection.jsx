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
  const locked = !!jcData;
  return (
    <div className={`card p-5 ${locked ? 'bg-indigo-50/30' : ''}`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
        <p className="section-title">Categorization & Process</p>
        {locked && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">from Job Card</span>}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Categorization</p>
          <div className="space-y-1.5">
            <CB label="Normal"              locked={locked} checked={form.catNormal}            onChange={v => set('catNormal', v)} />
            <CB label="Welded"              locked={locked} checked={form.catWelded}            onChange={v => set('catWelded', v)} />
            <CB label="Crack or Crack Risk" locked={locked} checked={form.catCrackRisk}         onChange={v => set('catCrackRisk', v)} />
            <CB label="Distortion Risk"     locked={locked} checked={form.catDistortionRisk}    onChange={v => set('catDistortionRisk', v)} />
            <CB label="Critical Finishing"  locked={locked} checked={form.catCriticalFinishing} onChange={v => set('catCriticalFinishing', v)} />
            <CB label="Dent / Damage"       locked={locked} checked={form.catDentDamage}        onChange={v => set('catDentDamage', v)} />
            <CB label="Rusty"               locked={locked} checked={form.catRusty}             onChange={v => set('catRusty', v)} />
            <CB label="Others"              locked={locked} checked={form.catOthers}            onChange={v => set('catOthers', v)} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Process</p>
          <div className="space-y-1.5">
            <CB label="Stress Relieving" locked={locked} checked={form.procStressRelieving} onChange={v => set('procStressRelieving', v)} />
            <CB label="Hardening"        locked={locked} checked={form.procHardening}       onChange={v => set('procHardening', v)} />
            <CB label="Tempering"        locked={locked} checked={form.procTempering}       onChange={v => set('procTempering', v)} />
            <CB label="Annealing"        locked={locked} checked={form.procAnnealing}       onChange={v => set('procAnnealing', v)} />
            <CB label="Brazing"          locked={locked} checked={form.procBrazing}         onChange={v => set('procBrazing', v)} />
            <CB label="Plasma Nitriding" locked={locked} checked={form.procPlasmaNitriding} onChange={v => set('procPlasmaNitriding', v)} />
            <CB label="Sub Zero"         locked={locked} checked={form.procSubZero}         onChange={v => set('procSubZero', v)} />
            <CB label="Soak Clean"       locked={locked} checked={form.procSoakClean}       onChange={v => set('procSoakClean', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
