import React from 'react';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

export default function CertHardnessSection({ form, set }) {
  return (
    <div className="border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
          <FormField label={<span className="whitespace-nowrap">Min (Required)</span>} className="w-full sm:w-[110px]">
            <Input type="number" inputMode="decimal" value={form.hardnessMin} onChange={e => set('hardnessMin', e.target.value)}
              className="text-right tabular-nums" placeholder="48" />
          </FormField>
          <FormField label={<span className="whitespace-nowrap">Max (Required)</span>} className="w-full sm:w-[110px]">
            <Input type="number" inputMode="decimal" value={form.hardnessMax} onChange={e => set('hardnessMax', e.target.value)}
              className="text-right tabular-nums" placeholder="52" />
          </FormField>
          <FormField label="Unit" className="w-full sm:w-[90px]">
            <Input
              list="hardness-unit-list"
              value={form.hardnessUnit}
              onChange={e => set('hardnessUnit', e.target.value)}
              maxLength={8}
              placeholder="HRC"
            />
            <datalist id="hardness-unit-list">
              {['HRC','HRB','HV','HB','BHN'].map(u => <option key={u} value={u} />)}
            </datalist>
          </FormField>
          <FormField label="Achieved Hardness" className="w-full sm:w-[130px] sm:ml-3">
            <Input value={form.achievedHardness} onChange={e => set('achievedHardness', e.target.value)}
              placeholder="e.g. 48-50" />
          </FormField>
          {[1,2,3,4].map(n => (
            <FormField key={n} label={<span className="whitespace-nowrap">Hardness After {n}</span>} className="w-full sm:w-[135px] sm:ml-1.5">
              <Input value={form[`hardnessAfter${n}`]} onChange={e => set(`hardnessAfter${n}`, e.target.value)}
                placeholder="e.g. 49" />
            </FormField>
          ))}
        </div>
    </div>
  );
}
