import React from 'react';

const F = ({ label, children, className }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function CertHardnessSection({ form, set }) {
  return (
    <div className="card p-5">
      <p className="section-title border-b border-slate-100 pb-2 mb-4">Hardness Specification</p>
      <div className="flex gap-4 items-end">
        <F label="Min" className="w-28">
          <input type="number" value={form.hardnessMin} onChange={e => set('hardnessMin', e.target.value)} className="form-input" placeholder="48" />
        </F>
        <F label="Max" className="w-28">
          <input type="number" value={form.hardnessMax} onChange={e => set('hardnessMax', e.target.value)} className="form-input" placeholder="52" />
        </F>
        <F label="Unit" className="w-24">
          <select value={form.hardnessUnit} onChange={e => set('hardnessUnit', e.target.value)} className="form-input">
            <option>HRC</option><option>HRB</option><option>HV</option><option>HB</option>
          </select>
        </F>
      </div>
    </div>
  );
}
