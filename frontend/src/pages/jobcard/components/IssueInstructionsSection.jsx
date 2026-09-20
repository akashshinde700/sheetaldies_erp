import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../../../utils/api';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const SPECIAL_INSTRUCTIONS = [
  { field: 'specInstrCert', label: 'Certificate' },
  { field: 'specInstrMPIRep', label: 'MPI Report' },
  { field: 'specInstrGraph', label: 'Process Graph' },
];

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

export default function IssueInstructionsSection({ form, setForm, errors = {}, cardData }) {
  const [issueBySuggestions, setIssueBySuggestions] = useState([]);
  const [showUnit, setShowUnit] = useState(() => hasUnitSuffix(form.hrcRange));

  useEffect(() => {
    api.get('/jobcards/issue-by-suggestions').then(r => setIssueBySuggestions(r.data.data || [])).catch(() => {});
  }, []);

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
    <div className="border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <FormField label="Your DC No." className="w-full sm:w-[110px]">
          <Input
            value={cardData?.challanItemLinks?.[0]?.challan?.challanNo || cardData?.challans?.[0]?.challanNo || ''}
            disabled placeholder="Your DC No." />
        </FormField>
        <FormField label="Issue Date" htmlFor="issueDate" className="w-full sm:w-[110px]">
          <Input id="issueDate" type="date" value={form.issueDate}
            onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} />
        </FormField>
        <FormField label="Issued By" htmlFor="issueBy" className="w-full sm:w-[130px]">
          <Input id="issueBy" list="issue-by-suggestions-list" value={form.issueBy}
            onChange={e => setForm(p => ({ ...p, issueBy: e.target.value }))} placeholder="Issued By" autoComplete="off" />
          <datalist id="issue-by-suggestions-list">
            {issueBySuggestions.map(name => <option key={name} value={name} />)}
          </datalist>
        </FormField>
        <FormField label="Docs needed on job card" className="w-full sm:w-[340px]">
          <div className="flex min-h-[38px] flex-nowrap items-center gap-x-3 whitespace-nowrap">
            {SPECIAL_INSTRUCTIONS.map(({ field, label }) => (
              <label key={field} className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-slate-700">
                <Checkbox checked={!!form[field]}
                  onCheckedChange={checked => setForm(p => ({ ...p, [field]: checked === true }))} />
                {label}
              </label>
            ))}
          </div>
        </FormField>
        <FormField label="Quantity" htmlFor="quantity" required error={errors.quantity} className="w-full sm:w-[70px]">
          <Input id="quantity" type="number" min="1" inputMode="numeric" value={form.quantity}
            onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
            required invalid={Boolean(errors.quantity)} placeholder="1" className="text-right tabular-nums" />
        </FormField>
        <FormField label="Total Weight (kg)" htmlFor="totalWeight" className="w-full sm:w-[150px] sm:shrink-0">
          <Input id="totalWeight" type="number" step="0.001" inputMode="decimal" value={form.totalWeight}
            onChange={e => setForm(p => ({ ...p, totalWeight: e.target.value }))}
            placeholder="0.000" className="text-right tabular-nums" />
        </FormField>
        <FormField label="Hardness Range" htmlFor="hrcRange" className="w-full sm:w-[150px]">
          <div className="flex items-center gap-1.5">
            <Input id="hrcRange" value={parsed.range} onChange={onRangeChange} placeholder="e.g. 54-56" className="flex-1" />
            {showUnit ? (
              <>
                <select value={parsed.unit} onChange={onUnitChange} className="form-input shrink-0" style={{ width: 74 }} aria-label="Hardness unit">
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
      </div>
    </div>
  );
}
