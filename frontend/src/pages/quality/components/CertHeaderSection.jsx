import React from 'react';

const F = ({ label, children, className }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function CertHeaderSection({ form, set, parties, jobCards }) {
  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Certificate Details</p>
      <div className="grid grid-cols-2 gap-4">
        <F label="Customer's">
          <select value={form.customerId} onChange={e => set('customerId', e.target.value)} required className="form-input">
            <option value="">— Select —</option>
            {parties.filter(p => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </F>
        <F label="Certificate No.">
          <input value={form.issueNo} onChange={e => set('issueNo', e.target.value)} className="form-input" placeholder="e.g. IC-001" />
        </F>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Job Card No.">
          <select value={form.jobCardId} onChange={e => set('jobCardId', e.target.value)} className="form-input">
            <option value="">— Select Job Card —</option>
            {jobCards.map(jc => (
              <option key={jc.id} value={jc.id}>{jc.jobCardNo} — {jc.part?.partNo || jc.part?.description}</option>
            ))}
          </select>
        </F>
        <F label="Your PO No.">
          <input value={form.yourPoNo} onChange={e => set('yourPoNo', e.target.value)} className="form-input" />
        </F>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Your DC No.">
          <input value={form.yourRefNo} onChange={e => set('yourRefNo', e.target.value)} className="form-input" />
        </F>
        <F label="Issue Date">
          <input type="date" value={form.issueDate} onChange={e => set('issueDate', e.target.value)} className="form-input" />
        </F>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Issue By">
          <input value={form.checkedBy} onChange={e => set('checkedBy', e.target.value)} className="form-input" placeholder="Inspector name" />
        </F>
        <F label="DISPATCH MODE:-">
          <input value={form.dispatchMode} onChange={e => set('dispatchMode', e.target.value)} className="form-input" placeholder="DISPATCH MODE:-" />
        </F>
      </div>
    </div>
  );
}
