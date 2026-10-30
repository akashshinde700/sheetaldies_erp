import React from 'react';
import { toNum } from '../../../utils/normalize';
import { formatCurrency } from '../../../utils/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const TotalRow = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(value)}</span>
  </div>
);

export default function InvoiceTaxTotalsSection({
  form, setForm, subtotal, cgst, sgst, igst, tcsAmt, grandTotal
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax &amp; Totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
          <FormField label="CGST %" htmlFor="invCgstRate">
            <Input
              id="invCgstRate"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.cgstRate}
              onChange={e => setForm(p => ({ ...p, cgstRate: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="SGST %" htmlFor="invSgstRate">
            <Input
              id="invSgstRate"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.sgstRate}
              onChange={e => setForm(p => ({ ...p, sgstRate: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="IGST %" htmlFor="invIgstRate">
            <Input
              id="invIgstRate"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.igstRate}
              onChange={e => setForm(p => ({ ...p, igstRate: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="TCS %" htmlFor="invTcsRate">
            <Input
              id="invTcsRate"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.tcsRate}
              onChange={e => setForm(p => ({ ...p, tcsRate: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="Transport / Freight" htmlFor="invTransportFreight">
            <Input
              id="invTransportFreight"
              type="number"
              min="0"
              inputMode="decimal"
              value={form.transportFreight}
              onChange={e => setForm(p => ({ ...p, transportFreight: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="Extra Amt" htmlFor="invExtraAmt">
            <Input
              id="invExtraAmt"
              type="number"
              min="0"
              inputMode="decimal"
              value={form.extraAmt}
              onChange={e => setForm(p => ({ ...p, extraAmt: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 space-y-2 sm:max-w-sm sm:ml-auto">
          <TotalRow label="Subtotal" value={subtotal} />
          <TotalRow label={`CGST (${form.cgstRate}%)`} value={cgst} />
          <TotalRow label={`SGST (${form.sgstRate}%)`} value={sgst} />
          {toNum(form.igstRate, 0) > 0 && (
            <TotalRow label={`IGST (${form.igstRate}%)`} value={igst} />
          )}
          {toNum(form.tcsRate, 0) > 0 && (
            <TotalRow label={`TCS (${form.tcsRate}%)`} value={tcsAmt} />
          )}
          {toNum(form.transportFreight, 0) > 0 && (
            <TotalRow label="Transport / Freight" value={toNum(form.transportFreight, 0)} />
          )}
          {toNum(form.extraAmt, 0) > 0 && (
            <TotalRow label="Extra Amt" value={toNum(form.extraAmt, 0)} />
          )}
          <Separator className="bg-slate-200" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Grand Total</span>
            <span className="text-base font-extrabold tabular-nums text-indigo-700">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
