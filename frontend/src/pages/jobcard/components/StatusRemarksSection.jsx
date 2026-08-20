import React from 'react';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function StatusRemarksSection({ form, setForm }) {
  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Production Notes</p>
      <div className="grid grid-cols-1 gap-4">
        <F label="Special Requirements">
          <textarea value={form.specialRequirements} onChange={e => setForm(p => ({ ...p, specialRequirements: e.target.value }))} rows={3} className="form-input resize-none" placeholder="Enter any specific process or handling requirements" />
        </F>
        <F label="Precautions During Production & Final Inspection">
          <textarea value={form.precautions} onChange={e => setForm(p => ({ ...p, precautions: e.target.value }))} rows={3} className="form-input resize-none" placeholder="Enter any safety or quality precautions" />
        </F>
      </div>
    </div>
  );
}
