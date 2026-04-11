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

export default function CategorizationSection({ form, set }) {
  return (
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
  );
}
