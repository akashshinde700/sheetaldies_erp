import React, { useState, useEffect } from 'react';

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

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function ProductionSection({ form, setForm, weightSummary }) {
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

  return (
    <div className="card p-5 space-y-4">
      <p className="section-title border-b border-slate-100 pb-2">Production Details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Quantity *">
          <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({...p, quantity: e.target.value}))} required className="form-input" placeholder="1" />
        </F>
        <F label="Total Weight (kg)">
          <input
            type="number" step="0.001"
            value={form.totalWeight}
            onChange={e => setForm(p => ({...p, totalWeight: e.target.value}))}
            className={`form-input ${weightSummary && weightSummary.inwardTotalWeight > 0 && parseFloat(form.totalWeight) > (weightSummary.inwardTotalWeight - (weightSummary.consumedWeight - (weightSummary.thisJobCardWeight || 0))) ? 'border-rose-400 focus:ring-rose-400/30' : ''}`}
            placeholder="0.000"
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
        </F>
        <F label="Hardness Range">
          <div className="flex gap-1 items-center">
            <input
              value={parsed.range}
              onChange={onRangeChange}
              className="form-input"
              placeholder="e.g. 54-56"
              style={{ flex: 1 }}
            />
            {showUnit ? (
              <>
                <select value={parsed.unit} onChange={onUnitChange} className="form-input" style={{ width: 72 }}>
                  {HARDNESS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button type="button" onClick={onRemoveUnit} title="Remove unit"
                  className="text-slate-400 hover:text-red-500 text-lg leading-none px-1">×</button>
              </>
            ) : (
              <button type="button" onClick={onAddUnit}
                className="text-xs text-indigo-500 hover:text-indigo-700 whitespace-nowrap px-1 border border-indigo-200 rounded hover:bg-indigo-50">
                + unit
              </button>
            )}
          </div>
        </F>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <F label="Drawing No (DRG NO)">
          <input value={form.drawingNo} onChange={e => setForm(p => ({...p, drawingNo: e.target.value}))} className="form-input" placeholder="SDT-2309-V4" />
        </F>
        <F label="Show Value in Print">
          <label className="flex items-center gap-2 h-[38px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.showDrawingNoInPrint !== false}
              onChange={e => setForm(p => ({ ...p, showDrawingNoInPrint: e.target.checked }))}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-slate-500">{form.showDrawingNoInPrint !== false ? 'Visible on print' : 'Hidden on print'}</span>
          </label>
        </F>
        <F label="Show Label in Print">
          <label className="flex items-center gap-2 h-[38px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.showDrawingNoLabelInPrint !== false}
              onChange={e => setForm(p => ({ ...p, showDrawingNoLabelInPrint: e.target.checked }))}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-slate-500">{form.showDrawingNoLabelInPrint !== false ? 'Visible on print' : 'Hidden on print'}</span>
          </label>
        </F>
      </div>
    </div>
  );
}
