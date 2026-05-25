import React, { useState, useEffect } from 'react';
import SearchSelect from '../../../components/SearchSelect';

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

export default function ProductionSection({ form, setForm, machines }) {
  const [showUnit, setShowUnit] = useState(() => hasUnitSuffix(form.hrcRange));

  // When form loads from API (edit mode), show unit dropdown if unit already stored
  useEffect(() => {
    if (hasUnitSuffix(form.hrcRange)) setShowUnit(true);
  }, [form.hrcRange]);

  const parsed = parseHrc(form.hrcRange);

  const onRangeChange = (e) => {
    const range = e.target.value;
    if (showUnit) {
      setForm(p => ({ ...p, hrcRange: range ? `${range} ${parsed.unit}` : '' }));
    } else {
      setForm(p => ({ ...p, hrcRange: range }));
    }
  };

  const onUnitChange = (e) => {
    const unit = e.target.value;
    setForm(p => ({ ...p, hrcRange: parsed.range ? `${parsed.range} ${unit}` : '' }));
  };

  const onAddUnit = () => {
    setShowUnit(true);
    // Append default HRC to whatever is in the range
    if (parsed.range) {
      setForm(p => ({ ...p, hrcRange: `${parsed.range} HRC` }));
    }
  };

  const onRemoveUnit = () => {
    setShowUnit(false);
    // Strip unit from stored value
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
          <input type="number" step="0.001" value={form.totalWeight} onChange={e => setForm(p => ({...p, totalWeight: e.target.value}))} className="form-input" placeholder="0.000" />
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
                <select
                  value={parsed.unit}
                  onChange={onUnitChange}
                  className="form-input"
                  style={{ width: 72 }}
                >
                  {HARDNESS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button
                  type="button"
                  onClick={onRemoveUnit}
                  title="Remove unit"
                  className="text-slate-400 hover:text-red-500 text-lg leading-none px-1"
                >×</button>
              </>
            ) : (
              <button
                type="button"
                onClick={onAddUnit}
                className="text-xs text-indigo-500 hover:text-indigo-700 whitespace-nowrap px-1 border border-indigo-200 rounded hover:bg-indigo-50"
              >+ unit</button>
            )}
          </div>
        </F>
        <F label="Operation No">
          <input value={form.operationNo} onChange={e => setForm(p => ({...p, operationNo: e.target.value}))} className="form-input" placeholder="OP-01" />
        </F>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <F label="Drawing No (DRG NO)">
          <input value={form.drawingNo} onChange={e => setForm(p => ({...p, drawingNo: e.target.value}))} className="form-input" placeholder="SDT-2309-V4" />
        </F>
        <F label="WM No">
          <input value={form.woNo || ''} onChange={e => setForm(p => ({...p, woNo: e.target.value}))} className="form-input" placeholder="WM-28389" />
        </F>
        <F label="Machine">
          <SearchSelect
            value={form.machineId}
            onChange={v => setForm(p => ({...p, machineId: v}))}
            options={machines.map(m => ({ value: m.id, label: `${m.code} – ${m.name}` }))}
            placeholder="— Select Machine —"
          />
        </F>
      </div>
      <F label="Operator Name">
        <input value={form.operatorName} onChange={e => setForm(p => ({...p, operatorName: e.target.value}))} className="form-input" placeholder="Operator Name" />
      </F>
    </div>
  );
}
