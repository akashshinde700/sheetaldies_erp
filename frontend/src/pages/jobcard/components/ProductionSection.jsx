import React from 'react';
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

const F = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function ProductionSection({ form, setForm, machines }) {
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
          <div className="flex gap-1">
            <input
              value={parseHrc(form.hrcRange).range}
              onChange={e => {
                const unit = parseHrc(form.hrcRange).unit;
                const range = e.target.value;
                setForm(p => ({ ...p, hrcRange: range ? `${range} ${unit}` : '' }));
              }}
              className="form-input"
              placeholder="54-56"
              style={{ flex: 1 }}
            />
            <select
              value={parseHrc(form.hrcRange).unit}
              onChange={e => {
                const range = parseHrc(form.hrcRange).range;
                setForm(p => ({ ...p, hrcRange: range ? `${range} ${e.target.value}` : '' }));
              }}
              className="form-input"
              style={{ width: 72 }}
            >
              {HARDNESS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
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
