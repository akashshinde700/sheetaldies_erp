import React, { useEffect, useState } from 'react';
import api from '../../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const SPECIAL_INSTRUCTIONS = [
  { field: 'specInstrCert', label: 'Certificate' },
  { field: 'specInstrMPIRep', label: 'MPI Report' },
  { field: 'specInstrGraph', label: 'Process Graph' },
];

export default function IssueInstructionsSection({ form, setForm }) {
  const [issueBySuggestions, setIssueBySuggestions] = useState([]);

  useEffect(() => {
    api.get('/jobcards/issue-by-suggestions').then(r => setIssueBySuggestions(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Issue Details &amp; Special Instructions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4">
          <FormField label="Issue Date" htmlFor="issueDate">
            <Input id="issueDate" type="date" value={form.issueDate}
              onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} />
          </FormField>
          <FormField label="Issued By" htmlFor="issueBy" className="lg:col-span-3">
            <Input id="issueBy" list="issue-by-suggestions-list" value={form.issueBy}
              onChange={e => setForm(p => ({ ...p, issueBy: e.target.value }))} placeholder="Issued By" autoComplete="off" />
            <datalist id="issue-by-suggestions-list">
              {issueBySuggestions.map(name => <option key={name} value={name} />)}
            </datalist>
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Docs needed</span>
          {SPECIAL_INSTRUCTIONS.map(({ field, label }) => (
            <label key={field} className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
              <Checkbox checked={!!form[field]}
                onCheckedChange={checked => setForm(p => ({ ...p, [field]: checked === true }))} />
              {label}
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
