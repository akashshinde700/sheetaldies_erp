import React from 'react';
import { useHeatTreatSpecs } from '../../../hooks/useMasterData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const DISPATCH_MODES = [
  { field: 'dispatchByOurVehicle', label: 'By Our Vehicle' },
  { field: 'dispatchByCourier', label: 'By Courier' },
  { field: 'collectedByCustomer', label: 'Collected by Customer' },
];

export default function JobCardHeaderInfoSection({ form, setForm, cardData }) {
  const { data: htSpecs = [] } = useHeatTreatSpecs();

  return (
    <Card>
      <CardHeader><CardTitle>Job Card Info</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4">
          {!cardData && (
            <FormField label="Job Card No."><Input value="Auto-generated" disabled /></FormField>
          )}
          <FormField label="Certificate No." htmlFor="certificateNo">
            <Input id="certificateNo" value={form.certificateNo}
              onChange={e => setForm(p => ({ ...p, certificateNo: e.target.value }))} placeholder="Certificate No." />
          </FormField>
          <FormField label="Your PO No." htmlFor="yourNo">
            <Input id="yourNo" value={form.yourNo}
              onChange={e => setForm(p => ({ ...p, yourNo: e.target.value }))} placeholder="Your PO No." />
          </FormField>
          <FormField label="Your DC No.">
            <Input
              value={cardData?.challanItemLinks?.[0]?.challan?.challanNo || cardData?.challans?.[0]?.challanNo || ''}
              disabled placeholder="Your DC No." />
          </FormField>
          <FormField label="Control Plan No." htmlFor="controlPlanNo">
            <Input id="controlPlanNo" value={form.controlPlanNo}
              onChange={e => setForm(p => ({ ...p, controlPlanNo: e.target.value }))} placeholder="Control Plan No." />
          </FormField>
          <FormField label="Heat Treatment Spec" htmlFor="operationMode">
            <select id="operationMode" value={form.operationMode}
              onChange={e => setForm(p => ({ ...p, operationMode: e.target.value }))} className="form-input">
              {htSpecs.length > 0
                ? htSpecs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                : <>
                    <option value="NORMAL">NORMAL</option>
                    <option value="REWORK">REWORK</option>
                    <option value="HARDEN AND TEMPER">HARDEN AND TEMPER</option>
                    <option value="STRESS RELIEVING">STRESS RELIEVING</option>
                    <option value="ANNEALING">ANNEALING</option>
                  </>}
            </select>
          </FormField>
          <FormField label="Specification" htmlFor="specification" className="col-span-2 lg:col-span-3">
            <Input id="specification" value={form.specification}
              onChange={e => setForm(p => ({ ...p, specification: e.target.value }))} placeholder="Specification details…" />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dispatch</span>
          {DISPATCH_MODES.map(({ field, label }) => (
            <label key={field} className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
              <Checkbox checked={!!form[field]}
                onCheckedChange={checked => setForm(p => ({ ...p, [field]: checked === true }))} />
              {label}
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
