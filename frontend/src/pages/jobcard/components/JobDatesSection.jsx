import React from 'react';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function JobDatesSection({ form, setForm }) {
  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Dates</p>
      <div className="grid grid-cols-2 gap-4">
        <F label="Received Date">
          <input type="date" value={form.receivedDate} onChange={e => setForm(p => ({...p, receivedDate: e.target.value}))} className="form-input" />
        </F>
        <F label="Due Date">
          <input type="date" value={form.dueDate} onChange={e => setForm(p => ({...p, dueDate: e.target.value}))} className="form-input" />
        </F>
        <F label="Start Date">
          <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} className="form-input" />
        </F>
        <F label="End Date">
          <input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} className="form-input" />
        </F>
      </div>
    </div>
  );
}
