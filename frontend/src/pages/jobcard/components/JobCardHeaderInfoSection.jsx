import React from 'react';
import { useHeatTreatSpecs } from '../../../hooks/useMasterData';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const DISPATCH_MODES = [
  { field: 'dispatchByOurVehicle', label: 'Our vehicle' },
  { field: 'dispatchByCourier', label: 'Courier' },
  { field: 'collectedByCustomer', label: 'Collected by customer' },
];

export default function JobCardHeaderInfoSection({ form, setForm, cardData }) {
  const { data: htSpecs = [] } = useHeatTreatSpecs();

  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          {!cardData && (
            <FormField label="Job Card No." className="w-full sm:w-[150px]"><Input value="Auto-generated" disabled /></FormField>
          )}
          <FormField label="Certificate No." htmlFor="certificateNo" className="w-full sm:w-[120px]">
            <Input id="certificateNo" value={form.certificateNo}
              onChange={e => setForm(p => ({ ...p, certificateNo: e.target.value }))} placeholder="Certificate No." />
          </FormField>
          <FormField label="Your PO No." htmlFor="yourNo" className="w-full sm:w-[110px]">
            <Input id="yourNo" value={form.yourNo}
              onChange={e => setForm(p => ({ ...p, yourNo: e.target.value }))} placeholder="Your PO No." />
          </FormField>
          <FormField label="Control Plan No." htmlFor="controlPlanNo" className="w-full sm:w-[120px]">
            <Input id="controlPlanNo" value={form.controlPlanNo}
              onChange={e => setForm(p => ({ ...p, controlPlanNo: e.target.value }))} placeholder="Control Plan No." />
          </FormField>
          <FormField label="Heat Treatment Spec" htmlFor="operationMode" className="w-full sm:w-[170px]">
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
          <FormField label="Specification" htmlFor="specification" className="w-full sm:flex-1 sm:basis-[110px]">
            <Input id="specification" value={form.specification}
              onChange={e => setForm(p => ({ ...p, specification: e.target.value }))} placeholder="Specification details…" />
          </FormField>
          <FormField label="Dispatch" className="w-full sm:w-[340px]">
            <div className="flex min-h-[38px] flex-nowrap items-center gap-x-3 whitespace-nowrap">
              {DISPATCH_MODES.map(({ field, label }) => (
                <label key={field} className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-slate-700">
                  <Checkbox checked={!!form[field]}
                    onCheckedChange={checked => setForm(p => ({ ...p, [field]: checked === true }))} />
                  {label}
                </label>
              ))}
            </div>
          </FormField>
        </div>
    </div>
  );
}
