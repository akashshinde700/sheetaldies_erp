import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const HARDNESS_UNITS = ['HRC', 'HRB', 'HRA', 'HV', 'HVN', 'HS'];

const parseHrc = (val = '') => {
  const t = val.trim();
  for (const u of HARDNESS_UNITS) {
    if (t.toUpperCase().endsWith(u.toUpperCase())) {
      return { range: t.slice(0, -u.length).trim(), unit: u };
    }
  }
  return { range: t, unit: 'HRC' };
};

const hasUnitSuffix = (val = '') =>
  HARDNESS_UNITS.some(u => val.trim().toUpperCase().endsWith(u.toUpperCase()));

export default function ProductionSection({ form, setForm, weightSummary, errors = {} }) {
  const [showUnit, setShowUnit] = useState(() => hasUnitSuffix(form.hrcRange));

  useEffect(() => {
    if (hasUnitSuffix(form.hrcRange)) setShowUnit(true);
  }, [form.hrcRange]);

  const parsed = parseHrc(form.hrcRange);

  const onRangeChange = (e) => {
    const range = e.target.value;
    setForm(p => ({ ...p, hrcRange: showUnit && parsed.unit ? (range ? `${range} ${parsed.unit}` : '') : range }));
  };

  const onUnitChange = (e) => {
    const unit = e.target.value;
    setForm(p => ({ ...p, hrcRange: parsed.range ? `${parsed.range} ${unit}` : '' }));
  };

  const onAddUnit = () => {
    setShowUnit(true);
    if (parsed.range) setForm(p => ({ ...p, hrcRange: `${parsed.range} HRC` }));
  };

  const onRemoveUnit = () => {
    setShowUnit(false);
    setForm(p => ({ ...p, hrcRange: parsed.range }));
  };

  const weightOverLimit = Boolean(
    weightSummary && weightSummary.inwardTotalWeight > 0 &&
    parseFloat(form.totalWeight) > (weightSummary.inwardTotalWeight - (weightSummary.consumedWeight - (weightSummary.thisJobCardWeight || 0)))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-12">
          <FormField label="Quantity" htmlFor="quantity" required error={errors.quantity} className="lg:col-span-2">
            <Input id="quantity" type="number" min="1" inputMode="numeric" value={form.quantity}
              onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
              required invalid={Boolean(errors.quantity)} placeholder="1" className="text-right tabular-nums" />
          </FormField>

          <FormField label="Total Weight (kg)" htmlFor="totalWeight" className="lg:col-span-2">
            <Input id="totalWeight" type="number" step="0.001" inputMode="decimal" value={form.totalWeight}
              onChange={e => setForm(p => ({ ...p, totalWeight: e.target.value }))}
              invalid={weightOverLimit} placeholder="0.000" className="text-right tabular-nums" />
          </FormField>

          <FormField label="Hardness Range" htmlFor="hrcRange" className="lg:col-span-4">
            <div className="flex items-center gap-1.5">
              <Input id="hrcRange" value={parsed.range} onChange={onRangeChange} placeholder="e.g. 54-56" className="flex-1" />
              {showUnit ? (
                <>
                  <select value={parsed.unit} onChange={onUnitChange} className="form-input shrink-0" style={{ width: 84 }} aria-label="Hardness unit">
                    {HARDNESS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={onRemoveUnit} title="Remove unit"
                    className="shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X /></Button>
                </>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={onAddUnit} className="shrink-0 whitespace-nowrap">+ unit</Button>
              )}
            </div>
          </FormField>

          <FormField label="Drawing No (DRG NO)" htmlFor="drawingNo" className="lg:col-span-2">
            <Input id="drawingNo" value={form.drawingNo}
              onChange={e => setForm(p => ({ ...p, drawingNo: e.target.value }))} placeholder="SDT-2309-V4" />
          </FormField>

          <FormField label="Drawing on print" className="col-span-2 lg:col-span-2">
            <div className="flex min-h-[34px] flex-wrap items-center gap-x-3 gap-y-1">
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
        </div>

        {weightSummary && weightSummary.inwardTotalWeight > 0 && (() => {
          const inward    = Number(weightSummary.inwardTotalWeight);
          const otherUsed = Math.max(0, Number(weightSummary.consumedWeight || 0) - Number(weightSummary.thisJobCardWeight || 0));
          const entered   = parseFloat(form.totalWeight) || 0;
          const remaining = inward - otherUsed - entered;
          const overLimit = entered > 0 && remaining < -0.0001;
          return (
            <p className={`flex flex-wrap gap-x-3 text-[11px] ${overLimit ? 'text-rose-600' : 'text-slate-500'}`}>
              <span>Inward total <b className="tabular-nums text-slate-700">{inward.toFixed(3)} kg</b></span>
              {otherUsed > 0 && <span>· used by other JCs <b className="tabular-nums text-amber-700">{otherUsed.toFixed(3)} kg</b></span>}
              <span>· {overLimit ? '⚠ exceeds limit' : 'remaining after save'} <b className={`tabular-nums ${overLimit ? 'text-rose-600' : 'text-emerald-700'}`}>{remaining.toFixed(3)} kg</b></span>
            </p>
          );
        })()}
      </CardContent>
    </Card>
  );
}
