import React from 'react';
import SearchSelect from '../../../components/SearchSelect';

const F = ({ label, children, className }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function CertHeaderSection({ form, set, parties, jobCards }) {
  const customerOptions = (parties || [])
    .filter(p => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH')
    .map(p => ({ value: String(p.id), label: p.name }));

  const jobCardOptions = (jobCards || []).map(jc => ({
    value: jc.id,
    label: (() => {
      const partLabel = jc.part?.description ||
        (jc.part?.partNo && !jc.part.partNo.startsWith('JOBCARD-') ? jc.part.partNo : '');
      return partLabel ? `${jc.jobCardNo} — ${partLabel}` : jc.jobCardNo;
    })(),
  }));

  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Certificate Details</p>
      <div className="grid grid-cols-2 gap-4">
        <F label="Customer's">
          <SearchSelect
            value={String(form.customerId || '')}
            onChange={v => set('customerId', v)}
            options={customerOptions}
            placeholder="— Select Customer —"
            required
          />
        </F>
        <F label="Certificate No.">
          <div className="flex gap-1">
            <input value={form.issueNo} onChange={e => set('issueNo', e.target.value)} className="form-input flex-1 font-mono" placeholder="Auto-generated" />
            <button type="button" title="Regenerate"
              onClick={() => {
                const now = new Date();
                const yy  = String(now.getFullYear()).slice(-2);
                const mm  = String(now.getMonth() + 1).padStart(2, '0');
                const rand = String(Math.floor(100 + Math.random() * 900));
                set('issueNo', `${yy}${mm}${rand}`);
              }}
              className="px-2 border border-slate-300 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-300 text-xs">
              ↻
            </button>
          </div>
        </F>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Job Card No.">
          <SearchSelect
            value={String(form.jobCardId || '')}
            onChange={v => set('jobCardId', v)}
            options={jobCardOptions}
            placeholder="— Select Job Card —"
          />
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
