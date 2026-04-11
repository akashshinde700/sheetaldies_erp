import React from 'react';
import SearchSelect from '../../../components/SearchSelect';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function InvoiceDetailsSection({ form, setForm, parties }) {
  return (
    <div className="card p-4 sm:p-5 3xl:p-6 space-y-4 min-w-0">
      <p className="section-title border-b border-slate-100 pb-2">Invoice Details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 3xl:gap-5">
        <F label="Invoice Date">
          <input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} className="form-input" />
        </F>
        <F label="Dispatch Date">
          <input type="date" value={form.dispatchDate} onChange={e => setForm(p => ({ ...p, dispatchDate: e.target.value }))} className="form-input" />
        </F>
        <F label="From Party *">
          <SearchSelect
            value={form.fromPartyId}
            onChange={v => setForm(p => ({ ...p, fromPartyId: v }))}
            options={parties.map(p => ({ value: p.id, label: p.name }))}
            placeholder="— Select —"
            required
          />
        </F>
        <F label="To Party *">
          <SearchSelect
            value={form.toPartyId}
            onChange={v => setForm(p => ({ ...p, toPartyId: v }))}
            options={parties.map(p => ({ value: p.id, label: p.name }))}
            placeholder="— Select —"
            required
          />
        </F>
        <F label="Challan Ref">
          <input value={form.challanRef} onChange={e => setForm(p => ({ ...p, challanRef: e.target.value }))} className="form-input" placeholder="Auto-filled from challan" />
        </F>
        <F label="PO Ref">
          <input value={form.poRef} onChange={e => setForm(p => ({ ...p, poRef: e.target.value }))} className="form-input" />
        </F>
        <F label="Job Card Ref">
          <input value={form.jobCardRef} onChange={e => setForm(p => ({ ...p, jobCardRef: e.target.value }))} className="form-input" />
        </F>
        <F label="Other References" className="col-span-1 sm:col-span-2">
          <input value={form.otherReferences} onChange={e => setForm(p => ({ ...p, otherReferences: e.target.value }))} className="form-input" placeholder="Any additional reference..." />
        </F>
        <F label="Dispatch Doc No">
          <input value={form.dispatchDocNo} onChange={e => setForm(p => ({ ...p, dispatchDocNo: e.target.value }))} className="form-input" placeholder="DD-001" />
        </F>
        <F label="E-Way Bill No">
          <input value={form.eWayBillNo} onChange={e => setForm(p => ({ ...p, eWayBillNo: e.target.value }))} className="form-input" placeholder="EWB-XXXXXXXXXXXX" />
        </F>
      </div>
    </div>
  );
}
