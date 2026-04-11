import React from 'react';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function StatusRemarksSection({ isEdit, form, setForm, moveToNextStatus }) {
  const STATUS_OPTS = ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION', 'COMPLETED', 'ON_HOLD'];
  const STATUS_TRANSITIONS = {
    CREATED: 'IN_PROGRESS',
    IN_PROGRESS: 'SENT_FOR_JOBWORK',
    SENT_FOR_JOBWORK: 'INSPECTION',
    INSPECTION: 'COMPLETED',
  };

  return (
    <div className="card p-5 space-y-4">
      {isEdit && (
        <>
          <F label="Status">
            <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className="form-input">
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </F>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={moveToNextStatus}
              className="btn-secondary text-xs px-3 py-1.5">
              Move to {STATUS_TRANSITIONS[form.status]?.replace(/_/g, ' ') || '…'}
            </button>
            <button type="button" onClick={() => setForm(p => ({...p, status: 'ON_HOLD'}))}
              className="btn-danger text-xs px-3 py-1.5">
              Put on Hold
            </button>
          </div>
        </>
      )}
      <F label="Remarks">
        <textarea value={form.remarks} onChange={e => setForm(p => ({...p, remarks: e.target.value}))} rows={3} className="form-input resize-none" placeholder="Additional notes..." />
      </F>
      <F label="Special Requirements">
        <textarea value={form.specialRequirements} onChange={e => setForm(p => ({ ...p, specialRequirements: e.target.value }))} rows={2} className="form-input resize-none" />
      </F>
      <F label="Precautions During Production & Final Inspection">
        <textarea value={form.precautions} onChange={e => setForm(p => ({ ...p, precautions: e.target.value }))} rows={2} className="form-input resize-none" />
      </F>
    </div>
  );
}
