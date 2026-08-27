import React from 'react';
import { toNum } from '../../../utils/normalize';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const TotalRow = ({ label, value, muted = false }) => (
  <div className="flex items-center justify-between text-sm">
    <span className={muted ? 'text-slate-500' : 'text-slate-600'}>{label}</span>
    <span className="font-semibold tabular-nums text-slate-800">₹{value}</span>
  </div>
);

export default function TaxTotalsSection({
  form, setForm, subtotal, cgstAmt, sgstAmt, igstAmt, grandTotal
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax &amp; Totals</CardTitle>
        <CardDescription>Handling charges and GST rates applied on this challan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
          <FormField label="Handling Charges" htmlFor="handlingCharges">
            <Input
              id="handlingCharges"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.handlingCharges}
              onChange={e => setForm(p => ({ ...p, handlingCharges: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="CGST %" htmlFor="cgstRate">
            <Input
              id="cgstRate"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.cgstRate}
              onChange={e => setForm(p => ({ ...p, cgstRate: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="SGST %" htmlFor="sgstRate">
            <Input
              id="sgstRate"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.sgstRate}
              onChange={e => setForm(p => ({ ...p, sgstRate: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
          <FormField label="IGST %" htmlFor="igstRate">
            <Input
              id="igstRate"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.igstRate}
              onChange={e => setForm(p => ({ ...p, igstRate: e.target.value }))}
              className="text-right tabular-nums"
            />
          </FormField>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 space-y-2 sm:max-w-sm sm:ml-auto">
          <TotalRow label="Subtotal" value={subtotal.toFixed(2)} muted />
          <TotalRow label="Handling" value={toNum(form.handlingCharges, 0).toFixed(2)} muted />
          <TotalRow label={`CGST (${form.cgstRate}%)`} value={cgstAmt.toFixed(2)} muted />
          <TotalRow label={`SGST (${form.sgstRate}%)`} value={sgstAmt.toFixed(2)} muted />
          {toNum(form.igstRate, 0) > 0 && (
            <TotalRow label={`IGST (${form.igstRate}%)`} value={igstAmt.toFixed(2)} muted />
          )}
          <Separator className="bg-slate-200" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Grand Total</span>
            <span className="text-base font-extrabold tabular-nums text-slate-900">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
