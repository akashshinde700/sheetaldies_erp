import React from 'react';
import { useHeatTreatSpecs } from '../../../hooks/useMasterData';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

const DISPATCH_MODES = [
  { field: 'dispatchByOurVehicle', label: 'By Our Vehicle' },
  { field: 'dispatchByCourier', label: 'By Courier' },
  { field: 'collectedByCustomer', label: 'Collected by Customer' },
];

export default function JobCardHeaderInfoSection({ form, setForm, cardData }) {
  const { data: htSpecs = [] } = useHeatTreatSpecs();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Card Info</CardTitle>
        <CardDescription>Document numbers, heat treatment specification and dispatch mode.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── References ── */}
        <div className="space-y-3">
          <GroupTitle>References</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
            {/* Edit mode me job card no. page header par dikhta hai — yahan sirf create ka hint */}
            {!cardData && (
              <FormField label="Job Card No.">
                <Input value="Auto-generated" disabled />
              </FormField>
            )}

            <FormField label="Certificate No." htmlFor="certificateNo">
              <Input
                id="certificateNo"
                value={form.certificateNo}
                onChange={e => setForm(p => ({ ...p, certificateNo: e.target.value }))}
                placeholder="Certificate No."
              />
            </FormField>

            <FormField label="Your PO No." htmlFor="yourNo">
              <Input
                id="yourNo"
                value={form.yourNo}
                onChange={e => setForm(p => ({ ...p, yourNo: e.target.value }))}
                placeholder="Your PO No."
              />
            </FormField>

            <FormField label="Your DC No.">
              <Input
                value={
                  cardData?.challanItemLinks?.[0]?.challan?.challanNo
                  || cardData?.challans?.[0]?.challanNo
                  || ''
                }
                disabled
                placeholder="Your DC No."
              />
            </FormField>

            <FormField label="Control Plan No." htmlFor="controlPlanNo">
              <Input
                id="controlPlanNo"
                value={form.controlPlanNo}
                onChange={e => setForm(p => ({ ...p, controlPlanNo: e.target.value }))}
                placeholder="Control Plan No."
              />
            </FormField>
          </div>
        </div>

        {/* ── Treatment & specification ── */}
        <div className="space-y-3">
          <GroupTitle>Treatment &amp; Specification</GroupTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 gap-y-3">
            <FormField
              label="Heat Treatment Specification"
              htmlFor="operationMode"
            >
              {/* Native select kept intentionally: options come from a dynamic
                  master list and the saved value may not always be present in it. */}
              <select
                id="operationMode"
                value={form.operationMode}
                onChange={e => setForm(p => ({ ...p, operationMode: e.target.value }))}
                className="form-input"
              >
                {htSpecs.length > 0
                  ? htSpecs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                  : <>
                      <option value="NORMAL">NORMAL</option>
                      <option value="REWORK">REWORK</option>
                      <option value="HARDEN AND TEMPER">HARDEN AND TEMPER</option>
                      <option value="STRESS RELIEVING">STRESS RELIEVING</option>
                      <option value="ANNEALING">ANNEALING</option>
                    </>
                }
              </select>
            </FormField>

            <FormField label="Specification" htmlFor="specification" className="lg:col-span-2">
              {/* Height select jitni — Textarea ka andar ka minHeight:80px yahan override hota hai */}
              <Textarea
                id="specification"
                value={form.specification}
                onChange={e => setForm(p => ({ ...p, specification: e.target.value }))}
                placeholder="Specification details..."
                rows="1"
                className="min-h-[44px] sm:min-h-0"
                style={{ minHeight: undefined }}
              />
            </FormField>
          </div>
        </div>

        {/* ── Dispatch mode ── */}
        {/* Three modes, matching the printed job card. Courier used to double as
            customer pickup, so the print's "COLLECTED BY CUSTOMER" box could
            never be ticked. */}
        <div className="space-y-3">
          <GroupTitle>Dispatch</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-3">
            {DISPATCH_MODES.map(({ field, label }) => (
              <label
                key={field}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 cursor-pointer select-none transition-colors hover:border-sky-300 hover:bg-sky-50/40"
              >
                <Checkbox
                  checked={!!form[field]}
                  onCheckedChange={checked => setForm(p => ({ ...p, [field]: checked === true }))}
                />
                <span className="text-sm text-slate-700 font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
