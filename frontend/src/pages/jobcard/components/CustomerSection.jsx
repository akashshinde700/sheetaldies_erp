import React from 'react';
import SearchSelect from '../../../components/SearchSelect';

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function CustomerSection({ form, setForm, customers, applyCustomerFromParty }) {
  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Company & Customer Details</p>
      <div className="grid grid-cols-2 gap-4">
        <F label="Party (bill-to / customer)" className="col-span-2">
          <SearchSelect
            value={form.customerId}
            onChange={applyCustomerFromParty}
            options={customers.map((c) => ({
              value: c.id,
              label: `${c.name} · ${c.partyType || 'PARTY'}`,
            }))}
            placeholder="Search party — Customer, Vendor, or Both"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Lists every party from <strong>Party Management</strong>. Choosing one fills name, address, and email below. You can also type name + address only; save will add/link in Parties.
          </p>
        </F>
        <F label="Customer Name">
          <input value={form.customerNameSnapshot} onChange={e => setForm(p => ({ ...p, customerNameSnapshot: e.target.value }))} className="form-input" />
        </F>
        <F label="Contact Email">
          <input value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} className="form-input" />
        </F>
        <F label="Customer Address" className="col-span-2">
          <textarea value={form.customerAddressSnapshot} onChange={e => setForm(p => ({ ...p, customerAddressSnapshot: e.target.value }))} rows={2} className="form-input resize-none" />
        </F>
        <F label="Factory Name">
          <input value={form.factoryName} onChange={e => setForm(p => ({ ...p, factoryName: e.target.value }))} className="form-input" />
        </F>
        <F label="Factory Address">
          <input value={form.factoryAddress} onChange={e => setForm(p => ({ ...p, factoryAddress: e.target.value }))} className="form-input" />
        </F>
      </div>
    </div>
  );
}
