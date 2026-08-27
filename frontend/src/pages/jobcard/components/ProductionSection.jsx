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

const GroupTitle = ({ children }) => (
  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{children}</p>
);

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
      <CardContent className="space-y-3">
        {/* ── Quantity, weight & hardness ── */}
        <div className="space-y-3">
          <GroupTitle>Quantity &amp; Hardness</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            <FormField label="Quantity" htmlFor="quantity" required error={errors.quantity}>
              <Input
                id="quantity"
                type="number"
                min="1"
                inputMode="numeric"
                value={form.quantity}
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                required
                invalid={Boolean(errors.quantity)}
                placeholder="1"
                className="text-right tabular-nums"
              />
            </FormField>

            <FormField label="Total Weight (kg)" htmlFor="totalWeight">
              <Input
                id="totalWeight"
                type="number"
                step="0.001"
                inputMode="decimal"
                value={form.totalWeight}
                onChange={e => setForm(p => ({ ...p, totalWeight: e.target.value }))}
                invalid={weightOverLimit}
                placeholder="0.000"
                className="text-right tabular-nums"
              />
              {weightSummary && weightSummary.inwardTotalWeight > 0 && (() => {
                const inward    = Number(weightSummary.inwardTotalWeight);
                const otherUsed = Math.max(0, Number(weightSummary.consumedWeight || 0) - Number(weightSummary.thisJobCardWeight || 0));
                const entered   = parseFloat(form.totalWeight) || 0;
                const remaining = inward - otherUsed - entered;
                const overLimit = entered > 0 && remaining < -0.0001;
                return (
                  <div className={`mt-1.5 rounded-lg px-3 py-2 text-[11px] space-y-1 border ${overLimit ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between text-slate-500">
                      <span>Inward Total</span>
                      <span className="font-semibold text-slate-700 tabular-nums">{inward.toFixed(3)} kg</span>
                    </div>
                    {otherUsed > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Used by other JCs</span>
                        <span className="font-semibold text-amber-700 tabular-nums">− {otherUsed.toFixed(3)} kg</span>
                      </div>
                    )}
                    <div className={`flex justify-between font-bold border-t pt-1 ${overLimit ? 'text-rose-600 border-rose-200' : remaining < 0.001 && inward > 0 ? 'text-amber-600 border-slate-200' : 'text-emerald-700 border-slate-200'}`}>
                      <span>{overLimit ? '⚠ Exceeds limit' : 'Remaining after save'}</span>
                      <span className="tabular-nums">{remaining.toFixed(3)} kg</span>
                    </div>
                  </div>
                );
              })()}
            </FormField>

            <FormField label="Hardness Range" htmlFor="hrcRange">
              <div className="flex items-center gap-1.5">
                <Input
                  id="hrcRange"
                  value={parsed.range}
                  onChange={onRangeChange}
                  placeholder="e.g. 54-56"
                  className="flex-1"
                />
                {showUnit ? (
                  <>
                    {/* Native select kept intentionally: compact fixed-width
                        inline unit picker beside the range input. */}
                    <select
                      value={parsed.unit}
                      onChange={onUnitChange}
                      className="form-input"
                      style={{ width: 72 }}
                      aria-label="Hardness unit"
                    >
                      {HARDNESS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={onRemoveUnit}
                      title="Remove unit"
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                    >
                      <X />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddUnit}
                    className="whitespace-nowrap shrink-0"
                  >
                    + unit
                  </Button>
                )}
              </div>
            </FormField>
          </div>
        </div>

        {/* ── Drawing reference ── */}
        <div className="space-y-3">
          <GroupTitle>Drawing</GroupTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            <FormField label="Drawing No (DRG NO)" htmlFor="drawingNo">
              <Input
                id="drawingNo"
                value={form.drawingNo}
                onChange={e => setForm(p => ({ ...p, drawingNo: e.target.value }))}
                placeholder="SDT-2309-V4"
              />
            </FormField>

            <FormField label="Show Value in Print">
              <label className="flex items-center gap-2.5 h-9 cursor-pointer select-none">
                <Checkbox
                  checked={form.showDrawingNoInPrint !== false}
                  onCheckedChange={checked => setForm(p => ({ ...p, showDrawingNoInPrint: checked === true }))}
                />
                <span className="text-xs text-slate-500">{form.showDrawingNoInPrint !== false ? 'Visible on print' : 'Hidden on print'}</span>
              </label>
            </FormField>

            <FormField label="Show Label in Print">
              <label className="flex items-center gap-2.5 h-9 cursor-pointer select-none">
                <Checkbox
                  checked={form.showDrawingNoLabelInPrint !== false}
                  onCheckedChange={checked => setForm(p => ({ ...p, showDrawingNoLabelInPrint: checked === true }))}
                />
                <span className="text-xs text-slate-500">{form.showDrawingNoLabelInPrint !== false ? 'Visible on print' : 'Hidden on print'}</span>
              </label>
            </FormField>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
