import React from 'react';

const F = ({ label, children, className }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const JC = 'form-input bg-indigo-50 text-indigo-900 font-semibold cursor-not-allowed';

export default function CertHardnessSection({ form, set, jcData }) {
  const locked = !!jcData;
  return (
    <div className={`card p-5 ${locked ? 'bg-indigo-50/30' : ''}`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
        <p className="section-title">Hardness Specification</p>
        {locked && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">from Job Card (editable)</span>}
      </div>
      <div className="flex gap-4 items-end flex-wrap">
        <F label="Min (Required)" className="w-28">
          <input type="number" value={form.hardnessMin} onChange={e => set('hardnessMin', e.target.value)}
            className="form-input" placeholder="48" />
        </F>
        <F label="Max (Required)" className="w-28">
          <input type="number" value={form.hardnessMax} onChange={e => set('hardnessMax', e.target.value)}
            className="form-input" placeholder="52" />
        </F>
        <F label="Unit" className="w-28">
          <input
            list="hardness-unit-list"
            value={form.hardnessUnit}
            onChange={e => set('hardnessUnit', e.target.value)}
            className="form-input"
            maxLength={8}
            placeholder="HRC"
          />
          <datalist id="hardness-unit-list">
            {['HRC','HRB','HV','HB','BHN'].map(u => <option key={u} value={u} />)}
          </datalist>
        </F>
        <F label="Achieved Hardness" className="w-36">
          <input value={form.achievedHardness} onChange={e => set('achievedHardness', e.target.value)}
            className="form-input" placeholder="e.g. 48-50" />
        </F>
        {[1,2,3,4].map(n => (
          <F key={n} label={`Hardness After ${n}`} className="w-28">
            <input value={form[`hardnessAfter${n}`]} onChange={e => set(`hardnessAfter${n}`, e.target.value)}
              className="form-input" placeholder="e.g. 49" />
          </F>
        ))}
      </div>
    </div>
  );
}
