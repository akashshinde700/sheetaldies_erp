import React from 'react';
import SearchSelect from '../../../components/SearchSelect';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

export default function InvoiceDetailsSection({ form, setForm, parties, invoiceSeries = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Invoice & parties ── */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
          <FormField label="Invoice Series" required className="w-full sm:flex-1 sm:basis-[170px]">
            <SearchSelect
              value={form.invoiceSeriesId}
              onChange={v => setForm(p => ({ ...p, invoiceSeriesId: v }))}
              options={invoiceSeries.map(s => ({ value: s.id, label: s.label || s.code }))}
              placeholder="— Select Series —"
              required
            />
          </FormField>
          <FormField label="Invoice Date" htmlFor="invoiceDate" className="w-full sm:w-[140px]">
            <Input
              id="invoiceDate"
              type="date"
              value={form.invoiceDate}
              onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))}
            />
          </FormField>
          <FormField label="Dispatch Date" htmlFor="invDispatchDate" className="w-full sm:w-[140px]">
            <Input
              id="invDispatchDate"
              type="date"
              value={form.dispatchDate}
              onChange={e => setForm(p => ({ ...p, dispatchDate: e.target.value }))}
            />
          </FormField>
          <FormField label="From Party (Biller)" required className="w-full sm:flex-1 sm:basis-[190px]">
            <SearchSelect
              value={form.fromPartyId}
              onChange={v => setForm(p => ({ ...p, fromPartyId: v }))}
              options={parties.map(p => ({ value: p.id, label: p.name }))}
              placeholder="— Select —"
              required
            />
          </FormField>
          <FormField label="To Party (Customer)" required className="w-full sm:flex-1 sm:basis-[190px]">
            <SearchSelect
              value={form.toPartyId}
              onChange={v => setForm(p => ({ ...p, toPartyId: v }))}
              options={parties.map(p => ({ value: p.id, label: p.name }))}
              placeholder="— Select —"
              required
            />
          </FormField>
        </div>

        {/* ── References ── */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-3 border-t border-slate-100 pt-4">
          <FormField label="Challan Ref" htmlFor="challanRef" className="w-full sm:w-[140px]">
            <Input
              id="challanRef"
              value={form.challanRef}
              onChange={e => setForm(p => ({ ...p, challanRef: e.target.value }))}
              placeholder="Auto-filled from challan"
            />
          </FormField>
          <FormField label="PO Ref" htmlFor="poRef" className="w-full sm:w-[130px]">
            <Input
              id="poRef"
              value={form.poRef}
              onChange={e => setForm(p => ({ ...p, poRef: e.target.value }))}
            />
          </FormField>
          <FormField label="Job Card Ref" htmlFor="jobCardRef" className="w-full sm:w-[130px]">
            <Input
              id="jobCardRef"
              value={form.jobCardRef}
              onChange={e => setForm(p => ({ ...p, jobCardRef: e.target.value }))}
            />
          </FormField>
          <FormField label="Other References" htmlFor="otherReferences" className="w-full sm:flex-1 sm:basis-[180px]">
            <Input
              id="otherReferences"
              value={form.otherReferences}
              onChange={e => setForm(p => ({ ...p, otherReferences: e.target.value }))}
              placeholder="Any additional reference..."
            />
          </FormField>
          <FormField label="Dispatch Doc No" htmlFor="dispatchDocNo" className="w-full sm:w-[140px]">
            <Input
              id="dispatchDocNo"
              value={form.dispatchDocNo}
              onChange={e => setForm(p => ({ ...p, dispatchDocNo: e.target.value }))}
              placeholder="DD-001"
            />
          </FormField>
          <FormField label="E-Way Bill No" htmlFor="eWayBillNo" className="w-full sm:w-[170px]">
            <Input
              id="eWayBillNo"
              value={form.eWayBillNo}
              onChange={e => setForm(p => ({ ...p, eWayBillNo: e.target.value }))}
              placeholder="EWB-XXXXXXXXXXXX"
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
