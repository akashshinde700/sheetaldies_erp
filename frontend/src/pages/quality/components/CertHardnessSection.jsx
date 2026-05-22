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
        {locked && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">from Job Card</span>}
      </div>
      <div className="flex gap-4 items-end">
        <F label="Min" className="w-28">
          <input type="number" value={form.hardnessMin} disabled={locked} onChange={e => set('hardnessMin', e.target.value)}
            className={locked ? JC : 'form-input'} placeholder="48" />
        </F>
        <F label="Max" className="w-28">
          <input type="number" value={form.hardnessMax} disabled={locked} onChange={e => set('hardnessMax', e.target.value)}
            className={locked ? JC : 'form-input'} placeholder="52" />
        </F>
        <F label="Unit" className="w-24">
          <select value={form.hardnessUnit} disabled={locked} onChange={e => set('hardnessUnit', e.target.value)}
            className={locked ? JC : 'form-input'}>
            <option>HRC</option><option>HRB</option><option>HV</option><option>HB</option>
          </select>
        </F>
      </div>
    </div>
  );
}
