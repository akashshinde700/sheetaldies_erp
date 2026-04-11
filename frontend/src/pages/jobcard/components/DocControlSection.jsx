import React from 'react';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function DocControlSection({ form, setForm }) {
  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Document Control</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <F label="Document No">
          <input value={form.documentNo} onChange={e => setForm(p => ({ ...p, documentNo: e.target.value }))} className="form-input" />
        </F>
        <F label="Revision No">
          <input value={form.revisionNo} onChange={e => setForm(p => ({ ...p, revisionNo: e.target.value }))} className="form-input" />
        </F>
        <F label="Revision Date">
          <input type="date" value={form.revisionDate} onChange={e => setForm(p => ({ ...p, revisionDate: e.target.value }))} className="form-input" />
        </F>
        <F label="Page No">
          <input value={form.pageNo} onChange={e => setForm(p => ({ ...p, pageNo: e.target.value }))} className="form-input" />
        </F>
      </div>
    </div>
  );
}
