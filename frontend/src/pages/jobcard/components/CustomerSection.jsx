import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CustomerSection({ form, setForm, customers, applyCustomerFromParty, errors = {} }) {
  return (
    <Card>
      <CardHeader><CardTitle>Company &amp; Customer Details</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 lg:grid-cols-12">
          <FormField id="f-customerId" label="Party (bill-to / customer)" error={errors.customerId}
            className="lg:col-span-5">
            <SearchSelect
              value={form.customerId}
              onChange={applyCustomerFromParty}
              options={customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.partyType || 'PARTY'}` }))}
              placeholder="Search party — Customer, Vendor, or Both"
            />
          </FormField>

          {!form.customerId ? (
            <FormField label="Customer Name" htmlFor="customerNameSnapshot" className="lg:col-span-3">
              <Input id="customerNameSnapshot" value={form.customerNameSnapshot}
                onChange={(e) => setForm(p => ({ ...p, customerNameSnapshot: e.target.value }))}
                placeholder="Customer / company name" />
            </FormField>
          ) : (
            <FormField label="Contact Email" htmlFor="contactEmail" className="lg:col-span-3">
              <Input id="contactEmail" type="email" value={form.contactEmail}
                onChange={(e) => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="Email address" />
            </FormField>
          )}

          <FormField label="Customer Address" htmlFor="customerAddressSnapshot" className="lg:col-span-4">
            <Textarea id="customerAddressSnapshot" value={form.customerAddressSnapshot}
              onChange={e => setForm(p => ({ ...p, customerAddressSnapshot: e.target.value }))}
              rows={2} placeholder="Billing / delivery address" />
          </FormField>

          {!form.customerId && (
            <FormField label="Contact Email" htmlFor="contactEmail" className="lg:col-span-12">
              <Input id="contactEmail" type="email" value={form.contactEmail}
                onChange={(e) => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="Email address" />
            </FormField>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
