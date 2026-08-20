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
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <F label="Party (bill-to / customer)" className="xl:col-span-2">
          <SearchSelect
            value={form.customerId}
            onChange={applyCustomerFromParty}
            options={customers.map((c) => ({
              value: c.id,
              label: `${c.name} · ${c.partyType || 'PARTY'}`,
            }))}
            placeholder="Search party — Customer, Vendor, or Both"
          />
        </F>

        <F label="Customer Name">
          <input
            value={form.customerNameSnapshot}
            onChange={(e) => setForm(p => ({ ...p, customerNameSnapshot: e.target.value }))}
            className="form-input"
            placeholder="Customer / company name"
          />
        </F>

        <F label="Contact Email">
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm(p => ({ ...p, contactEmail: e.target.value }))}
            className="form-input"
            placeholder="Email address"
          />
        </F>

        <F label="Customer Address" className="xl:col-span-2">
          <textarea
            value={form.customerAddressSnapshot}
            onChange={e => setForm(p => ({ ...p, customerAddressSnapshot: e.target.value }))}
            rows={3}
            className="form-input resize-none"
            placeholder="Billing / delivery address"
          />
        </F>
      </div>
    </div>
  );
}
