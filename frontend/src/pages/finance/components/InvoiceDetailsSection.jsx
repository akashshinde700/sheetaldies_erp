import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

export default function InvoiceDetailsSection({ form, setForm, parties, invoiceSeries = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ── Invoice basics ── */}
        <div className="space-y-3">
          <GroupTitle>Invoice</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            <FormField label="Invoice Series" required>
              <SearchSelect
                value={form.invoiceSeriesId}
                onChange={v => setForm(p => ({ ...p, invoiceSeriesId: v }))}
                options={invoiceSeries.map(s => ({ value: s.id, label: s.label || s.code }))}
                placeholder="— Select Series —"
                required
              />
            </FormField>
            <FormField label="Invoice Date" htmlFor="invoiceDate">
              <Input
                id="invoiceDate"
                type="date"
                value={form.invoiceDate}
                onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))}
              />
            </FormField>
            <FormField label="Dispatch Date" htmlFor="invDispatchDate">
              <Input
                id="invDispatchDate"
                type="date"
                value={form.dispatchDate}
                onChange={e => setForm(p => ({ ...p, dispatchDate: e.target.value }))}
              />
            </FormField>
          </div>
        </div>

        {/* ── Parties ── */}
        <div className="space-y-3">
          <GroupTitle>Parties</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <FormField label="From Party (Biller)" required>
              <SearchSelect
                value={form.fromPartyId}
                onChange={v => setForm(p => ({ ...p, fromPartyId: v }))}
                options={parties.map(p => ({ value: p.id, label: p.name }))}
                placeholder="— Select —"
                required
              />
            </FormField>
            <FormField label="To Party (Customer)" required>
              <SearchSelect
                value={form.toPartyId}
                onChange={v => setForm(p => ({ ...p, toPartyId: v }))}
                options={parties.map(p => ({ value: p.id, label: p.name }))}
                placeholder="— Select —"
                required
              />
            </FormField>
          </div>
        </div>

        {/* ── References ── */}
        <div className="space-y-3">
          <GroupTitle>References</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            <FormField label="Challan Ref" htmlFor="challanRef">
              <Input
                id="challanRef"
                value={form.challanRef}
                onChange={e => setForm(p => ({ ...p, challanRef: e.target.value }))}
                placeholder="Auto-filled from challan"
              />
            </FormField>
            <FormField label="PO Ref" htmlFor="poRef">
              <Input
                id="poRef"
                value={form.poRef}
                onChange={e => setForm(p => ({ ...p, poRef: e.target.value }))}
              />
            </FormField>
            <FormField label="Job Card Ref" htmlFor="jobCardRef">
              <Input
                id="jobCardRef"
                value={form.jobCardRef}
                onChange={e => setForm(p => ({ ...p, jobCardRef: e.target.value }))}
              />
            </FormField>
            <FormField label="Other References" htmlFor="otherReferences" className="sm:col-span-2">
              <Input
                id="otherReferences"
                value={form.otherReferences}
                onChange={e => setForm(p => ({ ...p, otherReferences: e.target.value }))}
                placeholder="Any additional reference..."
              />
            </FormField>
            <FormField label="Dispatch Doc No" htmlFor="dispatchDocNo">
              <Input
                id="dispatchDocNo"
                value={form.dispatchDocNo}
                onChange={e => setForm(p => ({ ...p, dispatchDocNo: e.target.value }))}
                placeholder="DD-001"
              />
            </FormField>
            <FormField label="E-Way Bill No" htmlFor="eWayBillNo">
              <Input
                id="eWayBillNo"
                value={form.eWayBillNo}
                onChange={e => setForm(p => ({ ...p, eWayBillNo: e.target.value }))}
                placeholder="EWB-XXXXXXXXXXXX"
              />
            </FormField>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
