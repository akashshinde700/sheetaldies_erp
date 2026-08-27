import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

export default function CertHardnessSection({ form, set, jcData }) {
  const locked = !!jcData;
  return (
    <Card className={locked ? 'bg-indigo-50/30' : undefined}>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
        <div className="space-y-1 min-w-0">
          <CardTitle>Hardness Specification</CardTitle>
          <CardDescription>Required range and achieved readings.</CardDescription>
        </div>
        {locked && (
          <Badge className="bg-indigo-100 text-indigo-700 text-[10px] shrink-0">from Job Card (editable)</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Required range ── */}
        <div className="space-y-3">
          <GroupTitle>Required</GroupTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-3">
            <FormField label="Min (Required)">
              <Input type="number" inputMode="decimal" value={form.hardnessMin} onChange={e => set('hardnessMin', e.target.value)}
                className="text-right tabular-nums" placeholder="48" />
            </FormField>
            <FormField label="Max (Required)">
              <Input type="number" inputMode="decimal" value={form.hardnessMax} onChange={e => set('hardnessMax', e.target.value)}
                className="text-right tabular-nums" placeholder="52" />
            </FormField>
            <FormField label="Unit">
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
          </div>
        </div>

        {/* ── Achieved readings ── */}
        <div className="space-y-3">
          <GroupTitle>Achieved</GroupTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-3">
            <FormField label="Achieved Hardness" className="col-span-2">
              <Input value={form.achievedHardness} onChange={e => set('achievedHardness', e.target.value)}
                placeholder="e.g. 48-50" />
            </FormField>
            {[1,2,3,4].map(n => (
              <FormField key={n} label={`Hardness After ${n}`}>
                <Input value={form[`hardnessAfter${n}`]} onChange={e => set(`hardnessAfter${n}`, e.target.value)}
                  placeholder="e.g. 49" />
              </FormField>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
