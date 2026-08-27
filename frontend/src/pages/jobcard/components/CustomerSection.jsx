import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CustomerSection({ form, setForm, customers, applyCustomerFromParty, errors = {} }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company &amp; Customer Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <FormField
            id="f-customerId"
            label="Party (bill-to / customer)"
            hint="Selecting a party fills the customer details below"
            error={errors.customerId}
          >
            <SearchSelect
              value={form.customerId}
              onChange={applyCustomerFromParty}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.name} · ${c.partyType || 'PARTY'}`,
              }))}
              placeholder="Search party — Customer, Vendor, or Both"
            />
          </FormField>

          <FormField label="Contact Email" htmlFor="contactEmail">
            <Input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm(p => ({ ...p, contactEmail: e.target.value }))}
              placeholder="Email address"
            />
          </FormField>

          {/* Party chuni ho to naam upar dropdown me hi dikh jaata hai — yahan dohrana nahi */}
          {!form.customerId && (
            <FormField label="Customer Name" htmlFor="customerNameSnapshot" className="sm:col-span-2">
              <Input
                id="customerNameSnapshot"
                value={form.customerNameSnapshot}
                onChange={(e) => setForm(p => ({ ...p, customerNameSnapshot: e.target.value }))}
                placeholder="Customer / company name"
              />
            </FormField>
          )}

          <FormField label="Customer Address" htmlFor="customerAddressSnapshot" className="sm:col-span-2">
            <Textarea
              id="customerAddressSnapshot"
              value={form.customerAddressSnapshot}
              onChange={e => setForm(p => ({ ...p, customerAddressSnapshot: e.target.value }))}
              rows={2}
              placeholder="Billing / delivery address"
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
