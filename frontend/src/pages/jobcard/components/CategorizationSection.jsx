import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const CB = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
    <Checkbox checked={checked} onCheckedChange={c => onChange(c === true)} />
    <span className="text-xs text-slate-700 font-medium">{label}</span>
  </label>
);

export default function CategorizationSection({ form, set }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <CB label="Normal"              checked={form.catNormal}            onChange={v => set('catNormal', v)} />
          <CB label="Welded"              checked={form.catWelded}            onChange={v => set('catWelded', v)} />
          <CB label="Crack or Crack Risk" checked={form.catCrackRisk}         onChange={v => set('catCrackRisk', v)} />
          <CB label="Distortion Risk"     checked={form.catDistortionRisk}    onChange={v => set('catDistortionRisk', v)} />
          <CB label="Initial Finishing"   checked={form.catCriticalFinishing} onChange={v => set('catCriticalFinishing', v)} />
          <CB label="Dent / Damage"       checked={form.catDentDamage}        onChange={v => set('catDentDamage', v)} />
          <CB label="Rusty"               checked={form.catRusty}             onChange={v => set('catRusty', v)} />
          <CB label="Cavity"              checked={form.catCavity}            onChange={v => set('catCavity', v)} />
          <CB label="Others"              checked={form.catOthers}            onChange={v => set('catOthers', v)} />
        </div>
        {form.catOthers && (
          <Input
            value={form.otherDefects}
            onChange={e => set('otherDefects', e.target.value)}
            className="text-xs"
            placeholder="Describe other defects..."
            aria-label="Other defects"
          />
        )}
      </CardContent>
    </Card>
  );
}
