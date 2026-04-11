import React from 'react';

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

export default function CertCategorizationSection({ form, set }) {
  return (
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
  );
}
