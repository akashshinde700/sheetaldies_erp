import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CustomerSection({ form, setForm, customers, applyCustomerFromParty, errors = {} }) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
      <FormField id="f-customerId" label="Party (bill-to / customer)" error={errors.customerId}
        className="w-full sm:w-[310px]">
        <SearchSelect
          value={form.customerId}
          onChange={applyCustomerFromParty}
          options={customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.partyType || 'PARTY'}` }))}
          placeholder="Search party — Customer, Vendor, or Both"
        />
      </FormField>

      {!form.customerId ? (
        <FormField label="Customer Name" htmlFor="customerNameSnapshot" className="w-full sm:flex-1 sm:basis-[200px]">
          <Input id="customerNameSnapshot" value={form.customerNameSnapshot}
            onChange={(e) => setForm(p => ({ ...p, customerNameSnapshot: e.target.value }))}
            placeholder="Customer / company name" />
        </FormField>
      ) : (
        <FormField label="Contact Email" htmlFor="contactEmail" className="w-full sm:w-[180px]">
          <Input id="contactEmail" type="email" value={form.contactEmail}
            onChange={(e) => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="Email address" />
        </FormField>
      )}

      <FormField label="Customer Address" htmlFor="customerAddressSnapshot" className="w-full sm:flex-1 sm:basis-[180px]">
        <Textarea id="customerAddressSnapshot" value={form.customerAddressSnapshot}
          onChange={e => setForm(p => ({ ...p, customerAddressSnapshot: e.target.value }))}
          rows={1} className="min-h-[38px] max-h-[56px]" placeholder="Billing / delivery address" />
      </FormField>

      {!form.customerId && (
        <FormField label="Contact Email" htmlFor="contactEmail" className="w-full sm:w-[180px]">
          <Input id="contactEmail" type="email" value={form.contactEmail}
            onChange={(e) => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="Email address" />
        </FormField>
      )}
    </div>
  );
}
