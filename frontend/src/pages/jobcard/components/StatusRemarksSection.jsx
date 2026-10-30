import React from 'react';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export default function StatusRemarksSection({ form, setForm }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <FormField label="Drawing No (DRG NO)" htmlFor="drawingNo" className="w-full sm:w-[160px]">
          <Input id="drawingNo" value={form.drawingNo}
            onChange={e => setForm(p => ({ ...p, drawingNo: e.target.value }))} placeholder="SDT-2309-V4" />
        </FormField>

        <FormField label="Drawing on print" className="w-full sm:w-[150px]">
          <div className="flex min-h-[38px] flex-wrap items-center gap-x-3 gap-y-1">
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-slate-700">
              <Checkbox checked={form.showDrawingNoInPrint !== false}
                onCheckedChange={checked => setForm(p => ({ ...p, showDrawingNoInPrint: checked === true }))} />
              Value
            </label>
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-slate-700">
              <Checkbox checked={form.showDrawingNoLabelInPrint !== false}
                onCheckedChange={checked => setForm(p => ({ ...p, showDrawingNoLabelInPrint: checked === true }))} />
              Label
            </label>
          </div>
        </FormField>

        <FormField label="Special Requirements" htmlFor="specialRequirements" className="w-full sm:flex-1 sm:basis-[220px]">
          <Textarea id="specialRequirements" value={form.specialRequirements}
            onChange={e => setForm(p => ({ ...p, specialRequirements: e.target.value }))}
            rows={1} style={{ minHeight: 32 }} placeholder="Process / handling requirements" />
        </FormField>
        <FormField label="Precautions (production & final inspection)" htmlFor="precautions" className="w-full sm:flex-1 sm:basis-[220px]">
          <Textarea id="precautions" value={form.precautions}
            onChange={e => setForm(p => ({ ...p, precautions: e.target.value }))}
            rows={1} style={{ minHeight: 32 }} placeholder="Safety or quality precautions" />
        </FormField>
      </div>
    </div>
  );
}
